import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Course from '../models/Course';
import GeneratedNote from '../models/GeneratedNote';
import CalendarEvent from '../models/CalendarEvent';
import Announcement from '../models/Announcement';

export const globalSearch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || (q as string).trim().length < 2) {
      res.json({ success: true, data: {} });
      return;
    }

    const query = (q as string).trim();
    const role = req.user!.role;
    const userId = req.user!._id;
    const regex = new RegExp(query, 'i');

    const [courses, users, notes, events, announcements] = await Promise.all([
      // Courses
      Course.find({ $or: [{ title: regex }, { description: regex }] })
        .select('title description')
        .limit(5),

      // Users (admin can search all, others only faculty)
      User.find({
        isActive: true,
        role: role === 'admin' ? { $in: ['student', 'faculty', 'admin'] } : 'faculty',
        $or: [{ name: regex }, { email: regex }, { department: regex }],
      })
        .select('name email role department')
        .limit(5),

      // Notes (own notes)
      GeneratedNote.find({
        user: userId,
        $or: [{ topic: regex }, { courseName: regex }],
      })
        .select('topic courseName noteType createdAt')
        .limit(5),

      // Calendar events
      CalendarEvent.find({
        targetRoles: role,
        $or: [{ title: regex }, { description: regex }],
      })
        .select('title type startDate')
        .limit(5),

      // Announcements
      Announcement.find({
        isActive: true,
        targetRoles: role,
        $or: [{ title: regex }, { content: regex }],
      })
        .select('title type priority createdAt')
        .limit(5),
    ]);

    res.json({
      success: true,
      data: {
        courses: courses.map(c => ({ ...c.toObject(), _type: 'Course', _route: '/courses' })),
        users: users.map(u => ({ ...u.toObject(), _type: 'User', _route: role === 'student' ? '/office-hours' : '/admin/users' })),
        notes: notes.map(n => ({ ...n.toObject(), _type: 'Note', _route: '/notes-generator' })),
        events: events.map(e => ({ ...e.toObject(), _type: 'Event', _route: '/calendar' })),
        announcements: announcements.map(a => ({ ...a.toObject(), _type: 'Announcement', _route: '/announcements' })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
