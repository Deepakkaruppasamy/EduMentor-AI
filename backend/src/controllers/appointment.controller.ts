import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Appointment from '../models/Appointment';
import User from '../models/User';
import { sendEmail } from '../utils/email';

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

    if (populated && populated.faculty && populated.student) {
      sendEmail({
        email: (populated.faculty as any).email,
        subject: 'New Consultation Appointment Request 📅',
        text: `Hello ${(populated.faculty as any).name},\n\nYou have received a new consultation appointment request from ${(populated.student as any).name}.\n\nDetails:\n- Date: ${new Date(populated.date).toLocaleDateString()}\n- Time Slot: ${populated.timeSlot}\n- Mode: ${populated.mode}\n- Purpose: ${populated.purpose}\n\nPlease log in to the EduMentor AI portal to approve, reject, or reschedule this request.`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1a202c;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #4f63ff; margin: 0; font-size: 24px; font-weight: 700;">New Appointment Request 📅</h2>
            </div>
            <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
            <p style="font-size: 15px;">Hello <strong>${(populated.faculty as any).name}</strong>,</p>
            <p style="font-size: 15px; color: #4a5568;">You have received a new consultation appointment request from <strong>${(populated.student as any).name}</strong>. Here are the details:</p>
            
            <div style="background-color: #f7fafc; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #edf2f7; font-size: 14px; line-height: 1.6; color: #4a5568;">
              <div>📅 <strong>Date:</strong> ${new Date(populated.date).toLocaleDateString()}</div>
              <div>⏰ <strong>Time Slot:</strong> ${populated.timeSlot}</div>
              <div>🌐 <strong>Mode:</strong> ${populated.mode}</div>
              <div>📝 <strong>Purpose:</strong> ${populated.purpose}</div>
            </div>
            
            <p style="font-size: 14px; color: #718096;">Please log in to your dashboard to review and manage this request.</p>
            <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
            <p style="font-size: 11px; color: #a0aec0; text-align: center; margin: 0;">EduMentor AI Scheduler System</p>
          </div>
        `
      }).catch(err => console.error('Failed to send appointment request email:', err));
    }

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

    if (populated && populated.student && populated.faculty) {
      const studentEmail = (populated.student as any).email;
      const studentName = (populated.student as any).name;
      const facultyName = (populated.faculty as any).name;
      
      let emailText = `Hello ${studentName},\n\nYour consultation appointment with ${facultyName} has been updated to: ${status}.\n\nDetails:\n- Date: ${new Date(populated.date).toLocaleDateString()}\n- Time Slot: ${populated.timeSlot}`;
      let emailHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1a202c;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4f63ff; margin: 0; font-size: 24px; font-weight: 700;">Appointment Update 🔔</h2>
          </div>
          <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
          <p style="font-size: 15px;">Hello <strong>${studentName}</strong>,</p>
          <p style="font-size: 15px; color: #4a5568;">Your consultation appointment status has been updated by <strong>${facultyName}</strong> to **${status}**.</p>
          
          <div style="background-color: #f7fafc; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #edf2f7; font-size: 14px; line-height: 1.6; color: #4a5568;">
            <div>📅 <strong>Original Date:</strong> ${new Date(populated.date).toLocaleDateString()}</div>
            <div>⏰ <strong>Original Time Slot:</strong> ${populated.timeSlot}</div>
            <div style="margin-top: 8px; font-weight: bold; color: #2b6cb0;">📊 Status: ${status}</div>
      `;

      if (status === 'Rescheduled' && populated.rescheduledDate && populated.rescheduledSlot) {
        emailText += `\n\nProposed Rescheduled Slot:\n- Date: ${new Date(populated.rescheduledDate).toLocaleDateString()}\n- Time Slot: ${populated.rescheduledSlot}`;
        emailHtml += `
          <div style="margin-top: 12px; padding: 10px; background-color: #ebf8ff; border: 1px solid #bee3f8; border-radius: 8px; color: #2b6cb0;">
            📅 <strong>Proposed Rescheduled Slot:</strong><br/>
            Date: ${new Date(populated.rescheduledDate).toLocaleDateString()}<br/>
            Time Slot: ${populated.rescheduledSlot}
          </div>
        `;
      }

      if (populated.facultyNotes) {
        emailText += `\n\nFaculty Notes: ${populated.facultyNotes}`;
        emailHtml += `
          <div style="margin-top: 12px; padding: 10px; background-color: #fffaf0; border: 1px solid #feebc8; border-radius: 8px; color: #c05621;">
            📝 <strong>Faculty Consultation Note:</strong><br/>
            ${populated.facultyNotes}
          </div>
        `;
      }

      emailHtml += `
          </div>
          <p style="font-size: 14px; color: #718096;">Please log in to your portal to review details or confirm scheduling options.</p>
          <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
          <p style="font-size: 11px; color: #a0aec0; text-align: center; margin: 0;">EduMentor AI Scheduler System</p>
        </div>
      `;

      sendEmail({
        email: studentEmail,
        subject: `Appointment Status Update: ${status}`,
        text: emailText,
        html: emailHtml
      }).catch(err => console.error('Failed to send appointment status update email:', err));
    }

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

    const populated = await Appointment.findById(id)
      .populate('student', 'name email')
      .populate('faculty', 'name email');

    if (populated && populated.faculty && populated.student) {
      sendEmail({
        email: (populated.faculty as any).email,
        subject: 'Appointment Consultation Cancelled ❌',
        text: `Hello ${(populated.faculty as any).name},\n\nThe appointment consultation request from ${(populated.student as any).name} scheduled on ${new Date(populated.date).toLocaleDateString()} has been cancelled by the student.`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1a202c;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #e53e3e; margin: 0; font-size: 24px; font-weight: 700;">Appointment Cancelled ❌</h2>
            </div>
            <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
            <p style="font-size: 15px;">Hello <strong>${(populated.faculty as any).name}</strong>,</p>
            <p style="font-size: 15px; color: #4a5568;">This is to notify you that the consultation appointment request from <strong>${(populated.student as any).name}</strong> scheduled for <strong>${new Date(populated.date).toLocaleDateString()}</strong> at <strong>${populated.timeSlot}</strong> has been cancelled by the student.</p>
            <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
            <p style="font-size: 11px; color: #a0aec0; text-align: center; margin: 0;">EduMentor AI Scheduler System</p>
          </div>
        `
      }).catch(err => console.error('Failed to send appointment cancellation email:', err));
    }

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
