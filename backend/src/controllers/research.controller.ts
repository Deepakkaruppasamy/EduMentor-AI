import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import ResearchHistory from '../models/ResearchHistory';
import { generateWithoutContext } from '../services/ai/groq.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Multer config for research paper uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = 'uploads/research';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `research-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const researchUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.txt'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and TXT files are supported.'));
    }
  },
});

const FEATURE_PROMPTS: Record<string, string> = {
  Summarize: 'Provide a comprehensive summary of this research paper. Include: research objective, methodology, key findings, conclusions, and limitations in clear sections.',
  Explain: 'Explain this research paper in simple terms that an undergraduate student can understand. Break down complex concepts.',
  Compare: 'Compare and contrast the methodologies, findings, and conclusions of the provided research papers. Create a structured comparison table if comparing multiple papers.',
  LiteratureReview: 'Generate a literature review section based on the provided research paper(s). Follow academic writing standards with proper thematic organization.',
  IEEECitation: 'Generate proper IEEE citation(s) for the provided paper(s). Use IEEE citation format exactly.',
  APACitation: 'Generate proper APA 7th edition citation(s) for the provided paper(s).',
  MLACitation: 'Generate proper MLA 9th edition citation(s) for the provided paper(s).',
  ExplainFigures: 'Identify and explain all figures, charts, and graphs mentioned or described in this paper.',
  ExplainTables: 'Identify and explain all tables, datasets, and tabular data presented in this paper.',
  Contributions: 'Clearly identify and elaborate on the key contributions and novelty of this research paper.',
  FutureScope: 'Extract and expand on the future research directions and scope mentioned in this paper.',
  PresentationPoints: 'Generate a structured list of presentation points (15-20 slides worth) for presenting this research paper.',
};

const RESEARCH_SYSTEM_PROMPT = `You are an expert academic research assistant helping university students analyze research papers.
Provide thorough, accurate, and well-structured responses in Markdown format.`;

export const analyzeResearch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { feature, paperTexts, paperMeta } = req.body;

    if (!feature || !paperTexts?.length) {
      res.status(400).json({ success: false, message: 'feature and paperTexts are required.' });
      return;
    }

    const featurePrompt = FEATURE_PROMPTS[feature] || FEATURE_PROMPTS['Summarize'];
    const combinedText = paperTexts.join('\n\n--- NEXT PAPER ---\n\n');

    const truncated = combinedText.substring(0, 8000); // Keep within token limits

    const userPrompt = `${featurePrompt}

Research Paper Content:
${truncated}`;

    const response = await generateWithoutContext(
      [{ role: 'user', content: userPrompt }],
      RESEARCH_SYSTEM_PROMPT,
      0.3
    );

    // Save history
    const history = await ResearchHistory.create({
      user: userId,
      papers: paperMeta || [],
      feature,
      result: response.content,
    });

    res.status(201).json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getResearchHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const history = await ResearchHistory.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteResearchHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    const item = await ResearchHistory.findById(id);
    if (!item || item.user.toString() !== userId.toString()) {
      res.status(404).json({ success: false, message: 'Not found or access denied.' });
      return;
    }

    await item.deleteOne();
    res.json({ success: true, message: 'History deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
