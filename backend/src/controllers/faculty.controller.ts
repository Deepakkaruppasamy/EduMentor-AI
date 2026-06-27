import { Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { generateWithoutContext } from '../services/ai/groq.service';
import AuditLog from '../models/AuditLog';

export const generateFacultyMaterial = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { toolType, options } = req.body;

  if (!toolType || !options) {
    return res.status(400).json({ success: false, message: 'toolType and options are required.' });
  }

  let prompt = '';
  let logDetails = '';

  switch (toolType) {
    case 'question_paper': {
      const { topic, difficulty, duration, marks } = options;
      prompt = `Generate a formal, comprehensive academic question paper for the topic: "${topic}".
- Target Difficulty: ${difficulty || 'medium'}
- Duration: ${duration || '3 Hours'}
- Marks/Pattern Distribution: ${marks || 'Part A: 5 questions x 2 marks, Part B: 5 questions x 10 marks'}

Instructions:
1. Provide a professional header (University Portal Examination, Course Topic, Time Allowed, Max Marks).
2. Write clear, unambiguous questions testing various cognitive levels (knowledge, application, analysis).
3. Specify mark indicators in brackets [e.g., (5 Marks)] for every question.
4. Format in clean, professional Markdown with clear dividers.`;
      logDetails = `Generated Question Paper: ${topic} (${difficulty})`;
      break;
    }
    case 'assignment': {
      const { topic, objectives, instructions, submission } = options;
      prompt = `Create a detailed student homework assignment on the topic: "${topic}".
- Learning Objectives: ${objectives || 'Demonstrate mastery of core concepts.'}
- Instructions: ${instructions || 'Write a comprehensive report.'}
- Submission Guidelines: ${submission || 'Upload in PDF format by next week.'}

Instructions:
Format the output in professional Markdown with the following sections:
1. Title & Overview
2. Learning Objectives (bullet points)
3. Step-by-Step Assignment Tasks
4. Submission & Formatting Guidelines`;
      logDetails = `Created Assignment: ${topic}`;
      break;
    }
    case 'mcq': {
      const { topic, count, difficulty } = options;
      prompt = `Generate exactly ${count || 5} high-quality Multiple Choice Questions (MCQs) for the topic: "${topic}".
- Difficulty level: ${difficulty || 'medium'}

Instructions:
For each question:
1. Write a clear question stem.
2. Provide 4 distinct options labeled A, B, C, D (ensure only one is correct and distractors are plausible).
3. Clearly state the Correct Answer.
4. Provide a brief explanation of why the correct option is right.
Format the output in clean Markdown.`;
      logDetails = `Generated ${count || 5} MCQs: ${topic} (${difficulty})`;
      break;
    }
    case 'rubric': {
      const { title, criteria, scale } = options;
      prompt = `Generate a detailed grading rubric for the assignment/activity: "${title}".
- Assessment Criteria: ${criteria || 'Correctness, Code Quality, Documentation'} (split these into separate rows)
- Grading Scale: ${scale || 'Excellent, Good, Fair, Poor'} (split these into columns)

Instructions:
Create a structured Markdown table mapping each criterion against the grading scale columns.
In each cell, provide a brief, clear description of the student performance required to earn that specific grade.`;
      logDetails = `Generated Rubric: ${title}`;
      break;
    }
    case 'lab_exercise': {
      const { topic, language, objectives, instructions, expectedOutput } = options;
      prompt = `Generate a step-by-step practical laboratory exercise for the topic: "${topic}" using the programming language: "${language || 'Python'}".
- Lab Objectives: ${objectives || 'Practice writing clean structured code.'}
- Exercise Details: ${instructions || 'Implement a basic algorithm.'}
- Expected Outputs/Test Cases: ${expectedOutput || 'Correct console output.'}

Instructions:
Format the output in Markdown with the following sections:
1. Title & Programming Environment Setup
2. Lab Objectives
3. Lab Task Details & Step-by-Step Instructions
4. Code Template/Hint (fenced code blocks)
5. Test Cases & Expected Output`;
      logDetails = `Generated Lab Exercise: ${topic} (${language})`;
      break;
    }
    default:
      return res.status(400).json({ success: false, message: 'Invalid toolType specified.' });
  }

  try {
    const response = await generateWithoutContext(
      [{ role: 'user', content: prompt }],
      'You are an expert academic curriculum designer, examiner, and university teaching assistant. Always respond in formatted, clear, and comprehensive Markdown.',
      0.3
    );

    // Write audit log entry
    await AuditLog.create({
      action: 'FACULTY_MATERIAL_GENERATED',
      performedBy: req.user?.email || 'faculty@university.edu',
      details: `${logDetails}`,
      ipAddress: req.ip || req.socket.remoteAddress,
      device: req.headers['user-agent'] || 'Unknown Device',
      location: 'Local Intranet'
    });

    res.json({
      success: true,
      content: response.content
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'AI Generation failed.' });
  }
});
