import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import AuditLog from '../models/AuditLog';
import User from '../models/User';
import UserSession from '../models/UserSession';
import PrivacySettings from '../models/PrivacySettings';
import { asyncHandler } from '../middleware/errorHandler';
import { sendEmail } from '../utils/email';

/* ─────────────────────────────────────────────────────────────────────────────
   Helper: parse browser from UA (inlined to avoid circular dep)
───────────────────────────────────────────────────────────────────────────── */
function parseBrowserInline(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Unknown';
}

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/privacy/security
   Security overview for current user — login history, failed attempts, sessions
───────────────────────────────────────────────────────────────────────────── */
export const getSecurityOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!._id).lean();
  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  // Last 20 login events for this user
  const loginHistory = await AuditLog.find({
    $or: [
      { performedBy: user.email, action: { $in: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_BLOCKED'] } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  // Active sessions count
  const activeSessionsCount = await UserSession.countDocuments({
    userId: req.user!._id,
    isActive: true,
  });

  // Failed login count (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const failedLogins30d = await AuditLog.countDocuments({
    performedBy: user.email,
    action: { $in: ['LOGIN_FAILED', 'LOGIN_BLOCKED'] },
    createdAt: { $gte: thirtyDaysAgo },
  });

  // Password history — last password change event
  const lastPasswordChange = await AuditLog.findOne({
    performedBy: user.email,
    action: { $in: ['PASSWORD_CHANGED', 'PASSWORD_RESET_COMPLETED'] },
  })
    .sort({ createdAt: -1 })
    .lean();

  // Security score calculation (0–100)
  let securityScore = 100;
  if (failedLogins30d > 5) securityScore -= 15;
  if (!user.lastLogin) securityScore -= 10;
  if (!lastPasswordChange) securityScore -= 10;
  const passwordAgeMs = lastPasswordChange
    ? Date.now() - new Date(lastPasswordChange.createdAt).getTime()
    : Infinity;
  const passwordAgeDays = Math.floor(passwordAgeMs / (1000 * 60 * 60 * 24));
  if (passwordAgeDays > 90) securityScore -= 15;
  if (activeSessionsCount > 5) securityScore -= 10;
  securityScore = Math.max(0, Math.min(100, securityScore));

  // Unique devices in login history
  const deviceHistory = loginHistory
    .filter(l => l.action === 'LOGIN_SUCCESS' && l.device)
    .map(l => ({
      device: l.device,
      browser: parseBrowserInline(l.device || ''),
      ip: l.ipAddress,
      time: l.createdAt,
      action: l.action,
    }));

  res.json({
    securityScore,
    lastLogin: user.lastLogin,
    loginAttempts: user.loginAttempts || 0,
    isLocked: user.lockUntil ? user.lockUntil > new Date() : false,
    lockUntil: user.lockUntil,
    failedLogins30d,
    activeSessionsCount,
    passwordLastChanged: lastPasswordChange?.createdAt || null,
    passwordAgeDays,
    loginHistory,
    deviceHistory: deviceHistory.slice(0, 10),
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/privacy/settings
───────────────────────────────────────────────────────────────────────────── */
export const getPrivacySettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  let settings = await PrivacySettings.findOne({ userId: req.user!._id }).lean();

  if (!settings) {
    settings = await PrivacySettings.create({ userId: req.user!._id }) as any;
  }

  res.json({ settings });
});

/* ─────────────────────────────────────────────────────────────────────────────
   PUT /api/privacy/settings
───────────────────────────────────────────────────────────────────────────── */
export const updatePrivacySettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    cookiePreferences,
    notificationPreferences,
    language,
    timezone,
  } = req.body;

  const settings = await PrivacySettings.findOneAndUpdate(
    { userId: req.user!._id },
    {
      $set: {
        ...(cookiePreferences && { cookiePreferences }),
        ...(notificationPreferences && { notificationPreferences }),
        ...(language && { language }),
        ...(timezone && { timezone }),
      },
    },
    { new: true, upsert: true }
  );

  res.json({ message: 'Privacy settings updated.', settings });
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/privacy/data-download
   Marks the download request and sends an email with instructions.
───────────────────────────────────────────────────────────────────────────── */
export const requestDataDownload = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!._id).lean();
  if (!user) { res.status(404).json({ message: 'User not found.' }); return; }

  await PrivacySettings.findOneAndUpdate(
    { userId: req.user!._id },
    { $set: { dataDownloadRequested: true, dataDownloadRequestedAt: new Date() } },
    { upsert: true }
  );

  sendEmail({
    email: user.email,
    subject: 'EduMentor AI — Your Data Download Request',
    text: `Hello ${user.name},\n\nWe have received your request to download your personal data. Our team will process this within 48 hours and send you a secure download link.\n\nBest regards,\nEduMentor AI Team`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px;"><h2 style="color:#4f63ff">Data Download Request Received ✅</h2><p>Hello <strong>${user.name}</strong>,</p><p>We received your request to download your personal data. Our team will process this request within <strong>48 hours</strong> and send a secure download link to your email.</p><p style="color:#718096;font-size:13px">If you did not make this request, please contact support immediately.</p></div>`,
  }).catch(console.error);

  res.json({ message: 'Data download request submitted. You will receive an email within 48 hours.' });
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/privacy/delete-account
   Marks deletion request and sends confirmation email.
───────────────────────────────────────────────────────────────────────────── */
export const requestAccountDeletion = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!._id).lean();
  if (!user) { res.status(404).json({ message: 'User not found.' }); return; }

  await PrivacySettings.findOneAndUpdate(
    { userId: req.user!._id },
    { $set: { deletionRequested: true, deletionRequestedAt: new Date() } },
    { upsert: true }
  );

  sendEmail({
    email: user.email,
    subject: 'EduMentor AI — Account Deletion Request',
    text: `Hello ${user.name},\n\nWe have received your account deletion request. An administrator will review and process this within 7 business days. You will receive a confirmation email once completed.\n\nIf you wish to cancel this request, please contact support.`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #fee2e2;border-radius:12px;"><h2 style="color:#ef4444">Account Deletion Request ⚠️</h2><p>Hello <strong>${user.name}</strong>,</p><p>We received your account deletion request. An administrator will process this within <strong>7 business days</strong>.</p><p>If you wish to cancel, please contact <a href="mailto:support@edumentor.ai">support@edumentor.ai</a> immediately.</p></div>`,
  }).catch(console.error);

  res.json({ message: 'Account deletion request submitted. You will receive a confirmation within 7 business days.' });
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/privacy/admin-stats  (admin only)
   Global security statistics dashboard
