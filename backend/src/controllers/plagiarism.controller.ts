import { Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import PlagiarismReport from '../models/PlagiarismReport';
import User from '../models/User';
import { extractText, cleanText } from '../utils/document-processor';
import { generateWithoutContext } from '../services/ai/groq.service';
import { AuthRequest } from '../middleware/auth';

/* ─────────────────────────────────────────────────────────────────────────────
   Helper: compute risk level from similarity score
───────────────────────────────────────────────────────────────────────────── */
function computeRiskLevel(score: number): 'low' | 'moderate' | 'high' {
  if (score < 30) return 'low';
  if (score < 70) return 'moderate';
  return 'high';
}

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/plagiarism/analyze
   Accepts: multipart/form-data with field "file" (PDF | DOCX | TXT)
   Access: All authenticated roles
───────────────────────────────────────────────────────────────────────────── */
export const analyzeDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const file = req.file;

  try {
    if (!file) {
      res.status(400).json({ message: 'No file uploaded. Please attach a PDF, DOCX, or TXT file.' });
      return;
    }

    const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(400).json({ message: `Unsupported file type: ${ext}. Allowed: PDF, DOCX, TXT.` });
      return;
    }

    // 1. Extract text from document
    const fileExtension = ext.substring(1); // strip dot
    let documentText = '';
    let pageCount: number | undefined;

    try {
      const extracted = await extractText(file.path, fileExtension);
      documentText = cleanText(extracted.text);
      pageCount = extracted.pages;
    } catch (err: any) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(400).json({ message: `Failed to extract text: ${err.message}` });
      return;
    }

    if (!documentText || documentText.trim().length < 50) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(400).json({ message: 'Document appears to be empty or contains too little text for analysis.' });
      return;
    }

    const wordCount = documentText.split(/\s+/).filter(w => w.length > 0).length;
    // Truncate for LLM analysis (use first 6000 words to fit context window)
    const analysisText = documentText.length > 30000
      ? documentText.substring(0, 30000) + '\n...[truncated for analysis]'
      : documentText;

    // 2. AI Plagiarism Analysis via Llama 3 (JSON mode)
    const systemPrompt = `You are an expert academic plagiarism detection and citation analysis system. 
Analyze the provided academic document text for plagiarism indicators, originality issues, and citation problems.
You must return ONLY a valid JSON object with no markdown, no code fences, no preamble.

Your analysis should evaluate:
- Internal repetition of ideas, sentences, and paragraphs (self-plagiarism risk)
- Unattributed claims or statistics that likely need citations
- Paraphrased content that appears to be derived from common sources without credit
- Citation format consistency and completeness
- Overall originality based on content structure and language patterns

Respond with ONLY this JSON structure:
{
  "similarityScore": <number 0-100, represents estimated non-original content percentage>,
  "originalityScore": <number 0-100, must be 100 - similarityScore>,
  "highlightedSections": [
    {
      "text": "<exact sentence or short paragraph from document that is problematic>",
      "similarityPercent": <number 0-100>,
      "reason": "<why this section is flagged: e.g. 'Generic unattributed claim', 'Repeated idea', 'Missing citation for statistic'>"
    }
  ],
  "aiSuggestions": [
    "<actionable suggestion string>",
    "<actionable suggestion string>"
  ],
  "citationAnalysis": {
    "missingCitations": ["<description of missing citation>"],
    "incorrectReferences": ["<description of incorrect reference>"],
    "duplicateReferences": ["<description of duplicate reference>"],
    "formattingIssues": ["<description of formatting issue>"]
  }
}

Rules:
- highlightedSections: identify 3–8 specific problematic text excerpts (keep each under 200 chars)
- aiSuggestions: provide 4–7 concrete, actionable improvement suggestions
- Be accurate and fair — not all documents are plagiarized; reflect actual quality
- similarityScore should reflect genuine originality concerns, not penalize specialized terminology`;

    const userPrompt = `Please analyze this academic document for plagiarism and citation issues:\n\n${analysisText}`;

    let analysisResult: any;
    try {
      const llmResponse = await generateWithoutContext(
        [{ role: 'user', content: userPrompt }],
        systemPrompt,
        0.2,
        true // JSON mode
      );

      try {
        analysisResult = JSON.parse(llmResponse.content.trim());
      } catch {
        const jsonMatch = llmResponse.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('AI returned invalid JSON.');
        }
      }
    } catch (aiErr: any) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(500).json({ message: `AI analysis failed: ${aiErr.message}` });
      return;
    }

    // 3. Sanitize / normalize AI output
    const similarityScore = Math.min(100, Math.max(0, Math.round(analysisResult.similarityScore || 0)));
    const originalityScore = 100 - similarityScore;
    const riskLevel = computeRiskLevel(similarityScore);

    const highlightedSections = (analysisResult.highlightedSections || [])
      .slice(0, 10)
      .map((s: any, i: number) => ({
        text: String(s.text || '').substring(0, 300),
        startIndex: i * 100,
        endIndex: i * 100 + 100,
        similarityPercent: Math.min(100, Math.max(0, Math.round(s.similarityPercent || 50))),
        reason: String(s.reason || ''),
      }));

    const aiSuggestions = (analysisResult.aiSuggestions || [])
      .slice(0, 8)
      .map((s: any) => String(s));

    const citationAnalysis = {
      missingCitations: (analysisResult.citationAnalysis?.missingCitations || []).map((c: any) => String(c)),
      incorrectReferences: (analysisResult.citationAnalysis?.incorrectReferences || []).map((c: any) => String(c)),
      duplicateReferences: (analysisResult.citationAnalysis?.duplicateReferences || []).map((c: any) => String(c)),
      formattingIssues: (analysisResult.citationAnalysis?.formattingIssues || []).map((c: any) => String(c)),
    };

    // 4. Save report
    const report = new PlagiarismReport({
      userId: req.user!._id,
      fileName: file.originalname,
      fileType: ext.substring(1),
      fileSize: file.size,
      documentText: documentText.substring(0, 50000), // cap stored text
      similarityScore,
      originalityScore,
      riskLevel,
      highlightedSections,
      aiSuggestions,
      citationAnalysis,
      wordCount,
      pageCount,
    });

    await report.save();

    // 5. Cleanup temp file
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    res.status(201).json({
      message: 'Document analyzed successfully.',
      report,
    });
  } catch (err: any) {
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/plagiarism
   Returns paginated reports — students see their own, faculty/admin see all
───────────────────────────────────────────────────────────────────────────── */
export const getReports = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const query: any = {};
    if (req.user!.role === 'student') {
      query.userId = req.user!._id;
    }

    const [reports, total] = await Promise.all([
      PlagiarismReport.find(query)
        .populate('userId', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-documentText'), // exclude large text field from list
      PlagiarismReport.countDocuments(query),
    ]);

    res.json({
      reports,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/plagiarism/analytics
   Admin only — aggregate statistics
───────────────────────────────────────────────────────────────────────────── */
export const getAnalytics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [totalDocs, riskCounts, avgSimilarity, monthlyData] = await Promise.all([
      PlagiarismReport.countDocuments(),
      PlagiarismReport.aggregate([
        { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
      ]),
      PlagiarismReport.aggregate([
        { $group: { _id: null, avg: { $avg: '$similarityScore' } } },
      ]),
      PlagiarismReport.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
            avgSimilarity: { $avg: '$similarityScore' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 },
      ]),
    ]);

    // Faculty vs Student usage
    const usageByRole = await PlagiarismReport.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      { $group: { _id: '$user.role', count: { $sum: 1 } } },
    ]);

    const riskMap: Record<string, number> = {};
    riskCounts.forEach((r: any) => { riskMap[r._id] = r.count; });

    const roleMap: Record<string, number> = {};
    usageByRole.forEach((r: any) => { roleMap[r._id] = r.count; });

    res.json({
      totalDocuments: totalDocs,
      averageSimilarity: Math.round((avgSimilarity[0]?.avg || 0) * 10) / 10,
      highRiskDocuments: riskMap['high'] || 0,
      moderateRiskDocuments: riskMap['moderate'] || 0,
      lowRiskDocuments: riskMap['low'] || 0,
      facultyUsage: roleMap['faculty'] || 0,
      studentUsage: roleMap['student'] || 0,
      adminUsage: roleMap['admin'] || 0,
      monthlyStats: monthlyData.map((m: any) => ({
        year: m._id.year,
        month: m._id.month,
        count: m.count,
        avgSimilarity: Math.round(m.avgSimilarity * 10) / 10,
      })),
    });
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/plagiarism/:id
   Get specific report by ID (with full document text for highlights)
───────────────────────────────────────────────────────────────────────────── */
export const getReportById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const report = await PlagiarismReport.findById(req.params.id)
      .populate('userId', 'name email role');

    if (!report) {
      res.status(404).json({ message: 'Report not found.' });
      return;
    }

    // Students can only view their own reports
    if (
      req.user!.role === 'student' &&
      report.userId._id.toString() !== req.user!._id.toString()
    ) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    res.json({ report });
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE /api/plagiarism/:id
   Admin only — delete a report
───────────────────────────────────────────────────────────────────────────── */
export const deleteReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const report = await PlagiarismReport.findByIdAndDelete(req.params.id);
    if (!report) {
      res.status(404).json({ message: 'Report not found.' });
      return;
    }
    res.json({ message: 'Report deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
