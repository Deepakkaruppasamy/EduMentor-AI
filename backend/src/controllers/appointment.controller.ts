import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Appointment from '../models/Appointment';
import User from '../models/User';

// Student: request an appointment with a faculty member
export const requestAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user!._id;
    const { facultyId, mode, date, timeSlot, purpose } = req.body;

    if (!facultyId || !mode || !date || !timeSlot || !purpose) {
      res.status(400).json({ success: false, message: 'All fields are required.' });
      return;
    }

    // Conflict check: faculty already has approved appointment at same date+slot
    const conflict = await Appointment.findOne({
      faculty: facultyId,
      date: new Date(date),
      timeSlot,
      status: { $in: ['Pending', 'Approved'] },
    });
    if (conflict) {
      res.status(409).json({ success: false, message: 'That time slot is already booked. Please choose another.' });
      return;
    }

    const appointment = await Appointment.create({
      student: studentId,
      faculty: facultyId,
      mode,
      date: new Date(date),
      timeSlot,
      purpose,
      status: 'Pending',
    });

    const populated = await Appointment.findById(appointment._id)
      .populate('student', 'name email department')
      .populate('faculty', 'name email department');

    res.status(201).json({ success: true, data: populated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get appointments for the current user (student sees own, faculty sees requests to them)
export const getMyAppointments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const role = req.user!.role;

    const filter = role === 'student' ? { student: userId } : { faculty: userId };

    const appointments = await Appointment.find(filter)
      .populate('student', 'name email department')
      .populate('faculty', 'name email department')
      .sort({ date: -1, createdAt: -1 });

    res.json({ success: true, data: appointments });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin: get all appointments
export const getAllAppointments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const appointments = await Appointment.find()
      .populate('student', 'name email department')
      .populate('faculty', 'name email department')
      .sort({ date: -1 });

    res.json({ success: true, data: appointments });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Faculty: update appointment status (Approve/Reject/Reschedule/Complete) + add notes
export const updateAppointmentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, facultyNotes, rescheduledDate, rescheduledSlot } = req.body;
    const facultyId = req.user!._id;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }

    // Verify faculty owns this request (or admin)
    if (req.user!.role !== 'admin' && appointment.faculty.toString() !== facultyId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    if (status) appointment.status = status;
    if (facultyNotes !== undefined) appointment.facultyNotes = facultyNotes;
    if (rescheduledDate) appointment.rescheduledDate = new Date(rescheduledDate);
    if (rescheduledSlot) appointment.rescheduledSlot = rescheduledSlot;

    await appointment.save();

    const populated = await Appointment.findById(id)
      .populate('student', 'name email department')
      .populate('faculty', 'name email department');

    res.json({ success: true, data: populated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Student: cancel their own appointment
export const cancelAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = req.user!._id;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }
    if (appointment.student.toString() !== studentId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
    if (['Completed', 'Cancelled'].includes(appointment.status)) {
      res.status(400).json({ success: false, message: 'Cannot cancel a completed or already cancelled appointment.' });
      return;
    }

    appointment.status = 'Cancelled';
    await appointment.save();

    res.json({ success: true, data: appointment });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get list of faculty for student to select
export const getFacultyList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const faculty = await User.find({ role: 'faculty', isActive: true })
      .select('name email department profileImage')
      .sort({ name: 1 });
    res.json({ success: true, data: faculty });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
