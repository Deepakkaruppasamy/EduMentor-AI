import { Response } from 'express';
import mongoose from 'mongoose';
import Quiz from '../models/Quiz';
import Course from '../models/Course';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { generateQuizQuestions, evaluateQuizAnswers } from '../services/quiz/quiz.service';
import { hybridRetrieve } from '../services/rag/hybrid-rag.service';
import { updateQuizPerformance } from '../services/recommendations/recommendation.service';
import { notifyNewQuizAssigned } from '../services/socket.service';

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
    .populate('assignedBy', 'name email')
    .sort({ createdAt: -1 })
    .select('-questions');

  res.json({ success: true, count: quizzes.length, quizzes });
});

export const getQuizById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const quiz = await Quiz.findById(req.params.id)
    .populate('course', 'title code')
    .populate('assignedBy', 'name email');
  if (!quiz) {
    return res.status(404).json({ success: false, message: 'Quiz not found' });
  }
  res.json({ success: true, quiz });
});

export const assignQuiz = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId, topic, questionType = 'mcq', difficulty = 'medium', count = 5, dueDate } = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found' });
  }

  // Verify that current user is the faculty of the course, or admin
  const isFaculty = course.faculty.toString() === req.user?._id.toString();
  const isAdmin = req.user?.role === 'admin';
  if (!isFaculty && !isAdmin) {
    return res.status(403).json({ success: false, message: 'Not authorized to assign quiz to this course' });
  }

  if (!course.students || course.students.length === 0) {
    return res.status(400).json({ success: false, message: 'No students enrolled in this course to assign a quiz to.' });
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

  const assignmentId = new mongoose.Types.ObjectId().toString();
  const quizTitle = `${topic} - Assigned Quiz`;

  // Create quiz copies for each student enrolled in the course
  const quizDocs = course.students.map(studentId => ({
    course: courseId,
    student: studentId,
    title: quizTitle,
    questions,
    difficulty,
    type: questionType,
    topic,
    totalQuestions: questions.length,
    maxScore: questions.length,
    status: 'generated',
    assignedBy: req.user?._id,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    assignmentId,
  }));

  await Quiz.insertMany(quizDocs);

  // Notify students via websocket
  notifyNewQuizAssigned(courseId, topic, dueDate);

  res.status(201).json({
    success: true,
    message: `Quiz assigned to ${quizDocs.length} students successfully.`,
    assignmentId,
  });
});

export const getAssignedQuizzesList = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Find quizzes created by this faculty that have an assignmentId
  const assignments = await Quiz.aggregate([
    {
      $match: {
        assignedBy: req.user?._id,
        assignmentId: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: '$assignmentId',
        topic: { $first: '$topic' },
        title: { $first: '$title' },
        course: { $first: '$course' },
        dueDate: { $first: '$dueDate' },
        createdAt: { $first: '$createdAt' },
        totalStudents: { $sum: 1 },
        completedStudents: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        avgScore: {
          $avg: {
            $cond: [
              { $eq: ['$status', 'completed'] },
              { $cond: [{ $gt: ['$maxScore', 0] }, { $multiply: [{ $divide: ['$score', '$maxScore'] }, 100] }, 0] },
              null
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'courses',
        localField: 'course',
        foreignField: '_id',
        as: 'courseInfo'
      }
    },
    {
      $unwind: '$courseInfo'
    },
    {
      $project: {
        assignmentId: '$_id',
        _id: 0,
        topic: 1,
        title: 1,
        dueDate: 1,
        createdAt: 1,
        totalStudents: 1,
        completedStudents: 1,
        avgScore: { $round: ['$avgScore', 1] },
        course: {
          _id: '$courseInfo._id',
          title: '$courseInfo.title',
          code: '$courseInfo.code'
        }
      }
    },
    {
      $sort: { createdAt: -1 }
    }
  ]);

  res.json({ success: true, count: assignments.length, assignments });
});

export const getAssignmentDetailAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { assignmentId } = req.params;

  // Retrieve all quizzes with this assignmentId
  const quizzes = await Quiz.find({ assignmentId })
    .populate('student', 'name email')
    .sort({ createdAt: -1 });

  if (quizzes.length === 0) {
    return res.status(404).json({ success: false, message: 'Assignment not found' });
  }

  // Calculate statistics
  const total = quizzes.length;
  const completed = quizzes.filter(q => q.status === 'completed');
  const completedCount = completed.length;
  const avgScore = completedCount > 0
    ? Math.round(completed.reduce((sum, q) => sum + ((q.score || 0) / (q.maxScore || 1)) * 100, 0) / completedCount)
    : 0;

  const submissions = quizzes.map((q: any) => {
    let scorePercent = 0;
    if (q.status === 'completed' && q.maxScore > 0) {
      scorePercent = Math.round(((q.score || 0) / q.maxScore) * 100);
    }

    // Determine status (Pending, Completed, Overdue)
    let finalStatus = q.status;
    if (q.status !== 'completed' && q.dueDate && new Date() > new Date(q.dueDate)) {
      finalStatus = 'overdue';
    }

    return {
      quizId: q._id,
      student: {
        _id: q.student?._id,
        name: q.student?.name || 'Unknown Student',
        email: q.student?.email || 'N/A'
      },
      status: finalStatus,
      score: q.score,
      maxScore: q.maxScore,
      percentage: scorePercent,
      completedAt: q.completedAt,
      answers: q.questions.map((qn: any) => ({
        question: qn.question,
        studentAnswer: qn.studentAnswer || '',
        correctAnswer: qn.correctAnswer || '',
        isCorrect: qn.isCorrect || false,
        score: qn.score || 0,
        feedback: qn.feedback || ''
      }))
    };
  });

  res.json({
    success: true,
    analytics: {
      assignmentId,
      topic: quizzes[0].topic,
      title: quizzes[0].title,
      dueDate: quizzes[0].dueDate,
      createdAt: quizzes[0].createdAt,
      totalStudents: total,
      completedStudents: completedCount,
      avgScore,
      submissions
    }
  });
});
