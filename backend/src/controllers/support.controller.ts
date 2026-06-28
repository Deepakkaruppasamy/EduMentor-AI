import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import SupportTicket from '../models/support/SupportTicket';
import SupportMessage from '../models/support/SupportMessage';
import SupportFeedback from '../models/support/SupportFeedback';
import SupportAnnouncement from '../models/support/SupportAnnouncement';
import SupportNotification from '../models/support/SupportNotification';
import TicketHistory from '../models/support/TicketHistory';
import User from '../models/User';
import { generateWithoutContext } from '../services/ai/groq.service';
import { getSupportIO } from '../services/support-socket.service';

// ──────────────────────────────────────────────────────────────
// AI SUPPORT BOT CHAT
// ──────────────────────────────────────────────────────────────

const SUPPORT_BOT_PROMPT = `You are the EduMentor Platform Support Bot.
Your goal is to answer platform-related issues, assist with site navigation, document uploads, quiz generation settings, user profiles, resets, and ticket creations.
Strict Guidelines:
1. Under no circumstances should you answer academic questions, scientific queries, math problems, coding assignments, or course-related contents.
2. If the user asks an academic or study-related question, you MUST refuse strictly and direct them to use the "AI Chat Tutor" page or their course "Discussion Boards".
3. Keep your response helpful, concise, and professional.
4. Greet the user, acknowledge their name and role.
5. If the user is expressing unresolved technical issues or explicitly requests escalation, explain how to file a support ticket or offer to automatically start one.`;

