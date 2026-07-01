import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import UserSession from '../models/UserSession';
import { asyncHandler } from '../middleware/errorHandler';
import { hashToken } from '../utils/activity-logger';

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/sessions
   Lists all active sessions for the current user.
   Marks the current session based on the Authorization header token.
───────────────────────────────────────────────────────────────────────────── */
export const getMySessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const authHeader = req.headers.authorization || '';
  const currentToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const currentHash = currentToken ? hashToken(currentToken) : '';

  const sessions = await UserSession.find({
    userId: req.user!._id,
    isActive: true,
  }).sort({ lastActive: -1 }).lean();

  const enriched = sessions.map(s => ({
    ...s,
    isCurrent: s.tokenHash === currentHash,
  }));

  res.json({ sessions: enriched });
});

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE /api/sessions/:id
   Revoke a specific session. Users can only revoke their own sessions.
───────────────────────────────────────────────────────────────────────────── */
export const revokeSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const session = await UserSession.findOne({
    _id: req.params.id,
    userId: req.user!._id,
    isActive: true,
  });

  if (!session) {
    res.status(404).json({ message: 'Session not found.' });
    return;
  }

  session.isActive = false;
  session.logoutTime = new Date();
  await session.save();

  res.json({ message: 'Session terminated successfully.' });
});

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE /api/sessions/all
   Revoke ALL sessions except the current one.
───────────────────────────────────────────────────────────────────────────── */
export const revokeAllOtherSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const authHeader = req.headers.authorization || '';
  const currentToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const currentHash = currentToken ? hashToken(currentToken) : '';

  const result = await UserSession.updateMany(
    {
      userId: req.user!._id,
      isActive: true,
      tokenHash: { $ne: currentHash },
    },
    {
      $set: { isActive: false, logoutTime: new Date() },
    }
  );

  res.json({ message: `${result.modifiedCount} session(s) terminated.`, count: result.modifiedCount });
});

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE /api/sessions/all-including-current
   Revoke ALL sessions including current (used internally after password change)
───────────────────────────────────────────────────────────────────────────── */
export const revokeAllSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  await UserSession.updateMany(
    { userId: req.user!._id, isActive: true },
    { $set: { isActive: false, logoutTime: new Date() } }
  );

  res.json({ message: 'All sessions terminated. Please log in again.' });
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/sessions/admin  (admin only)
   Admin view: sessions for a specific user (query: userId)
───────────────────────────────────────────────────────────────────────────── */
export const getAdminSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId, activeOnly } = req.query;

  const filter: Record<string, any> = {};
  if (userId) filter.userId = userId;
  if (activeOnly === 'true') filter.isActive = true;

  const sessions = await UserSession.find(filter)
    .sort({ lastActive: -1 })
    .limit(200)
    .lean();

  const stats = {
    total: await UserSession.countDocuments({ isActive: true }),
    byBrowser: await UserSession.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$browser', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    byOS: await UserSession.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$os', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  };

  res.json({ sessions, stats });
});
