import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Announcement from '../models/Announcement';
import AnnouncementRead from '../models/AnnouncementRead';
import User from '../models/User';
import { sendEmail } from '../utils/email';
import { sendInAppNotification } from '../services/socket.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Multer for announcement attachments
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = 'uploads/announcements';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `ann-${suffix}${path.extname(file.originalname)}`);
  },
});

export const announcementUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type.'));
    }
  },
});

export const createAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { title, content, type, priority, targetRoles, scheduledAt, expiresAt } = req.body;

    const attachments = (req.files as Express.Multer.File[] || []).map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      filePath: f.path,
      mimeType: f.mimetype,
    }));

    const parsedTargetRoles = typeof targetRoles === 'string' ? JSON.parse(targetRoles) : (targetRoles || ['student', 'faculty', 'admin']);

    const announcement = await Announcement.create({
      title,
      content,
      type: type || 'General',
      priority: priority || 'Medium',
      targetRoles: parsedTargetRoles,
      createdBy: userId,
      attachments,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isActive: true,
    });

    const populated = await Announcement.findById(announcement._id).populate('createdBy', 'name email role');

    // Email & In-App broadcast for high-priority/urgent announcements
    if (priority === 'Urgent' || priority === 'High') {
      User.find({ role: { $in: parsedTargetRoles }, isActive: true })
        .select('name email')
        .then(users => {
          users.forEach(user => {
            // Trigger in-app notification bell entry
            sendInAppNotification(user._id.toString(), {
              type: 'announcement',
              title: `📢 URGENT: ${title}`,
              message: content.substring(0, 80),
              link: '/announcements',
            });

            sendEmail({
              email: user.email,
              subject: `URGENT NOTICE: ${title} 📢`,
              text: `Hello ${user.name},\n\nAn urgent announcement has been posted by ${(populated?.createdBy as any)?.name || 'Platform'}.\n\nAnnouncement Details:\n- Title: ${title}\n- Category: ${type || 'General'}\n- Priority: ${priority}\n\nContent:\n${content}\n\nPlease log in to EduMentor AI to read the full bulletin.`,
              html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #feb2b2; border-radius: 16px; background-color: #fff5f5; color: #742a2a;">
                  <div style="text-align: center; margin-bottom: 20px;">
                    <span style="font-size: 40px;">📢</span>
                    <h2 style="color: #9b2c2c; margin: 10px 0 0 0; font-size: 24px; font-weight: 800;">URGENT ACADEMIC NOTICE</h2>
                    <p style="color: #c53030; margin: 5px 0 0 0; font-size: 14px; font-weight: 600;">Category: ${type || 'General'}</p>
                  </div>
                  <hr style="border: 0; border-top: 1px solid #fed7d7; margin: 20px 0;" />
                  <p style="font-size: 15px; color: #2d3748;">Hello <strong>${user.name}</strong>,</p>
                  <p style="font-size: 15px; color: #2d3748;">An urgent/high-priority announcement has been posted on the EduMentor AI portal:</p>
                  
                  <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #fed7d7; color: #2d3748; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                    <h3 style="margin-top: 0; color: #9b2c2c; font-size: 18px; font-weight: 700;">${title}</h3>
                    <p style="font-size: 14px; line-height: 1.6; white-space: pre-wrap; margin-bottom: 0;">${content}</p>
                  </div>
                  
                  <p style="font-size: 13px; color: #742a2a;">Please log in to your dashboard to review this notification and check any attachments.</p>
                  <hr style="border: 0; border-top: 1px solid #fed7d7; margin: 20px 0;" />
                  <p style="font-size: 11px; color: #c53030; text-align: center; margin: 0;">EduMentor AI Announcement Desk</p>
                </div>
              `
            }).catch(err => console.error(`Failed to send announcement email to ${user.email}:`, err));
          });
        })
        .catch(err => console.error('Failed to query users for announcement email broadcast:', err));
    }

    res.status(201).json({ success: true, data: populated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAnnouncements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = req.user!.role;
    const userId = req.user!._id;
    const { type, priority, search } = req.query;

    const now = new Date();
    const filter: any = {
      isActive: true,
      targetRoles: role,
      $or: [{ scheduledAt: { $lte: now } }, { scheduledAt: { $exists: false } }],
      $and: [{ $or: [{ expiresAt: { $gt: now } }, { expiresAt: { $exists: false } }] }],
    };

    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (search) {
      const regex = new RegExp(search as string, 'i');
      filter.$or = [{ title: regex }, { content: regex }];
    }

    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ priority: -1, createdAt: -1 })
      .limit(50);

    // Get read/bookmark status for this user
    const annIds = announcements.map(a => a._id);
    const reads = await AnnouncementRead.find({ announcement: { $in: annIds }, user: userId });
    const readMap: Record<string, any> = {};
    reads.forEach(r => { readMap[r.announcement.toString()] = r; });

    const result = announcements.map(a => ({
      ...a.toObject(),
      isRead: !!readMap[a._id.toString()],
      isBookmarked: readMap[a._id.toString()]?.isBookmarked || false,
    }));

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    await AnnouncementRead.findOneAndUpdate(
      { announcement: id, user: userId },
      { readAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const toggleBookmark = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const existing = await AnnouncementRead.findOne({ announcement: id, user: userId });
    if (existing) {
      existing.isBookmarked = !existing.isBookmarked;
      await existing.save();
      res.json({ success: true, isBookmarked: existing.isBookmarked });
    } else {
      await AnnouncementRead.create({ announcement: id, user: userId, isBookmarked: true });
      res.json({ success: true, isBookmarked: true });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;
    const role = req.user!.role;

    const ann = await Announcement.findById(id);
    if (!ann) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }
    if (role !== 'admin' && ann.createdBy.toString() !== userId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    await ann.deleteOne();
    res.json({ success: true, message: 'Announcement deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
