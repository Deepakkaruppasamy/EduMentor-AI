import { generateWithoutContext } from '../ai/groq.service';
import { IQuizQuestion } from '../../models/Quiz';

export interface QuizGenerationParams {
  topic: string;
  courseName: string;
  context: string;
  questionType: 'mcq' | 'short' | 'long' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
  count: number;
}

/**
 * Quiz Generation Service
 * Uses LLM with structured prompts to generate educational questions
 */
export async function generateQuizQuestions(
  params: QuizGenerationParams
): Promise<IQuizQuestion[]> {
  const { topic, courseName, context, questionType, difficulty, count } = params;

  let prompt = '';

  if (questionType === 'mcq' || questionType === 'mixed') {
    prompt = buildMCQPrompt(topic, courseName, context, difficulty, questionType === 'mixed' ? Math.ceil(count * 0.6) : count);
  }

  let questions: IQuizQuestion[] = [];

  if (questionType === 'mcq') {
    questions = await generateMCQs(prompt);
  } else if (questionType === 'short') {
    const shortPrompt = buildShortAnswerPrompt(topic, courseName, context, difficulty, count);
    questions = await generateShortAnswers(shortPrompt, difficulty);
  } else if (questionType === 'long') {
    const longPrompt = buildLongAnswerPrompt(topic, courseName, context, difficulty, count);
    questions = await generateLongAnswers(longPrompt, difficulty);
  } else if (questionType === 'mixed') {
    const mcqCount = Math.ceil(count * 0.5);
    const shortCount = Math.ceil(count * 0.3);
    const longCount = count - mcqCount - shortCount;

    const [mcqs, shorts, longs] = await Promise.all([
      generateMCQs(buildMCQPrompt(topic, courseName, context, difficulty, mcqCount)),
      generateShortAnswers(buildShortAnswerPrompt(topic, courseName, context, difficulty, shortCount), difficulty),
      generateLongAnswers(buildLongAnswerPrompt(topic, courseName, context, difficulty, longCount), difficulty),
    ]);

    questions = [...mcqs, ...shorts, ...longs];
  }

  const normalizedQuestions = questions.map(q => {
    let type = q.type;
    if (!type) {
      type = questionType === 'mixed' ? 'mcq' : questionType;
    }
    const typeStr = String(type).toLowerCase().trim();
    if (typeStr.includes('mcq') || typeStr.includes('choice')) {
      type = 'mcq';
    } else if (typeStr.includes('short')) {
      type = 'short';
    } else if (typeStr.includes('long') || typeStr.includes('essay') || typeStr.includes('detailed')) {
      type = 'long';
    } else {
      type = 'mcq';
    }

    let diff = q.difficulty || difficulty;
    const diffStr = String(diff).toLowerCase().trim();
    if (['easy', 'medium', 'hard'].includes(diffStr)) {
      diff = diffStr as any;
    } else {
      diff = 'medium';
    }

    return {
      ...q,
      type,
      difficulty: diff,
    };
  });

  return normalizedQuestions.slice(0, count);
}

function buildMCQPrompt(topic: string, course: string, context: string, difficulty: string, count: number): string {
  return `You are an expert ${course} professor. Generate exactly ${count} multiple choice questions about "${topic}" at ${difficulty} difficulty level.

Course material context:
${context}

Generate ONLY a valid JSON object in this exact format:
{
  "questions": [
    {
      "question": "Question text here?",
      "type": "mcq",
      "difficulty": "${difficulty}",
      "options": [
        {"label": "A", "text": "Option A text", "isCorrect": false},
        {"label": "B", "text": "Option B text", "isCorrect": true},
        {"label": "C", "text": "Option C text", "isCorrect": false},
        {"label": "D", "text": "Option D text", "isCorrect": false}
      ],
      "correctAnswer": "B",
      "explanation": "Explanation of why B is correct",
      "topic": "${topic}"
    }
  ]
}

Rules:
- Each question must have exactly 4 options (A, B, C, D)
- Exactly ONE option must have isCorrect: true
- Questions should be based on the provided context
- ${difficulty === 'easy' ? 'Use simple recall questions' : difficulty === 'medium' ? 'Use comprehension and application questions' : 'Use analysis and synthesis questions'}
- Return ONLY the JSON object, no other text`;
}

function buildShortAnswerPrompt(topic: string, course: string, context: string, difficulty: string, count: number): string {
  return `You are an expert ${course} professor. Generate exactly ${count} short answer questions about "${topic}" at ${difficulty} difficulty level.

Context:
${context}

Return ONLY a valid JSON object:
{
  "questions": [
    {
      "question": "Question text?",
      "type": "short",
      "difficulty": "${difficulty}",
      "correctAnswer": "Expected 2-3 sentence answer",
      "explanation": "Key points that should be covered",
      "topic": "${topic}"
    }
  ]
}`;
}

function buildLongAnswerPrompt(topic: string, course: string, context: string, difficulty: string, count: number): string {
  return `You are an expert ${course} professor. Generate exactly ${count} essay/long answer questions about "${topic}" at ${difficulty} difficulty level.

Context:
${context}

Return ONLY a valid JSON object:
{
  "questions": [
    {
      "question": "Detailed question requiring a comprehensive answer?",
      "type": "long",
      "difficulty": "${difficulty}",
      "correctAnswer": "Key points and expected answer outline (3-5 paragraphs expected from student)",
      "explanation": "Rubric and key concepts to evaluate",
      "topic": "${topic}"
    }
  ]
}`;
}

