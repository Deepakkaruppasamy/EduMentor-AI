import { Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import {
  getStudentRecommendations,
  generatePersonalizedPlan,
} from '../services/recommendations/recommendation.service';
import Course from '../models/Course';

export const getRecommendations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId } = req.query;

  if (!courseId) {
    return res.status(400).json({ success: false, message: 'courseId is required' });
  }

  const rec = await getStudentRecommendations(req.user!._id.toString(), courseId as string);

  if (!rec) {
    return res.json({
      success: true,
      message: 'No data yet. Start chatting and taking quizzes!',
      recommendation: null,
    });
  }

  res.json({ success: true, recommendation: rec });
});

export const generatePlan = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId } = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found' });
  }

  const rec = await generatePersonalizedPlan(req.user!._id.toString(), courseId, course.title);

  res.json({ success: true, message: 'Personalized plan generated', recommendation: rec });
});
