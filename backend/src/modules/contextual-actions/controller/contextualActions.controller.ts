import { Request, Response } from 'express';
import { generateWithoutContext } from '../../../services/ai/groq.service';
import { generateQuizQuestions } from '../../../services/quiz/quiz.service';
import { generateFlashcards } from '../../../services/flashcard/flashcard.service';
import { translateText } from '../../../services/ai/translation.service';
import ContextualActionEvent from '../models/ContextualActionEvent';

// Helper to determine device category from user agent
function getDeviceCategory(ua: string): 'mobile' | 'tablet' | 'desktop' {
  const agent = (ua || '').toLowerCase();
  if (agent.includes('ipad') || (agent.includes('android') && !agent.includes('mobile'))) {
    return 'tablet';
  }
  if (agent.includes('mobi') || agent.includes('iphone') || agent.includes('android')) {
    return 'mobile';
  }
  return 'desktop';
}

// Helper to log event execution latency
async function logActionTelemetry(
  userId: string,
  actionId: string,
  module: string,
  textLength: number,
  status: 'success' | 'failed',
  startTime: number,
  ua: string,
  courseId?: string
) {
  try {
    const latency = Date.now() - startTime;
    await ContextualActionEvent.create({
      userId,
      actionId,
      module,
      status,
      latency,
      selectedTextLength: textLength,
      deviceCategory: getDeviceCategory(ua),
      courseId: courseId || undefined,
    });
  } catch (err) {
    console.error('[Telemetry Log Error]', err);
  }
}

// ── 1. Explain with AI ───────────────────────────────────────────────────────
export async function explainText(req: Request, res: Response) {
  const { selectedText, metadata, options } = req.body;
  const startTime = Date.now();
  const userId = (req as any).user?.id ?? 'anon';
  const mode = options?.mode || 'simple';

  try {
    if (!selectedText || selectedText.length > 5000) {
      return res.status(400).json({ message: 'Invalid text length. Max 5000 chars.' });
    }

    const systemPrompt = `You are an expert tutor. Explain the following educational concept in a clear, academically sound manner.
Explanation mode: "${mode}"
- Simple: Explain using simple terms for beginners.
- Detailed: Explain comprehensively with depth and definitions.
- Step-by-Step: Provide a numbered list breaking down the concept.
- Example-Based: Explain primarily using concrete, relevant examples.
Do not add conversational fluff. Output clean formatting.`;

    const response = await generateWithoutContext(
      [{ role: 'user', content: `Explain this text:\n\n${selectedText}` }],
      systemPrompt,
      0.3
    );

    await logActionTelemetry(
      userId,
      'explain',
      metadata?.module || 'general',
      selectedText.length,
      'success',
      startTime,
      req.headers['user-agent'] || '',
      metadata?.courseId
    );

    res.json({ success: true, explanation: response.content.trim() });
  } catch (err: any) {
    await logActionTelemetry(
      userId,
      'explain',
      metadata?.module || 'general',
      selectedText?.length || 0,
      'failed',
      startTime,
      req.headers['user-agent'] || ''
    );
    res.status(500).json({ message: err.message || 'AI explanation failed.' });
  }
}

// ── 2. Translate Text ────────────────────────────────────────────────────────
export async function translateSelectedText(req: Request, res: Response) {
  const { selectedText, metadata, options } = req.body;
  const startTime = Date.now();
  const userId = (req as any).user?.id ?? 'anon';
  const targetLanguage = options?.targetLanguage || 'Spanish';

  try {
    if (!selectedText) {
      return res.status(400).json({ message: 'No text selected.' });
    }

    const translated = await translateText(selectedText, 'English', targetLanguage);

    await logActionTelemetry(
      userId,
      'translate',
      metadata?.module || 'general',
      selectedText.length,
      'success',
      startTime,
      req.headers['user-agent'] || '',
      metadata?.courseId
    );

    res.json({ success: true, translation: translated });
  } catch (err: any) {
    await logActionTelemetry(
      userId,
      'translate',
      metadata?.module || 'general',
      selectedText?.length || 0,
      'failed',
      startTime,
      req.headers['user-agent'] || ''
    );
    res.status(500).json({ message: err.message || 'Translation failed.' });
  }
}

// ── 3. Generate Quiz Questions ───────────────────────────────────────────────
export async function generateQuizFromText(req: Request, res: Response) {
  const { selectedText, metadata, options } = req.body;
  const startTime = Date.now();
  const userId = (req as any).user?.id ?? 'anon';
  const count = options?.count || 3;

  try {
    if (!selectedText) {
      return res.status(400).json({ message: 'No text selected.' });
    }

    // Reuse existing generateQuizQuestions from quiz service
    const questions = await generateQuizQuestions({
      topic: metadata?.title || 'Selected Concept',
      courseName: metadata?.module || 'Study Material',
      context: selectedText,
      questionType: 'mixed',
      difficulty: 'medium',
      count,
    });

    await logActionTelemetry(
      userId,
      'generate-quiz',
      metadata?.module || 'general',
      selectedText.length,
      'success',
      startTime,
      req.headers['user-agent'] || '',
      metadata?.courseId
    );

    res.json({ success: true, questions });
  } catch (err: any) {
    await logActionTelemetry(
      userId,
      'generate-quiz',
      metadata?.module || 'general',
      selectedText?.length || 0,
      'failed',
      startTime,
      req.headers['user-agent'] || ''
    );
    res.status(500).json({ message: err.message || 'Quiz generation failed.' });
  }
}

