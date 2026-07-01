import { Response, NextFunction } from 'express';
import { generateWithoutContext } from '../services/ai/groq.service';
import { AuthRequest } from '../middleware/auth';

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/assistant/chat
   Platform-wide AI guidance assistant — no course context required.
   Accepts: { message, pageContext, conversationHistory }
   Returns: { reply }
───────────────────────────────────────────────────────────────────────────── */
export const assistantChat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { message, pageContext, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ message: 'Message is required.' });
      return;
    }

    const user = req.user!;
    const roleDescription = user.role === 'student'
      ? 'a university student'
      : user.role === 'faculty'
      ? 'a faculty member / lecturer'
      : 'a system administrator';

    const systemPrompt = `You are the EduMentor AI Learning Assistant — a friendly, knowledgeable platform guide embedded in EduMentor AI, an advanced educational platform powered by Llama 3 and Hybrid RAG technology.

You are talking to ${roleDescription} named "${user.name}".
They are currently on the page: "${pageContext || 'the main dashboard'}".

Your capabilities on EduMentor AI include:
- AI Chat Tutor (RAG-powered course Q&A)
- Quiz Generator & Live Quiz Battles
- Flashcard Creator
- AI Study Planner
- Notes Generator (text + voice transcription)
- Research Assistant (summarize papers + citations)
- Assignment Evaluator (AI grading with feedback)
- AI Plagiarism Checker (similarity + citation analysis)
- Academic Calendar & Meeting Scheduler
- Faculty AI Assistant (for faculty/admin)
- Analytics & Gradebook (for faculty/admin)
- Recommendations Engine
- Support Center

Your role:
1. Help users navigate the platform and understand features
2. Suggest the most useful tools based on their current page and role
3. Answer questions about platform features clearly and concisely
4. Provide educational tips and learning strategies
5. Remind users of pending tasks when relevant

Guidelines:
- Be warm, encouraging, and concise
- For platform-specific questions, give direct actionable answers
- For academic/learning questions, provide genuinely helpful explanations
- Use markdown formatting (bold, bullet points) to improve readability
- Keep responses under 300 words unless a detailed explanation is truly necessary
- Never make up features that don't exist on the platform`;

    // Build conversation history for context (last 6 turns max)
    const historyMessages = (conversationHistory as any[])
      .slice(-6)
      .map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: String(msg.content),
      }));

    const allMessages = [
      ...historyMessages,
      { role: 'user' as const, content: message.trim() },
    ];

    const response = await generateWithoutContext(
      allMessages,
      systemPrompt,
      0.5
    );

    res.json({ reply: response.content });
  } catch (err) {
    next(err);
  }
};
