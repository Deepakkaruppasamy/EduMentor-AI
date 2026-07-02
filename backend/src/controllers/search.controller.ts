import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Course from '../models/Course';
import GeneratedNote from '../models/GeneratedNote';
import CalendarEvent from '../models/CalendarEvent';
import Announcement from '../models/Announcement';
import AssignmentEvaluation from '../models/AssignmentEvaluation';
import Chat from '../models/Chat';
import DiscussionBoard from '../models/messaging/DiscussionBoard';
import SupportTicket from '../models/support/SupportTicket';
import ResearchHistory from '../models/ResearchHistory';
import Appointment from '../models/Appointment';

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

    const [
      courses,
      users,
      notes,
      events,
      announcements,
      assignments,
      chats,
      discussions,
      tickets,
      research,
      meetings
    ] = await Promise.all([
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

      // Assignments (evaluations)
      AssignmentEvaluation.find(
        role === 'student'
          ? { studentId: userId, fileName: regex }
          : { fileName: regex }
      )
        .select('fileName createdAt')
        .limit(5),

      // Chat history (AI chat)
      Chat.find({
        user: userId,
        title: regex
      })
        .select('title totalMessages updatedAt')
        .limit(5),

      // Discussions
      DiscussionBoard.find({
        title: regex
      })
        .select('title category lastReplyAt')
        .limit(5),

      // Support tickets
      SupportTicket.find(
        role === 'admin'
          ? { $or: [{ subject: regex }, { description: regex }] }
          : { user: userId, $or: [{ subject: regex }, { description: regex }] }
      )
        .select('subject category status priority')
        .limit(5),

      // Research History (Papers matching name)
      ResearchHistory.find({
        user: userId,
        'papers.originalName': regex
      })
        .select('papers feature createdAt')
        .limit(5),

      // Appointments (Meetings)
      Appointment.find({
        $or: [{ student: userId }, { faculty: userId }],
        purpose: regex
      })
        .select('purpose date timeSlot status')
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
        assignments: assignments.map(a => ({ ...a.toObject(), title: a.fileName, _type: 'Assignment', _route: '/assignment-evaluator' })),
        chats: chats.map(c => ({ ...c.toObject(), _type: 'Chat', _route: '/chat' })),
        discussions: discussions.map(d => ({ ...d.toObject(), title: d.title, _type: 'Discussion', _route: '/messages' })),
        tickets: tickets.map(t => ({ ...t.toObject(), title: t.subject, _type: 'Ticket', _route: '/support' })),
        research: research.map(r => ({
          ...r.toObject(),
          title: r.papers.map((p: any) => p.originalName).join(', ') || `Research (${r.feature})`,
          _type: 'Research',
          _route: '/research-assistant'
        })),
        meetings: meetings.map(m => ({
          ...m.toObject(),
          title: `Meeting: ${m.purpose}`,
          description: `${new Date(m.date).toLocaleDateString()} at ${m.timeSlot} (${m.status})`,
          _type: 'Meeting',
          _route: '/meetings'
        })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
