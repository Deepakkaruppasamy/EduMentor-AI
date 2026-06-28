import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import GeneratedNote from '../models/GeneratedNote';
import { generateWithoutContext } from '../services/ai/groq.service';

const NOTE_TYPE_PROMPTS: Record<string, string> = {
  Revision: 'Create comprehensive revision notes with key concepts, definitions, and important points organized with clear headings.',
  Short: 'Create concise short notes — bullet points only, maximum 1-2 lines per point. Focus only on the most essential concepts.',
  Detailed: 'Create highly detailed study notes with explanations, examples, sub-topics, and connections between concepts.',
  CheatSheet: 'Create a one-page cheat sheet with the most important formulas, definitions, rules, and quick references formatted compactly.',
  Formula: 'List all relevant formulas, equations, and mathematical expressions with brief explanations of each variable.',
  KeyPoints: 'Extract and list only the most critical key points — the "must know" items for exams.',
  MindMap: 'Create a text-based mind map using indentation and symbols (→, ◆, •) to show concept relationships hierarchically.',
  ExamTips: 'Provide strategic exam tips, common question patterns, tricky areas to watch out for, and memory tricks for this topic.',
};

const NOTES_SYSTEM_PROMPT = `You are an expert academic content creator for university students.
Generate high-quality study notes in clean Markdown format.
Be thorough, accurate, and pedagogically effective.`;

export const generateNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { courseName, courseId, topic, noteType } = req.body;

    if (!topic || !noteType || !courseName) {
      res.status(400).json({ success: false, message: 'courseName, topic, and noteType are required.' });
      return;
    }

    const typePrompt = NOTE_TYPE_PROMPTS[noteType] || NOTE_TYPE_PROMPTS['Revision'];

    const userPrompt = `Course: ${courseName}
Topic: ${topic}
Note Type: ${noteType}

Instructions: ${typePrompt}

Generate the notes for the topic "${topic}" from the course "${courseName}". Format the output in clean, well-structured Markdown.`;

    const response = await generateWithoutContext(
      [{ role: 'user', content: userPrompt }],
      NOTES_SYSTEM_PROMPT,
      0.3
    );

    // Save to database
    const note = await GeneratedNote.create({
      user: userId,
      course: courseId || undefined,
      courseName,
      topic,
      noteType,
      content: response.content,
    });

    res.status(201).json({ success: true, data: note });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { noteType, search } = req.query;

    const filter: any = { user: userId };
    if (noteType) filter.noteType = noteType;
    if (search) filter.$text = { $search: search as string };

    const notes = await GeneratedNote.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: notes });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    const note = await GeneratedNote.findById(id);
    if (!note || note.user.toString() !== userId.toString()) {
      res.status(404).json({ success: false, message: 'Note not found or access denied.' });
      return;
    }

    await note.deleteOne();
    res.json({ success: true, message: 'Note deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
