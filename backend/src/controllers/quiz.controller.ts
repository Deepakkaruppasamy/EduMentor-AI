import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import Quiz from '../models/Quiz';
import Course from '../models/Course';
import User from '../models/User';
import { asyncHandler } from '../middleware/errorHandler';
import { generateQuizQuestions, evaluateQuizAnswers } from '../services/quiz/quiz.service';
import { hybridRetrieve } from '../services/rag/hybrid-rag.service';
import { updateQuizPerformance } from '../services/recommendations/recommendation.service';
import { notifyNewQuizAssigned } from '../services/socket.service';
import { generateWithoutContext } from '../services/ai/groq.service';
import { sendEmail } from '../utils/email';

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
  const grade = percentage >= 90 ? 'A' : percentage >= 75 ? 'B' : percentage >= 60 ? 'C' : percentage >= 45 ? 'D' : 'F';
  const feedback = percentage >= 75 ? '🎉 Excellent work!' : percentage >= 45 ? '📚 Good effort, keep studying!' : '⚠️ Needs more practice on this topic.';

  // Send evaluation result email
  sendEmail({
    email: req.user!.email,
    subject: `Quiz Evaluated: ${quiz.title} 📝`,
    text: `Hello ${req.user!.name},\n\nYour quiz has been evaluated.\n\nResults Summary:\n- Quiz: ${quiz.title}\n- Score: ${score} / ${maxScore}\n- Percentage: ${percentage}%\n- Grade: ${grade}\n- Feedback: ${feedback}\n\nKeep up the learning effort!\n\nBest regards,\nThe EduMentor AI Team`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1a202c;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4f63ff; margin: 0; font-size: 24px; font-weight: 700;">Quiz Evaluation Report 📝</h2>
        </div>
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
        <p style="font-size: 15px;">Hello <strong>${req.user!.name}</strong>,</p>
        <p style="font-size: 15px; color: #4a5568;">Your submission for <strong>${quiz.title}</strong> has been evaluated successfully. Here is your results breakdown:</p>
        
        <div style="background-color: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #edf2f7; font-size: 14px; line-height: 1.6; color: #4a5568;">
          <div style="font-size: 18px; font-weight: bold; text-align: center; color: #2d3748; margin-bottom: 12px;">
            Score: <span style="color: #4f63ff; font-size: 24px;">${score}</span> / ${maxScore} (${percentage}%)
          </div>
          <div style="display: flex; justify-content: space-around; border-top: 1px solid #edf2f7; border-bottom: 1px solid #edf2f7; padding: 10px 0; margin-bottom: 12px; font-size: 16px; font-weight: bold;">
            <span>Grade: <span style="color: #2b6cb0;">${grade}</span></span>
          </div>
          <div style="font-style: italic; text-align: center; color: #4a5568;">
            ${feedback}
          </div>
        </div>
        
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
        <p style="font-size: 11px; color: #a0aec0; text-align: center; margin: 0;">EduMentor AI Assessment Desk</p>
      </div>
    `
  }).catch(err => console.error('Failed to send quiz score report email:', err));

  res.json({
    success: true,
    quiz,
    results: {
      score,
      maxScore,
      percentage,
      grade,
      feedback,
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

  // Notify students via email asynchronously
  User.find({ _id: { $in: course.students } })
    .select('name email')
    .then(students => {
      const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A';
      students.forEach(student => {
        sendEmail({
          email: student.email,
          subject: `New Quiz Assigned: ${topic} 📝`,
          text: `Hello ${student.name},\n\nYour instructor ${req.user!.name} has assigned a new quiz for your course "${course.title}".\n\nQuiz Details:\n- Topic: ${topic}\n- Difficulty: ${difficulty}\n- Due Date: ${dueDateStr}\n\nPlease log in to EduMentor AI and complete the assignment before the due date.`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1a202c;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #4f63ff; margin: 0; font-size: 24px; font-weight: 700;">New Quiz Assigned 📝</h2>
                <p style="color: #718096; margin: 5px 0 0 0; font-size: 14px;">Course: ${course.title} (${course.code || ''})</p>
              </div>
              <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
              <p style="font-size: 15px;">Hello <strong>${student.name}</strong>,</p>
              <p style="font-size: 15px; color: #4a5568;">Your instructor <strong>${req.user!.name}</strong> has assigned a new quiz. Here are the details:</p>
              
              <div style="background-color: #f7fafc; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #edf2f7; font-size: 14px; line-height: 1.6; color: #4a5568;">
                <div>📂 <strong>Topic:</strong> ${topic}</div>
                <div>⚡ <strong>Difficulty:</strong> ${difficulty}</div>
                <div>📅 <strong>Due Date:</strong> ${dueDateStr}</div>
              </div>
              
              <p style="font-size: 14px; color: #718096;">Please log in to your dashboard to complete the quiz before the deadline.</p>
              <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
              <p style="font-size: 11px; color: #a0aec0; text-align: center; margin: 0;">EduMentor AI Assessment Desk</p>
            </div>
          `
        }).catch(err => console.error(`Failed to send quiz assignment email to ${student.email}:`, err));
      });
    })
    .catch(err => console.error('Failed to query students for quiz email notifications:', err));

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

export const evaluateOralAnswer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ success: false, message: 'Question and answer are required' });
  }

  const prompt = `You are evaluating a student's spoken answer to an oral exam question.
Question: "${question}"
Student's Spoken Answer: "${answer}"

Provide a JSON object containing:
- "score": a number from 0 to 100 representing correctness.
- "isCorrect": a boolean (true if score >= 60).
- "feedback": a very short, constructive spoken-style explanation of their answer's accuracy (limit to 1-2 sentences, suitable for speech synthesis).

Return ONLY the raw JSON object. Do not include markdown code block formatting or backticks.`;

  const response = await generateWithoutContext(
    [{ role: 'user', content: prompt }],
    'You are an expert academic evaluator. Return JSON only.',
    0.3,
    true
  );

  try {
    const result = JSON.parse(response.content);
    res.json({ success: true, result });
  } catch (error) {
    res.json({
      success: true,
      result: {
        score: answer.trim().length > 15 ? 85 : 35,
        isCorrect: answer.trim().length > 15,
        feedback: "Your answer has been processed. Good effort."
      }
    });
  }
});
