import { Response } from 'express';
import Quiz from '../models/Quiz';
import Course from '../models/Course';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { generateQuizQuestions, evaluateQuizAnswers } from '../services/quiz/quiz.service';
import { hybridRetrieve } from '../services/rag/hybrid-rag.service';
import { updateQuizPerformance } from '../services/recommendations/recommendation.service';

export const generateQuiz = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId, topic, questionType = 'mcq', difficulty = 'medium', count = 5 } = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found' });
  }

  // Retrieve context for the topic
  const ragResult = await hybridRetrieve(topic, course.chromaCollection, 5);

  const questions = await generateQuizQuestions({
    topic,
    courseName: course.title,
    context: ragResult.context || `Topic: ${topic} for ${course.title}`,
    questionType,
    difficulty,
    count: Math.min(count, 20),
  });

  if (questions.length === 0) {
    return res.status(422).json({ success: false, message: 'Failed to generate questions. Try a different topic.' });
  }

  const quiz = await Quiz.create({
    course: courseId,
    student: req.user?._id,
    title: `${topic} - ${questionType.toUpperCase()} Quiz`,
    questions,
    difficulty,
    type: questionType,
    topic,
    totalQuestions: questions.length,
    maxScore: questions.length,
    status: 'generated',
  });

  res.status(201).json({ success: true, quiz });
});

export const evaluateQuiz = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { quizId, answers } = req.body;

  const quiz = await Quiz.findOne({ _id: quizId, student: req.user?._id });
  if (!quiz) {
    return res.status(404).json({ success: false, message: 'Quiz not found' });
  }

  const { questions, score, maxScore } = await evaluateQuizAnswers(quiz.questions as any, answers);

  quiz.questions = questions as any;
  quiz.score = score;
  quiz.maxScore = maxScore;
  quiz.status = 'completed';
  quiz.completedAt = new Date();
  await quiz.save();

  // Update personalized recommendations
  if (quiz.topic && quiz.course) {
    await updateQuizPerformance(
      req.user!._id.toString(),
      quiz.course.toString(),
      quiz.topic,
      score,
      maxScore
    );
  }

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  res.json({
    success: true,
    quiz,
    results: {
      score,
      maxScore,
      percentage,
      grade: percentage >= 90 ? 'A' : percentage >= 75 ? 'B' : percentage >= 60 ? 'C' : percentage >= 45 ? 'D' : 'F',
      feedback: percentage >= 75 ? '🎉 Excellent work!' : percentage >= 45 ? '📚 Good effort, keep studying!' : '⚠️ Needs more practice on this topic.',
    },
  });
});

export const getStudentQuizzes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId } = req.query;
  const filter: any = { student: req.user?._id };
  if (courseId) filter.course = courseId;

  const quizzes = await Quiz.find(filter)
    .populate('course', 'title code')
    .sort({ createdAt: -1 })
    .select('-questions');

  res.json({ success: true, count: quizzes.length, quizzes });
});

export const getQuizById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const quiz = await Quiz.findById(req.params.id).populate('course', 'title code');
  if (!quiz) {
    return res.status(404).json({ success: false, message: 'Quiz not found' });
  }
  res.json({ success: true, quiz });
});