───────────────────────────────────────────────────────────────────────────── */
export const getAdminSecurityStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    lockedUsers,
    recentFailedLogins,
    recentSuccessLogins,
    blockedLogins,
    activeSessions,
    deletionRequests,
    downloadRequests,
    recentLoginLogs,
    failedByEmail,
    deviceStats,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ lockUntil: { $gt: new Date() } }),
    AuditLog.countDocuments({
      action: 'LOGIN_FAILED',
      createdAt: { $gte: thirtyDaysAgo },
    }),
    AuditLog.countDocuments({
      action: 'LOGIN_SUCCESS',
      createdAt: { $gte: thirtyDaysAgo },
    }),
    AuditLog.countDocuments({
      action: 'LOGIN_BLOCKED',
      createdAt: { $gte: thirtyDaysAgo },
    }),
    UserSession.countDocuments({ isActive: true }),
    PrivacySettings.countDocuments({ deletionRequested: true }),
    PrivacySettings.countDocuments({ dataDownloadRequested: true }),
    AuditLog.find({
      action: { $in: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_BLOCKED'] },
      createdAt: { $gte: thirtyDaysAgo },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    // Top failed login users
    AuditLog.aggregate([
      { $match: { action: 'LOGIN_FAILED', createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$performedBy', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    AuditLog.aggregate([
      { $match: { action: 'LOGIN_SUCCESS', createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$device', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  res.json({
    overview: {
      totalUsers,
      activeUsers,
      lockedUsers,
      activeSessions,
      deletionRequests,
      downloadRequests,
    },
    loginStats30d: {
      failed: recentFailedLogins,
      successful: recentSuccessLogins,
      blocked: blockedLogins,
    },
    recentLoginLogs,
    topFailedAccounts: failedByEmail,
    deviceStats,
  });
});
