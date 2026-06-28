import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import CalendarEvent from '../models/CalendarEvent';

export const createEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { title, description, type, startDate, endDate, course, targetRoles, color, reminderDays, isAllDay } = req.body;

    const event = await CalendarEvent.create({
      title,
      description,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate || startDate),
      course: course || undefined,
      createdBy: userId,
      targetRoles: targetRoles || ['student', 'faculty', 'admin'],
      color: color || '#4f63ff',
      reminderDays: reminderDays || [7, 3, 1, 0],
      isAllDay: isAllDay !== undefined ? isAllDay : true,
    });

    const populated = await CalendarEvent.findById(event._id)
      .populate('createdBy', 'name email role')
      .populate('course', 'title');

    res.status(201).json({ success: true, data: populated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = req.user!.role;
    const { start, end, type, course } = req.query;

    const filter: any = { targetRoles: role };
    if (start || end) {
      filter.startDate = {};
      if (start) filter.startDate.$gte = new Date(start as string);
      if (end) filter.startDate.$lte = new Date(end as string);
    }
    if (type) filter.type = type;
    if (course) filter.course = course;

    const events = await CalendarEvent.find(filter)
      .populate('createdBy', 'name email role')
      .populate('course', 'title')
      .sort({ startDate: 1 });

    res.json({ success: true, data: events });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;
    const role = req.user!.role;

    const event = await CalendarEvent.findById(id);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    // Only admin or the event creator can update
    if (role !== 'admin' && event.createdBy.toString() !== userId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const updates = req.body;
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);

    const updated = await CalendarEvent.findByIdAndUpdate(id, updates, { new: true })
      .populate('createdBy', 'name email role')
      .populate('course', 'title');

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;
    const role = req.user!.role;

    const event = await CalendarEvent.findById(id);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    if (role !== 'admin' && event.createdBy.toString() !== userId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    await event.deleteOne();
    res.json({ success: true, message: 'Event deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
