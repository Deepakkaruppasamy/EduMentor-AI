import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import Course from '../models/Course';
import AssignmentEvaluation from '../models/AssignmentEvaluation';
import { extractText, cleanText } from '../utils/document-processor';
import { hybridRetrieve } from '../services/rag/hybrid-rag.service';
import { generateWithoutContext } from '../services/ai/groq.service';

export const evaluateAssignment = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file;
    const { courseId } = req.body;

    if (!file) {
      res.status(400).json({ message: 'No assignment file uploaded.' });
      return;
    }

    if (!courseId) {
      // Clean up uploaded file if validation fails
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(400).json({ message: 'Course ID is required.' });
      return;
    }

    // 1. Fetch Course details to verify it exists and get its chroma collection
    const course = await Course.findById(courseId);
    if (!course) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(404).json({ message: 'Course not found.' });
      return;
    }

    // 2. Extract text from the uploaded document
    const fileExtension = path.extname(file.originalname).substring(1);
    let contentText = '';
    try {
      const parsed = await extractText(file.path, fileExtension);
      contentText = cleanText(parsed.text);
    } catch (err: any) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(400).json({ message: `Failed to extract text from document: ${err.message}` });
      return;
    }

    if (!contentText || contentText.trim().length === 0) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(400).json({ message: 'No text content could be extracted from this document.' });
      return;
    }

    // 3. Query Hybrid RAG to gather course knowledge context
    // We run a small LLM keyword extraction pass on the assignment text to query the RAG precisely.
    let combinedContext = '';
    try {
      const keywordPrompt = `Identify the 3-5 core academic concepts, questions, or topics in the student's assignment text below. Return only a comma-separated list of these concepts. Do not include any explanations, markdown, or extra text.
      
      Assignment Content:
      ${contentText.substring(0, 3000)}`;

      const keywordRes = await generateWithoutContext(
        [{ role: 'user', content: keywordPrompt }],
        'You are an assistant that extracts keyword topics.'
      );
      
      const keywords = keywordRes.content
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      if (keywords.length > 0) {
        const ragPromises = keywords.map(keyword =>
          hybridRetrieve(keyword, course.chromaCollection, 3)
            .then(res => res.context)
            .catch(() => '')
        );
        const contexts = await Promise.all(ragPromises);
        combinedContext = contexts.filter(c => c.length > 0).join('\n\n---\n\n');
      } else {
        const rag = await hybridRetrieve(contentText.substring(0, 1500), course.chromaCollection, 8);
        combinedContext = rag.context;
      }
    } catch (err) {
      console.warn('Keyword-based RAG retrieval failed, falling back to text chunk retrieval:', err);
      try {
        const rag = await hybridRetrieve(contentText.substring(0, 1500), course.chromaCollection, 8);
        combinedContext = rag.context;
      } catch (ragErr) {
        console.error('Fallback RAG retrieval failed:', ragErr);
      }
    }

    // 4. Perform the evaluation via Llama 3 (Groq JSON Mode)
    const systemPrompt = `You are an expert academic evaluator. Your task is to evaluate the student's assignment answers against the provided course reference materials.
    
    Evaluate the assignment based on:
    1. Accuracy of information relative to the reference course materials.
    2. Proper reference/utilization of concepts.
    3. Clarity and structure of explanations.
    
    Return a JSON object matching this schema exactly:
    {
      "score": number (0 to 100 representing the overall grade),
      "feedback": "constructive general feedback summarizing strengths and areas to work on",
      "strengths": ["list strength 1", "list strength 2"],
      "improvements": ["list improvement 1", "list improvement 2"],
      "missingConcepts": ["list concept 1", "list concept 2"],
      "suggestedCorrections": [
        {
          "question": "summary of the question/topic assessed",
          "currentAnswer": "student's response or summary of their response for this topic",
          "suggestion": "constructive explanation of how to correct/improve this answer based on the reference materials",
          "conceptMissing": "specific course concept that was missing or explained incorrectly"
        }
      ],
      "predefinedCriteria": [
        {
          "criterion": "Accuracy of Information",
          "maxScore": 40,
          "score": number (0 to 40),
          "comments": "specific feedback on correctness"
        },
        {
          "criterion": "Reference to Course Materials",
          "maxScore": 30,
          "score": number (0 to 30),
          "comments": "feedback on how well course concepts were integrated"
        },
        {
          "criterion": "Clarity & Structure",
          "maxScore": 30,
          "score": number (0 to 30),
          "comments": "feedback on overall readability, formatting, and structural quality"
        }
      ]
    }
    
    The sum of the criteria scores must equal the overall score.
    Ensure your response is valid JSON and contains only the JSON object. Do not include markdown code block syntax (like \`\`\`json).`;

    const prompt = `--- REFERENCE COURSE MATERIALS ---
    ${combinedContext || 'No matching course materials found.'}
    --- END REFERENCE MATERIALS ---
    
    --- STUDENT ASSIGNMENT CONTENT ---
    ${contentText}
    --- END STUDENT ASSIGNMENT CONTENT ---
    
    Please evaluate the student's assignment and output the JSON evaluation report.`;

    const llmResponse = await generateWithoutContext(
      [{ role: 'user', content: prompt }],
      systemPrompt,
      0.2, // Low temperature for higher grading fidelity
      true // JSON Mode
    );

    let evaluationData: any;
    try {
      evaluationData = JSON.parse(llmResponse.content.trim());
    } catch (e) {
      const jsonMatch = llmResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluationData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('LLM failed to generate a valid JSON assignment evaluation.');
      }
    }

    // 5. Store evaluation results in database
    const evaluation = new AssignmentEvaluation({
      studentId: req.user._id,
      courseId: course._id,
      fileName: file.originalname,
      extractedText: contentText,
      evaluation: evaluationData,
    });

    await evaluation.save();

    // 6. Cleanup uploaded temp file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    res.status(201).json({
      message: 'Assignment evaluated successfully.',
      evaluation,
    });
  } catch (err: any) {
    // Attempt cleanup
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
};

export const getHistory = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId } = req.query;
    const query: any = {};

    // Filter by student if requesting user is a student
    if (req.user.role === 'student') {
      query.studentId = req.user._id;
    }

    if (courseId) {
      query.courseId = courseId;
    }

    const evaluations = await AssignmentEvaluation.find(query)
      .populate('courseId', 'title code')
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ evaluations });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const evaluation = await AssignmentEvaluation.findById(id)
      .populate('courseId', 'title code')
      .populate('studentId', 'name email');

    if (!evaluation) {
      res.status(404).json({ message: 'Assignment evaluation not found.' });
      return;
    }

    // Authorization check
    if (req.user.role === 'student' && evaluation.studentId._id.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    res.json({ evaluation });
  } catch (err) {
    next(err);
  }
};
