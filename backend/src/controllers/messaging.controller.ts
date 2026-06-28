import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import Conversation from '../models/messaging/Conversation';
import Message from '../models/messaging/Message';
import DiscussionBoard from '../models/messaging/DiscussionBoard';
import DiscussionReply from '../models/messaging/DiscussionReply';
import MessagingNotification from '../models/messaging/MessagingNotification';
import User from '../models/User';
import Course from '../models/Course';
import Chat from '../models/Chat';
import Quiz from '../models/Quiz';
import { getMessagingIO } from '../services/messaging-socket.service';

// ──────────────────────────────────────────────────────────────
// PRIVATE CHAT — Conversations
// ──────────────────────────────────────────────────────────────

/** List all conversations for the logged-in user */
export const getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'name email avatar role department profileImage useCustomPhoto')
      .populate({
        path: 'lastMessage',
        select: 'content messageType sender createdAt readBy',
        populate: { path: 'sender', select: 'name' },
      })
      .sort({ lastMessageAt: -1 });

    // Attach unread count per conversation
    const result = await Promise.all(
      conversations.map(async (conv) => {
        const unread = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: userId },
          'readBy.user': { $ne: userId },
          deletedFor: { $ne: userId },
        });
        return { ...conv.toObject(), unreadCount: unread };
      })
    );

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Start or get existing conversation with another user */
export const startConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { participantId } = req.body;

    if (!participantId) {
      res.status(400).json({ success: false, message: 'participantId is required' });
      return;
    }

    if (userId.toString() === participantId) {
      res.status(400).json({ success: false, message: 'Cannot start conversation with yourself' });
      return;
    }

    // Check other user exists
    const otherUser = await User.findById(participantId);
    if (!otherUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, participantId], $size: 2 },
    })
      .populate('participants', 'name email avatar role department profileImage useCustomPhoto')
      .populate({
        path: 'lastMessage',
        select: 'content messageType sender createdAt',
        populate: { path: 'sender', select: 'name' },
      });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, participantId],
      });
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'name email avatar role department profileImage useCustomPhoto');
    }

    res.json({ success: true, data: conversation });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Get paginated messages for a conversation */