// ── 4. Generate Flashcards ───────────────────────────────────────────────────
export async function generateFlashcardsFromText(req: Request, res: Response) {
  const { selectedText, metadata, options } = req.body;
  const startTime = Date.now();
  const userId = (req as any).user?.id ?? 'anon';
  const count = options?.count || 5;

  try {
    if (!selectedText) {
      return res.status(400).json({ message: 'No text selected.' });
    }

    // Reuse existing generateFlashcards from flashcard service
    const cards = await generateFlashcards(
      metadata?.title || 'Selected Topic',
      metadata?.module || 'Course Material',
      selectedText,
      count
    );

    await logActionTelemetry(
      userId,
      'create-flashcards',
      metadata?.module || 'general',
      selectedText.length,
      'success',
      startTime,
      req.headers['user-agent'] || '',
      metadata?.courseId
    );

    res.json({ success: true, cards });
  } catch (err: any) {
    await logActionTelemetry(
      userId,
      'create-flashcards',
      metadata?.module || 'general',
      selectedText?.length || 0,
      'failed',
      startTime,
      req.headers['user-agent'] || ''
    );
    res.status(500).json({ message: err.message || 'Flashcards generation failed.' });
  }
}

// ── 5. Generate Citation Reference ───────────────────────────────────────────
export async function generateCitation(req: Request, res: Response) {
  const { selectedText, metadata, options } = req.body;
  const startTime = Date.now();
  const userId = (req as any).user?.id ?? 'anon';
  const style = options?.style || 'APA';

  try {
    const author = (req as any).user?.name || 'EduMentor AI User';
    const year = new Date().getFullYear();
    const title = metadata?.title || 'Lecture Study Document';
    const url = metadata?.url || 'https://edumentor.ai';


    let citation = '';

    if (style === 'APA') {
      citation = `${author}. (${year}). ${title}. Retrieved from ${url}`;
    } else if (style === 'MLA') {
      citation = `${author}. "${title}." EduMentor AI Platform, ${year}, ${url}.`;
    } else if (style === 'IEEE') {
      citation = `${author[0]}. ${author.split(' ')[1] || ''}, "${title}," EduMentor AI, ${year}. [Online]. Available: ${url}`;
    }

    await logActionTelemetry(
      userId,
      'cite-source',
      metadata?.module || 'general',
      selectedText?.length || 0,
      'success',
      startTime,
      req.headers['user-agent'] || '',
      metadata?.courseId
    );

    res.json({ success: true, citation });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to generate citation.' });
  }
}

// ── 6. Assignment-specific critiques ────────────────────────────────────────
export async function getAssignmentFeedback(req: Request, res: Response) {
  const { selectedText, metadata } = req.body;
  const startTime = Date.now();
  const userId = (req as any).user?.id ?? 'anon';

  try {
    const systemPrompt = `You are a strict grading evaluator. Read the following student assignment response selection and provide helpful feedback, marking key concepts missed or areas of improvement. Keep it concise.`;
    const response = await generateWithoutContext(
      [{ role: 'user', content: `Assignment selection:\n\n${selectedText}` }],
      systemPrompt,
      0.3
    );

    await logActionTelemetry(
      userId,
      'assignment-feedback',
      metadata?.module || 'assignments',
      selectedText.length,
      'success',
      startTime,
      req.headers['user-agent'] || ''
    );

    res.json({ success: true, feedback: response.content.trim() });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to generate feedback.' });
  }
}

// ── 7. Explain mistakes ──────────────────────────────────────────────────────
export async function explainMistakes(req: Request, res: Response) {
  const { selectedText, metadata } = req.body;
  const startTime = Date.now();
  const userId = (req as any).user?.id ?? 'anon';

  try {
    const systemPrompt = `You are an expert tutor. Evaluate the incorrect concept or answer selected by the student and explain exactly what is wrong, how to solve it, and the correct approach.`;
    const response = await generateWithoutContext(
      [{ role: 'user', content: `Concept selected:\n\n${selectedText}` }],
      systemPrompt,
      0.3
    );

    await logActionTelemetry(
      userId,
      'explain-mistakes',
      metadata?.module || 'assignments',
      selectedText.length,
      'success',
      startTime,
      req.headers['user-agent'] || ''
    );

    res.json({ success: true, explanation: response.content.trim() });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to generate explanation.' });
  }
}