/** Query the Support AI Bot */
export const querySupportChat = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ success: false, message: 'Messages array is required.' });
      return;
    }

    const userName = req.user!.name;
    const userRole = req.user!.role;

    const systemPromptOverride = `${SUPPORT_BOT_PROMPT}\n\nCurrent User: Name is ${userName}, Role is ${userRole}.`;

    // Call Groq Llama model directly
    const aiResponse = await generateWithoutContext(messages, systemPromptOverride, 0.4);

    res.json({
      success: true,
      data: {
        content: aiResponse.content,
        role: 'assistant',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ──────────────────────────────────────────────────────────────
// TICKETS MANAGEMENT
// ──────────────────────────────────────────────────────────────

/** Create a support ticket */
export const createTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { subject, description, category, priority = 'Medium' } = req.body;

    // Generate SUP-YYYY-XXXXXX ticket ID
    const year = new Date().getFullYear();
    const count = await SupportTicket.countDocuments();
    const formattedNum = String(count + 1).padStart(6, '0');
    const ticketId = `SUP-${year}-${formattedNum}`;

    const ticket = await SupportTicket.create({
      ticketId,
      user: userId,
      subject,
      description,
      category,
      priority,
      status: 'Open',
    });

    // Add initial message thread
    await SupportMessage.create({
      ticket: ticket._id,
      sender: userId,
      senderName: req.user!.name,
      role: req.user!.role as any,
      content: description,
    });

    const populated = await SupportTicket.findById(ticket._id).populate('user', 'name email role');

    // Notify Super Admin
    try {
      const io = getSupportIO();
      io.to('admin_room').emit('ticket:created', populated);

      // Create Admin Notifications
      const admins = await User.find({ role: 'admin' }).select('_id');
      const notifications = admins.map((admin) => ({
        recipient: admin._id,
        type: 'ticket_created',
        title: `New Support Ticket ${ticketId}`,
        body: `Created by ${req.user!.name}: "${subject}"`,
        relatedTicket: ticket._id,
      }));
      await SupportNotification.insertMany(notifications);
    } catch (_) {}

    res.status(201).json({ success: true, data: populated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Get support tickets */
export const getTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const isSuperAdmin = req.user!.role === 'admin';

    const filter = isSuperAdmin ? {} : { user: userId };
    const tickets = await SupportTicket.find(filter)
      .populate('user', 'name email role')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: tickets });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Get ticket details with timeline and replies */
export const getTicketDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;
    const isSuperAdmin = req.user!.role === 'admin';

    const ticket = await SupportTicket.findById(id)
      .populate('user', 'name email role')
      .populate('assignedTo', 'name email');

    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }

    // Verify user owns ticket or is admin
    if (!isSuperAdmin && ticket.user._id.toString() !== userId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const messages = await SupportMessage.find({ ticket: id }).sort({ createdAt: 1 });
    const timeline = await TicketHistory.find({ ticket: id }).sort({ createdAt: 1 });

    res.json({
      success: true,
      data: {
        ticket,
        messages,
        timeline,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Reply to a support ticket */
export const replyToTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user!._id;
    const isSuperAdmin = req.user!.role === 'admin';

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }

    // Verify user owns ticket or is admin
    if (!isSuperAdmin && ticket.user.toString() !== userId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const message = await SupportMessage.create({
      ticket: id,
      sender: userId,
      senderName: req.user!.name,
      role: req.user!.role as any,
      content,
    });

    // If admin replies, notify the owner user & change status
    if (isSuperAdmin) {
      ticket.status = 'Waiting for User';
      await ticket.save();

      // Create notification
      await SupportNotification.create({
        recipient: ticket.user,
        type: 'admin_reply',
        title: `Reply on ticket ${ticket.ticketId}`,
        body: `Admin replied: "${content.substring(0, 80)}"`,
        relatedTicket: ticket._id,
      });

      // Log status change history
      await TicketHistory.create({
        ticket: ticket._id,
        changedBy: userId,
        changedByName: req.user!.name,
        field: 'status',
        oldValue: 'Open',
        newValue: 'Waiting for User',
      });
    } else {
      // User replies, if status was waiting for user, set it back to open/in progress
      if (ticket.status === 'Waiting for User') {
        ticket.status = 'Open';
        await ticket.save();
      }
    }

    // Socket emit
    try {
      const io = getSupportIO();
      io.to(`ticket_${id}`).emit('ticket:new_message', message);
      io.to(`ticket_${id}`).emit('ticket:status_change', ticket);
    } catch (_) {}

    res.status(201).json({ success: true, data: message });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Update ticket details (Admin only) */
export const updateTicketAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, priority, assignedToId } = req.body;
    const userId = req.user!._id;

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }

    const oldStatus = ticket.status;
    const oldPriority = ticket.priority;
    const oldAssigned = ticket.assignedTo?.toString() || 'Unassigned';

    if (status) {
      ticket.status = status;
      if (status === 'Resolved') {
        ticket.resolvedAt = new Date();
      } else if (status === 'Closed') {
        ticket.closedAt = new Date();
      }
    }
    if (priority) ticket.priority = priority;
    if (assignedToId !== undefined) {
      ticket.assignedTo = assignedToId || undefined;
    }

    await ticket.save();

    // Log history changes
    if (status && status !== oldStatus) {
      await TicketHistory.create({
        ticket: ticket._id,
        changedBy: userId,
        changedByName: req.user!.name,
        field: 'status',
        oldValue: oldStatus,
        newValue: status,
      });

      // Notification to user
      await SupportNotification.create({
        recipient: ticket.user,
        type: status === 'Resolved' ? 'ticket_resolved' : 'ticket_updated',
        title: `Ticket ${ticket.ticketId} updated`,
        body: `Status is now ${status}`,
        relatedTicket: ticket._id,
      });
    }

    if (priority && priority !== oldPriority) {
      await TicketHistory.create({
        ticket: ticket._id,
        changedBy: userId,
        changedByName: req.user!.name,
        field: 'priority',
        oldValue: oldPriority,
        newValue: priority,
      });
    }

    if (assignedToId !== undefined && assignedToId?.toString() !== oldAssigned) {
      const newAssignedName = assignedToId
        ? (await User.findById(assignedToId))?.name || 'Assigned'
        : 'Unassigned';

      await TicketHistory.create({
        ticket: ticket._id,
        changedBy: userId,
        changedByName: req.user!.name,
        field: 'assignedTo',
        oldValue: oldAssigned,
        newValue: newAssignedName,
      });
    }

    const populated = await SupportTicket.findById(ticket._id)
      .populate('user', 'name email role')
      .populate('assignedTo', 'name email');

    // Socket emit
    try {
      const io = getSupportIO();
      io.to(`ticket_${id}`).emit('ticket:status_change', populated);
    } catch (_) {}

    res.json({ success: true, data: populated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ──────────────────────────────────────────────────────────────
// FEEDBACK RATINGS
// ──────────────────────────────────────────────────────────────

/** Submit CSAT Rating Feedback for a ticket */
export const submitFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { ticketId, rating, comments } = req.body;

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }

    // If "Not Resolved", automatically reopen or log status
    if (rating === 'Not Resolved') {
      ticket.status = 'Open';
      await ticket.save();

      await TicketHistory.create({
        ticket: ticket._id,
        changedBy: userId,
        changedByName: req.user!.name,
        field: 'status',
        oldValue: 'Resolved',
        newValue: 'Open',
      });
    }

    const feedback = await SupportFeedback.create({
      ticket: ticketId,
      user: userId,
      rating,
      comments,
    });

    res.status(201).json({ success: true, data: feedback });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ──────────────────────────────────────────────────────────────
// ANNOUNCEMENTS
// ──────────────────────────────────────────────────────────────

/** Create Support announcement */
export const createAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, content, targetRole = 'all' } = req.body;

    const announcement = await SupportAnnouncement.create({
      title,
      content,
      targetRole,
      isActive: true,
    });

    // Socket Emit
    try {
      const io = getSupportIO();
      io.emit('support:new_announcement', announcement);
    } catch (_) {}

    res.status(201).json({ success: true, data: announcement });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Get active Support announcements */
export const getAnnouncements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = req.user!.role;
    const announcements = await SupportAnnouncement.find({
      isActive: true,
      targetRole: { $in: ['all', role] },
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: announcements });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ──────────────────────────────────────────────────────────────
// ANALYTICS & CSAT METRICS
// ──────────────────────────────────────────────────────────────

/** Support center analytics (Super Admin dashboard) */
export const getSupportAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalTickets = await SupportTicket.countDocuments();
    const openTickets = await SupportTicket.countDocuments({ status: { $in: ['Open', 'In Progress', 'Waiting for User'] } });
    const resolvedTickets = await SupportTicket.countDocuments({ status: 'Resolved' });
    const closedTickets = await SupportTicket.countDocuments({ status: 'Closed' });
    const criticalTickets = await SupportTicket.countDocuments({ priority: 'Critical' });

    // Category breakdown
    const categoryStats = await SupportTicket.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    // Feedback rating breakdown
    const ratings = await SupportFeedback.aggregate([
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]);

    // Role breakdown
    const roleStats = await SupportTicket.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: '$userInfo' },
      { $group: { _id: '$userInfo.role', count: { $sum: 1 } } },
    ]);

    // CSAT calculation
    const ratingValues: Record<string, number> = { Excellent: 5, Good: 4, Average: 3, Poor: 2, 'Not Resolved': 1 };
    const allFeedback = await SupportFeedback.find();
    let csatScore = 0;
    if (allFeedback.length > 0) {
      const sum = allFeedback.reduce((acc, f) => acc + (ratingValues[f.rating] || 0), 0);
      csatScore = Math.round((sum / (allFeedback.length * 5)) * 100);
    }

    res.json({
      success: true,
      data: {
        totalTickets,
        openTickets,
        resolvedTickets,
        closedTickets,
        criticalTickets,
        csatScore,
        categories: categoryStats,
        feedbackRatings: ratings,
        roleStats,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