export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    // Verify user is a participant
    const conversation = await Conversation.findOne({
      _id: id,
      participants: userId,
    });
    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversation not found' });
      return;
    }

    const total = await Message.countDocuments({
      conversation: id,
      deletedFor: { $ne: userId },
    });

    const messages = await Message.find({
      conversation: id,
      deletedFor: { $ne: userId },
    })
      .populate('sender', 'name email avatar role profileImage useCustomPhoto')
      .populate({
        path: 'replyTo',
        select: 'content sender messageType createdAt',
        populate: { path: 'sender', select: 'name' },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      data: messages.reverse(), // Chronological order
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Send a private message */
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.isMessagingRestricted) {
      res.status(403).json({ success: false, message: 'Your messaging privileges have been restricted by the administrator.' });
      return;
    }
    const userId = req.user!._id;
    const { conversationId, content, messageType = 'text', replyTo, attachments } = req.body;

    // Verify user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });
    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversation not found' });
      return;
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: userId,
      content: content || '',
      messageType,
      replyTo: replyTo || undefined,
      attachments: attachments || [],
    });

    // Update conversation
    conversation.lastMessage = message._id as mongoose.Types.ObjectId;
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();

    // Populate for response
    const populated = await Message.findById(message._id)
      .populate('sender', 'name email avatar role profileImage useCustomPhoto')
      .populate({
        path: 'replyTo',
        select: 'content sender messageType createdAt',
        populate: { path: 'sender', select: 'name' },
      });

    // Emit real-time event
    try {
      const io = getMessagingIO();
      io.to(`conv_${conversationId}`).emit('msg:new_message', populated);

      // Send delivery status
      const recipientId = conversation.participants.find(
        (p) => p.toString() !== userId.toString()
      );
      if (recipientId) {
        io.to(`user_${recipientId}`).emit('msg:notification', {
          type: 'private_message',
          title: `New message from ${req.user!.name}`,
          body: content?.substring(0, 100) || `Sent ${messageType}`,
          conversationId,
          messageId: message._id,
        });

        // Create notification
        await MessagingNotification.create({
          recipient: recipientId,
          type: 'private_message',
          title: `New message from ${req.user!.name}`,
          body: content?.substring(0, 100) || `Sent ${messageType}`,
          relatedConversation: conversationId,
          relatedMessage: message._id,
        });
      }
    } catch (_) {
      // Socket not initialized, continue
    }

    res.status(201).json({ success: true, data: populated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Edit a message (within 5 minutes) */
export const editMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.isMessagingRestricted) {
      res.status(403).json({ success: false, message: 'Your messaging privileges have been restricted by the administrator.' });
      return;
    }
    const userId = req.user!._id;
    const { id } = req.params;
    const { content } = req.body;

    const message = await Message.findById(id);
    if (!message) {
      res.status(404).json({ success: false, message: 'Message not found' });
      return;
    }

    if (message.sender.toString() !== userId.toString()) {
      res.status(403).json({ success: false, message: 'You can only edit your own messages' });
      return;
    }

    // Check 5-minute window
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() - message.createdAt.getTime() > fiveMinutes) {
      res.status(400).json({ success: false, message: 'Edit window (5 minutes) has expired' });
      return;
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const populated = await Message.findById(id)
      .populate('sender', 'name email avatar role profileImage useCustomPhoto');

    // Emit real-time update
    try {
      const io = getMessagingIO();
      io.to(`conv_${message.conversation}`).emit('msg:edited', populated);
    } catch (_) {}

    res.json({ success: true, data: populated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Delete a message for self */
export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) {
      res.status(404).json({ success: false, message: 'Message not found' });
      return;
    }

    // Add user to deletedFor list
    if (!message.deletedFor.some((u) => u.toString() === userId.toString())) {
      message.deletedFor.push(userId);
      await message.save();
    }

    // Emit real-time update
    try {
      const io = getMessagingIO();
      io.to(`conv_${message.conversation}`).emit('msg:deleted', {
        messageId: id,
        deletedBy: userId,
      });
    } catch (_) {}

    res.json({ success: true, message: 'Message deleted for you' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Pin / Unpin a message (faculty only) */
export const togglePinMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) {
      res.status(404).json({ success: false, message: 'Message not found' });
      return;
    }

    message.isPinned = !message.isPinned;
    message.pinnedBy = message.isPinned ? userId : undefined;
    await message.save();

    const populated = await Message.findById(id)
      .populate('sender', 'name email avatar role profileImage useCustomPhoto')
      .populate('pinnedBy', 'name');

    // Emit real-time update
    try {
      const io = getMessagingIO();
      io.to(`conv_${message.conversation}`).emit('msg:pinned', populated);
    } catch (_) {}

    res.json({ success: true, data: populated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Search messages across conversations */
export const searchMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { q, conversationId, startDate, endDate } = req.query;

    if (!q || (q as string).trim().length === 0) {
      res.status(400).json({ success: false, message: 'Search query is required' });
      return;
    }

    // Get user's conversation IDs
    let conversationIds: mongoose.Types.ObjectId[];
    if (conversationId) {
      const conv = await Conversation.findOne({ _id: conversationId, participants: userId });
      if (!conv) {
        res.status(404).json({ success: false, message: 'Conversation not found' });
        return;
      }
      conversationIds = [conv._id as mongoose.Types.ObjectId];
    } else {
      const convos = await Conversation.find({ participants: userId }).select('_id');
      conversationIds = convos.map((c) => c._id as mongoose.Types.ObjectId);
    }

    const filter: any = {
      conversation: { $in: conversationIds },
      deletedFor: { $ne: userId },
      content: { $regex: q as string, $options: 'i' },
    };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    const messages = await Message.find(filter)
      .populate('sender', 'name email avatar role profileImage useCustomPhoto')
      .populate('conversation')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: messages });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ──────────────────────────────────────────────────────────────
// USER LISTS
// ──────────────────────────────────────────────────────────────

/** Get all faculty members (for students to select) */
export const getFacultyList = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const faculty = await User.find({ role: 'faculty', isActive: true })
      .select('name email avatar department profileImage useCustomPhoto')
      .sort({ name: 1 });
    res.json({ success: true, data: faculty });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Get students in faculty's courses */
export const getStudentList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;

    // Find courses where this faculty is assigned
    const courses = await Course.find({ faculty: userId }).select('students');
    const studentIds = [...new Set(courses.flatMap((c) => c.students.map((s) => s.toString())))];

    const students = await User.find({
      _id: { $in: studentIds },
      isActive: true,
    })
      .select('name email avatar department semester profileImage useCustomPhoto')
      .sort({ name: 1 });

    res.json({ success: true, data: students });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ──────────────────────────────────────────────────────────────
// FILE UPLOADS
// ──────────────────────────────────────────────────────────────

/** Upload image attachment */
export const uploadImageHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No image file uploaded' });
      return;
    }
    const url = `/uploads/messaging/images/${req.file.filename}`;
    res.json({
      success: true,
      data: {
        url,
        filename: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Upload audio attachment */
export const uploadAudioHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No audio file uploaded' });
      return;
    }
    const url = `/uploads/messaging/audio/${req.file.filename}`;
    res.json({
      success: true,
      data: {
        url,
        filename: req.file.originalname || 'voice-message.webm',
        fileType: req.file.mimetype,
        fileSize: req.file.size,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Upload file attachment */
export const uploadFileHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }
    const url = `/uploads/messaging/files/${req.file.filename}`;
    res.json({
      success: true,
      data: {
        url,
        filename: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ──────────────────────────────────────────────────────────────
// DISCUSSION BOARDS
// ──────────────────────────────────────────────────────────────

/** Get discussions for a course */
export const getCourseDiscussions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const { category, resolved } = req.query;

    const filter: any = { course: courseId };
    if (category) filter.category = category;
    if (resolved !== undefined) filter.isResolved = resolved === 'true';

    const discussions = await DiscussionBoard.find(filter)
      .populate('author', 'name email avatar role profileImage useCustomPhoto')
      .populate('resolvedBy', 'name')
      .sort({ lastReplyAt: -1, createdAt: -1 });

    res.json({ success: true, data: discussions });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Create a new discussion */
export const createDiscussion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.isMessagingRestricted) {
      res.status(403).json({ success: false, message: 'Your messaging privileges have been restricted by the administrator.' });
      return;
    }
    const userId = req.user!._id;
    const { courseId, title, content, category } = req.body;

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }

    const discussion = await DiscussionBoard.create({
      course: courseId,
      author: userId,
      title,
      content,
      category: category || 'General Questions',
    });

    const populated = await DiscussionBoard.findById(discussion._id)
      .populate('author', 'name email avatar role profileImage useCustomPhoto');

    // Notify faculty and students in the course
    try {
      const io = getMessagingIO();
      io.to(`course_disc_${courseId}`).emit('disc:new_discussion', populated);
    } catch (_) {}

    res.status(201).json({ success: true, data: populated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Get single discussion with replies */
export const getDiscussion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const discussion = await DiscussionBoard.findById(id)
      .populate('author', 'name email avatar role profileImage useCustomPhoto')
      .populate('resolvedBy', 'name');

    if (!discussion) {
      res.status(404).json({ success: false, message: 'Discussion not found' });
      return;
    }

    const replies = await DiscussionReply.find({ discussion: id })
      .populate('author', 'name email avatar role profileImage useCustomPhoto')
      .sort({ createdAt: 1 });

    res.json({ success: true, data: { discussion, replies } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Reply to a discussion */
export const replyToDiscussion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.isMessagingRestricted) {
      res.status(403).json({ success: false, message: 'Your messaging privileges have been restricted by the administrator.' });
      return;
    }
    const userId = req.user!._id;
    const { id } = req.params;
    const { content, parentReplyId, messageType = 'text', attachments } = req.body;

    const discussion = await DiscussionBoard.findById(id);
    if (!discussion) {
      res.status(404).json({ success: false, message: 'Discussion not found' });
      return;
    }

    let depth = 0;
    if (parentReplyId) {
      const parent = await DiscussionReply.findById(parentReplyId);
      if (parent) depth = parent.depth + 1;
    }

    const reply = await DiscussionReply.create({
      discussion: id,
      author: userId,
      content,
      messageType,
      attachments: attachments || [],
      parentReply: parentReplyId || undefined,
      depth,
    });

    // Update discussion reply count
    discussion.replyCount += 1;
    discussion.lastReplyAt = new Date();
    await discussion.save();

    const populated = await DiscussionReply.findById(reply._id)
      .populate('author', 'name email avatar role profileImage useCustomPhoto');

    // Emit real-time update
    try {
      const io = getMessagingIO();
      io.to(`disc_${id}`).emit('disc:new_reply', populated);

      // Notify the discussion author
      if (discussion.author.toString() !== userId.toString()) {
        const notifType = req.user!.role === 'faculty' ? 'faculty_replied' : 'student_replied';
        await MessagingNotification.create({
          recipient: discussion.author,
          type: notifType,
          title: `${req.user!.name} replied to your discussion`,
          body: content?.substring(0, 100) || 'New reply',
          relatedDiscussion: id,
        });
        io.to(`user_${discussion.author}`).emit('msg:notification', {
          type: notifType,
          title: `${req.user!.name} replied to your discussion`,
          body: content?.substring(0, 100),
          discussionId: id,
        });
      }
    } catch (_) {}

    res.status(201).json({ success: true, data: populated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Mark discussion as resolved */
export const resolveDiscussion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const discussion = await DiscussionBoard.findById(id);
    if (!discussion) {
      res.status(404).json({ success: false, message: 'Discussion not found' });
      return;
    }

    discussion.isResolved = !discussion.isResolved;
    discussion.resolvedBy = discussion.isResolved ? userId : undefined;
    discussion.resolvedAt = discussion.isResolved ? new Date() : undefined;
    await discussion.save();

    const populated = await DiscussionBoard.findById(id)
      .populate('author', 'name email avatar role profileImage useCustomPhoto')
      .populate('resolvedBy', 'name');

    // Emit + notify
    try {
      const io = getMessagingIO();
      io.to(`disc_${id}`).emit('disc:resolved', populated);
      io.to(`course_disc_${discussion.course}`).emit('disc:updated', populated);

      if (discussion.isResolved && discussion.author.toString() !== userId.toString()) {
        await MessagingNotification.create({
          recipient: discussion.author,
          type: 'discussion_resolved',
          title: 'Discussion resolved',
          body: `"${discussion.title}" was marked as resolved`,
          relatedDiscussion: id,
        });
      }
    } catch (_) {}

    res.json({ success: true, data: populated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ──────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ──────────────────────────────────────────────────────────────

/** Get user's messaging notifications */
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const notifications = await MessagingNotification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, data: notifications });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Mark all notifications as read */
export const markAllNotificationsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    await MessagingNotification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Mark single notification as read */
export const markNotificationRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await MessagingNotification.findByIdAndUpdate(id, { isRead: true });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ──────────────────────────────────────────────────────────────
// ADMIN MODERATION
// ──────────────────────────────────────────────────────────────

/** List all conversations in the system */
export const getConversationsAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversations = await Conversation.find()
      .populate('participants', 'name email avatar role department profileImage useCustomPhoto isMessagingRestricted')
      .populate({
        path: 'lastMessage',
        select: 'content messageType sender createdAt',
        populate: { path: 'sender', select: 'name' },
      })
      .sort({ lastMessageAt: -1 });

    res.json({ success: true, data: conversations });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Get messages in any conversation */
export const getMessagesAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const messages = await Message.find({ conversation: id })
      .populate('sender', 'name email avatar role profileImage useCustomPhoto')
      .sort({ createdAt: 1 });

    res.json({ success: true, data: messages });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Hard delete any message as administrator */
export const deleteMessageAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const message = await Message.findByIdAndDelete(id);
    if (!message) {
      res.status(404).json({ success: false, message: 'Message not found' });
      return;
    }

    const conversation = await Conversation.findById(message.conversation);
    if (conversation && conversation.lastMessage?.toString() === id) {
      const prevMessage = await Message.findOne({ conversation: message.conversation }).sort({ createdAt: -1 });
      conversation.lastMessage = prevMessage?._id as any;
      conversation.lastMessageAt = prevMessage?.createdAt || new Date();
      await conversation.save();
    }

    try {
      const io = getMessagingIO();
      io.to(`conv_${message.conversation}`).emit('msg:deleted', { messageId: id, adminDeleted: true });
    } catch (_) {}

    res.json({ success: true, message: 'Message deleted by administrator' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Delete a public discussion */
export const deleteDiscussionAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const discussion = await DiscussionBoard.findByIdAndDelete(id);
    if (!discussion) {
      res.status(404).json({ success: false, message: 'Discussion not found' });
      return;
    }

    await DiscussionReply.deleteMany({ discussion: id });

    try {
      const io = getMessagingIO();
      io.to(`course_disc_${discussion.course}`).emit('disc:deleted', { discussionId: id });
    } catch (_) {}

    res.json({ success: true, message: 'Discussion board post deleted by administrator' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Delete a discussion reply */
export const deleteDiscussionReplyAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const reply = await DiscussionReply.findByIdAndDelete(id);
    if (!reply) {
      res.status(404).json({ success: false, message: 'Reply not found' });
      return;
    }

    await DiscussionBoard.findByIdAndUpdate(reply.discussion, { $inc: { replyCount: -1 } });

    try {
      const io = getMessagingIO();
      io.to(`disc_${reply.discussion}`).emit('disc:reply_deleted', { replyId: id });
    } catch (_) {}

    res.json({ success: true, message: 'Discussion reply deleted by administrator' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Toggle user's messaging permission status */
export const restrictUserMessaging = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { restrict } = req.body;

    const userToUpdate = await User.findById(id);
    if (!userToUpdate) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    userToUpdate.isMessagingRestricted = !!restrict;
    await userToUpdate.save();

    res.json({
      success: true,
      message: `User messaging has been ${restrict ? 'restricted' : 'allowed'}`,
      data: userToUpdate,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** List all AI Chat sessions in the system */
export const getChatSessionsAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sessions = await Chat.find()
      .populate('user', 'name email role')
      .populate('course', 'title code')
      .sort({ updatedAt: -1 });
    res.json({ success: true, data: sessions });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Get messages in a specific AI chat session */
export const getChatMessagesAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const chat = await Chat.findById(id)
      .populate('user', 'name email role')
      .populate('course', 'title code');
    if (!chat) {
      res.status(404).json({ success: false, message: 'Chat session not found' });
      return;
    }
    res.json({ success: true, data: chat });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Delete a student AI chat session */
export const deleteChatAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const chat = await Chat.findByIdAndDelete(id);
    if (!chat) {
      res.status(404).json({ success: false, message: 'Chat session not found' });
      return;
    }
    res.json({ success: true, message: 'AI Chat session deleted by administrator' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** List all student Quiz attempts */
export const getQuizzesAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quizzes = await Quiz.find()
      .populate('student', 'name email role')
      .populate('course', 'title code')
      .populate('assignedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: quizzes });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Get specific quiz detail */
export const getQuizDetailAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id)
      .populate('student', 'name email role')
      .populate('course', 'title code');
    if (!quiz) {
      res.status(404).json({ success: false, message: 'Quiz record not found' });
      return;
    }
    res.json({ success: true, data: quiz });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Delete a student quiz record */
export const deleteQuizAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findByIdAndDelete(id);
    if (!quiz) {
      res.status(404).json({ success: false, message: 'Quiz record not found' });
      return;
    }
    res.json({ success: true, message: 'Quiz record deleted by administrator' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};


