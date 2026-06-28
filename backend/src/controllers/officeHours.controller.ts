import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import OfficeHours from '../models/OfficeHours';
import ConsultationQueue from '../models/ConsultationQueue';
import User from '../models/User';

// Faculty: upsert their office hours configuration
export const upsertOfficeHours = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const facultyId = req.user!._id;
    const { workingDays, slots, status, statusMessage } = req.body;

    const config = await OfficeHours.findOneAndUpdate(
      { faculty: facultyId },
      { workingDays, slots, status, statusMessage },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: config });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// All users: get all faculty with their availability
export const getAllFacultyAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const facultyList = await User.find({ role: 'faculty', isActive: true })
      .select('name email department profileImage');

    const facultyIds = facultyList.map(f => f._id);
    const officeHoursMap = await OfficeHours.find({ faculty: { $in: facultyIds } });

    const ohByFaculty: Record<string, any> = {};
    officeHoursMap.forEach(oh => {
      ohByFaculty[oh.faculty.toString()] = oh;
    });

    const result = facultyList.map(f => ({
      faculty: f,
      officeHours: ohByFaculty[f._id.toString()] || null,
    }));

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Faculty: get their own office hours config
export const getMyOfficeHours = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const facultyId = req.user!._id;
    const config = await OfficeHours.findOne({ faculty: facultyId });
    res.json({ success: true, data: config });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Faculty: update status (Available/Busy/OnLeave/Offline)
export const updateFacultyStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const facultyId = req.user!._id;
    const { status, statusMessage } = req.body;

    const config = await OfficeHours.findOneAndUpdate(
      { faculty: facultyId },
      { status, statusMessage },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: config });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Student: join consultation queue for a faculty
export const joinQueue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user!._id;
    const { facultyId } = req.body;

    // Check already in queue
    const existing = await ConsultationQueue.findOne({
      faculty: facultyId,
      student: studentId,
      status: 'Waiting',
    });
    if (existing) {
      res.status(409).json({ success: false, message: 'You are already in the queue.', data: existing });
      return;
    }

    // Get current last position
    const lastEntry = await ConsultationQueue.findOne({
      faculty: facultyId,
      status: 'Waiting',
    }).sort({ position: -1 });

    const position = (lastEntry?.position || 0) + 1;

    const entry = await ConsultationQueue.create({
      faculty: facultyId,
      student: studentId,
      position,
      status: 'Waiting',
    });

    const populated = await ConsultationQueue.findById(entry._id)
      .populate('student', 'name email')
      .populate('faculty', 'name email');

    res.status(201).json({ success: true, data: populated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Student: leave the queue
export const leaveQueue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user!._id;
    const { facultyId } = req.body;

    await ConsultationQueue.findOneAndUpdate(
      { faculty: facultyId, student: studentId, status: 'Waiting' },
      { status: 'Left' }
    );

    res.json({ success: true, message: 'Left the consultation queue.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get current queue for a faculty
export const getQueue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { facultyId } = req.params;

    const queue = await ConsultationQueue.find({
      faculty: facultyId,
      status: 'Waiting',
    })
      .populate('student', 'name email')
      .sort({ position: 1 });

    res.json({ success: true, data: queue });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Faculty: call next student
export const callNext = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const facultyId = req.user!._id;

    // Mark currently called as Done
    await ConsultationQueue.updateMany(
      { faculty: facultyId, status: 'Called' },
      { status: 'Done' }
    );

    // Get next waiting
    const next = await ConsultationQueue.findOneAndUpdate(
      { faculty: facultyId, status: 'Waiting' },
      { status: 'Called' },
      { sort: { position: 1 }, new: true }
    ).populate('student', 'name email');

    if (!next) {
      res.json({ success: true, data: null, message: 'Queue is empty.' });
      return;
    }

    res.json({ success: true, data: next });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