async function generateMCQs(prompt: string): Promise<IQuizQuestion[]> {
  const response = await generateWithoutContext(
    [{ role: 'user', content: prompt }],
    'You are a quiz generator. Always respond with valid JSON only.',
    0.4,
    true
  );
  return parseJSONResponse(response.content);
}

async function generateShortAnswers(prompt: string, difficulty: string): Promise<IQuizQuestion[]> {
  const response = await generateWithoutContext(
    [{ role: 'user', content: prompt }],
    'You are a quiz generator. Always respond with valid JSON only.',
    0.5,
    true
  );
  return parseJSONResponse(response.content);
}

async function generateLongAnswers(prompt: string, difficulty: string): Promise<IQuizQuestion[]> {
  const response = await generateWithoutContext(
    [{ role: 'user', content: prompt }],
    'You are a quiz generator. Always respond with valid JSON only.',
    0.6,
    true
  );
  return parseJSONResponse(response.content);
}

function parseJSONResponse(content: string): IQuizQuestion[] {
  try {
    const jsonText = content.trim();
    const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
    const objectMatch = jsonText.match(/\{[\s\S]*\}/);
    
    if (arrayMatch && (!objectMatch || arrayMatch.index! < objectMatch.index!)) {
      return JSON.parse(arrayMatch[0]);
    } else if (objectMatch) {
      const parsed = JSON.parse(objectMatch[0]);
      if (Array.isArray(parsed)) return parsed;
      if (parsed.questions && Array.isArray(parsed.questions)) {
        return parsed.questions;
      }
      return [];
    }
    return [];
  } catch (err) {
    console.error('Failed to parse quiz JSON:', err);
    return [];
  }
}

/**
 * Auto-evaluate MCQ answers
 */
export function evaluateMCQAnswers(
  questions: IQuizQuestion[],
  studentAnswers: Record<number, string>
): { questions: IQuizQuestion[]; score: number; maxScore: number } {
  let score = 0;
  const evaluated = questions.map((q, i) => {
    if (q.type !== 'mcq') return q;
    const studentAnswer = studentAnswers[i];
    const isCorrect = studentAnswer === q.correctAnswer;
    if (isCorrect) score++;
    return { ...q, studentAnswer, isCorrect, score: isCorrect ? 1 : 0 };
  });

  return { questions: evaluated as IQuizQuestion[], score, maxScore: questions.filter((q) => q.type === 'mcq').length };
}

/**
 * Asynchronously evaluate all quiz answers, using local validation for MCQs
 * and AI-driven grading via Groq for short/long answers.
 */
export async function evaluateQuizAnswers(
  questions: IQuizQuestion[],
  studentAnswers: Record<number, string>
): Promise<{ questions: IQuizQuestion[]; score: number; maxScore: number }> {
  let score = 0;
  
  const evaluatedPromises = questions.map(async (q, i) => {
    const studentAnswer = studentAnswers[i] || '';

    if (q.type === 'mcq') {
      const isCorrect = studentAnswer === q.correctAnswer;
      if (isCorrect) score += 1;
      return {
        ...q,
        studentAnswer,
        isCorrect,
        score: isCorrect ? 1 : 0,
        feedback: isCorrect ? 'Correct!' : `Incorrect. The correct answer was ${q.correctAnswer}.`,
      };
    } else if (q.type === 'short' || q.type === 'long') {
      if (!studentAnswer.trim()) {
        return {
          ...q,
          studentAnswer,
          isCorrect: false,
          score: 0,
          feedback: 'No answer was provided.',
        };
      }

      try {
        const prompt = `You are an expert professor. Evaluate a student's answer to a ${q.type} answer question.
Here is the question, the expected correct answer key, and the student's answer.

Question: "${q.question}"
Expected Correct Answer Key: "${q.correctAnswer || 'Not available'}"
Key Points/Explanation: "${q.explanation || 'Not available'}"
Student's Answer: "${studentAnswer}"

Evaluate the student's answer. Give a score:
- 1.0 for a completely correct/comprehensive answer.
- 0.5 for a partially correct answer that covers some key points.
- 0.0 for an incorrect, irrelevant, or missing answer.

Decide if the answer is considered correct/passing (isCorrect: true if score >= 0.5, else false).
Provide a brief, encouraging feedback sentence for the student explaining the evaluation.

Respond ONLY with a valid JSON object in this format:
{
  "score": 0.5,
  "isCorrect": true,
  "feedback": "Your explanation here"
}`;

        const response = await generateWithoutContext(
          [{ role: 'user', content: prompt }],
          'You are a quiz evaluator. Always respond with valid JSON only.',
          0.3,
          true
        );

        const result = JSON.parse(response.content.trim());
        const itemScore = typeof result.score === 'number' ? result.score : 0;
        const itemIsCorrect = typeof result.isCorrect === 'boolean' ? result.isCorrect : itemScore >= 0.5;
        const itemFeedback = typeof result.feedback === 'string' ? result.feedback : 'Graded by AI.';

        score += itemScore;

        return {
          ...q,
          studentAnswer,
          isCorrect: itemIsCorrect,
          score: itemScore,
          feedback: itemFeedback,
        };
      } catch (err) {
        console.error('Failed to grade question via AI:', err);
        const isCorrect = studentAnswer.trim().length > 10;
        const fallbackScore = isCorrect ? 0.5 : 0;
        score += fallbackScore;
        return {
          ...q,
          studentAnswer,
          isCorrect,
          score: fallbackScore,
          feedback: 'Auto-graded (fallback).',
        };
      }
    }

    return q;
  });

  const evaluated = await Promise.all(evaluatedPromises);
  const maxScore = questions.length;

  return {
    questions: evaluated as any[],
    score: Math.round(score * 10) / 10,
    maxScore,
  };
}
