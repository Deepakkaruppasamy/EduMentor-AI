import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Feedback from '../models/Feedback';
import User from '../models/User';

// ── Student: Submit Feedback ──────────────────────────────────
export const submitFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { targetType, targetFaculty, targetCourse, category, rating, title, message, isAnonymous } = req.body;

    if (!targetType || !category || !rating || !title || !message) {
      res.status(400).json({ success: false, message: 'All required fields must be filled' });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
      return;
    }

    let targetFacultyName: string | undefined;
    let targetCourseName: string | undefined;

    if (targetType === 'faculty' && targetFaculty) {
      const faculty = await User.findById(targetFaculty).select('name');
      targetFacultyName = faculty?.name;
    }

    const feedback = await Feedback.create({
      student: user._id,
      studentName: user.name,
      targetType,
      targetFaculty: targetType === 'faculty' ? targetFaculty : undefined,
      targetFacultyName,
      targetCourse: targetType === 'course' ? targetCourse : undefined,
      targetCourseName,
      category,
      rating,
      title: title.trim(),
      message: message.trim(),
      isAnonymous: !!isAnonymous,
    });

    res.status(201).json({ success: true, data: feedback });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Student: Get My Feedback ──────────────────────────────────
export const getMyFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const feedback = await Feedback.find({ student: req.user!._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: feedback });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Faculty: Get Feedback Addressed to Me ────────────────────
export const getFacultyFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const feedback = await Feedback.find({ targetFaculty: req.user!._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: feedback });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: Get All Feedback ───────────────────────────────────
export const getAllFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { targetType, category, status, minRating, maxRating } = req.query;
    const filter: any = {};
    if (targetType) filter.targetType = targetType;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (minRating || maxRating) {
      filter.rating = {};
      if (minRating) filter.rating.$gte = Number(minRating);
      if (maxRating) filter.rating.$lte = Number(maxRating);
    }

    const feedback = await Feedback.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: feedback });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: Get Feedback Analytics ────────────────────────────
export const getFeedbackAnalytics = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [total, byRating, byCategory, byTargetType, avgRating, recentTrend] = await Promise.all([
      Feedback.countDocuments(),
      Feedback.aggregate([{ $group: { _id: '$rating', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Feedback.aggregate([{ $group: { _id: '$category', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } }]),
      Feedback.aggregate([{ $group: { _id: '$targetType', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } }]),
      Feedback.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
      // Last 30 days daily counts
      Feedback.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        total,
        averageRating: avgRating[0]?.avg?.toFixed(2) || 0,
        byRating,
        byCategory,
        byTargetType,
        recentTrend,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: Update Feedback Status / Note ─────────────────────
export const updateFeedbackStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    const feedback = await Feedback.findByIdAndUpdate(
      id,
      { ...(status && { status }), ...(adminNote !== undefined && { adminNote }) },
      { new: true }
    );

    if (!feedback) {
      res.status(404).json({ success: false, message: 'Feedback not found' });
      return;
    }

    res.json({ success: true, data: feedback });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: Delete Feedback ────────────────────────────────────
export const deleteFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Feedback deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
