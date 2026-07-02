import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import ActivityLog from '../models/ActivityLog';
import { asyncHandler } from '../middleware/errorHandler';

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/activity
   Returns current user's own activity timeline (paginated + filterable)
───────────────────────────────────────────────────────────────────────────── */
export const getMyTimeline = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    page = '1',
    limit = '20',
    module,
    action,
    status,
    from,
    to,
  } = req.query as Record<string, string>;

  const filter: Record<string, any> = { userId: req.user!._id };

  if (module) filter.module = { $regex: module, $options: 'i' };
  if (action) filter.action = { $regex: action, $options: 'i' };
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    ActivityLog.countDocuments(filter),
  ]);

  // Available modules for filter dropdown
  const modules = await ActivityLog.distinct('module', { userId: req.user!._id });

  res.json({
    logs,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
    modules,
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/activity/all  (admin only)
───────────────────────────────────────────────────────────────────────────── */
export const getAllTimeline = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    page = '1',
    limit = '30',
    userId,
    module,
    action,
    status,
    role,
    from,
    to,
  } = req.query as Record<string, string>;

  const filter: Record<string, any> = {};

  if (userId) filter.userId = userId;
  if (module) filter.module = { $regex: module, $options: 'i' };
  if (action) filter.action = { $regex: action, $options: 'i' };
  if (status) filter.status = status;
  if (role) filter.userRole = role;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    ActivityLog.countDocuments(filter),
  ]);

  // Summary stats for admin
  const [moduleStats, statusStats, roleStats] = await Promise.all([
    ActivityLog.aggregate([
      { $match: filter },
      { $group: { _id: '$module', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    ActivityLog.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    ActivityLog.aggregate([
      { $match: filter },
      { $group: { _id: '$userRole', count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    logs,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
    stats: { moduleStats, statusStats, roleStats },
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/activity/modules — list distinct modules (for filter UI)
───────────────────────────────────────────────────────────────────────────── */
export const getModules = asyncHandler(async (req: AuthRequest, res: Response) => {
  const isAdmin = req.user!.role === 'admin';
  const filter = isAdmin ? {} : { userId: req.user!._id };
  const modules = await ActivityLog.distinct('module', filter);
  res.json({ modules });
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/activity/export
   Exports timeline logs to JSON or CSV format
───────────────────────────────────────────────────────────────────────────── */
export const exportTimeline = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    module,
    action,
    status,
    from,
    to,
    format = 'json',
  } = req.query as Record<string, string>;

  const filter: Record<string, any> = {};

  if (req.user!.role === 'admin') {
    if (req.query.userId) filter.userId = req.query.userId;
  } else {
    filter.userId = req.user!._id;
  }

  if (module) filter.module = { $regex: module, $options: 'i' };
  if (action) filter.action = { $regex: action, $options: 'i' };
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }

  const logs = await ActivityLog.find(filter).sort({ createdAt: -1 }).limit(5000).lean();

  if (format === 'csv') {
    const headers = ['ID', 'User ID', 'Module', 'Action', 'Status', 'IP Address', 'User Agent', 'Details', 'Timestamp'];
    const csvRows = [headers.join(',')];

    for (const log of logs) {
      const detailsStr = typeof log.details === 'object'
        ? JSON.stringify(log.details).replace(/"/g, '""')
        : String(log.details || '').replace(/"/g, '""');

      const values = [
        log._id,
        log.userId,
        `"${String(log.module || '').replace(/"/g, '""')}"`,
        `"${String(log.action || '').replace(/"/g, '""')}"`,
        log.status || 'success',
        log.ipAddress || '',
        `"${String(log.userAgent || '').replace(/"/g, '""')}"`,
        `"${detailsStr}"`,
        log.createdAt ? new Date(log.createdAt).toISOString() : '',
      ];
      csvRows.push(values.join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=activity_export_${Date.now()}.csv`);
    return res.send(csvRows.join('\n'));
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=activity_export_${Date.now()}.json`);
  res.json(logs);
});
