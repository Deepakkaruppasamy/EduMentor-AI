import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import ActivityLog from '../models/ActivityLog';

/* ─────────────────────────────────────────────────────────────────────────────
   Browser/OS parser — no external dep, regex-based
───────────────────────────────────────────────────────────────────────────── */
function parseBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Microsoft Edge';
  if (/OPR\//.test(ua) || /Opera/.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Google Chrome';
  if (/Firefox\//.test(ua)) return 'Mozilla Firefox';
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari';
  if (/MSIE|Trident/.test(ua)) return 'Internet Explorer';
  if (/curl/.test(ua)) return 'cURL';
  return 'Unknown Browser';
}

function parseOS(ua: string): string {
  if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
  if (/Windows NT 6\.3/.test(ua)) return 'Windows 8.1';
  if (/Windows NT 6\.1/.test(ua)) return 'Windows 7';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad/.test(ua)) return 'iOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown OS';
}

function parseDeviceName(ua: string): string {
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) {
    const m = ua.match(/Android.*?;\s*([^)]+)\)/);
    return m ? m[1].trim() : 'Android Device';
  }
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Linux/.test(ua)) return 'Linux Machine';
  return 'Unknown Device';
}

/* ─────────────────────────────────────────────────────────────────────────────
   SHA-256 hash of a JWT token (for session storage — never store raw)
───────────────────────────────────────────────────────────────────────────── */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/* ─────────────────────────────────────────────────────────────────────────────
   logActivity — call from any controller to record an activity event
   Non-throwing: errors are silently logged so they never break the main flow
───────────────────────────────────────────────────────────────────────────── */
export interface ActivityData {
  userId: string;
  userEmail: string;
  userRole: 'student' | 'faculty' | 'admin';
  action: string;
  module: string;
  details: string;
  status?: 'success' | 'warning' | 'error';
  metadata?: Record<string, any>;
}

export async function logActivity(req: Request, data: ActivityData): Promise<void> {
  try {
    const ua = req.headers['user-agent'] || '';
    await ActivityLog.create({
      userId: data.userId,
      userEmail: data.userEmail,
      userRole: data.userRole,
      action: data.action,
      module: data.module,
      details: data.details,
      status: data.status || 'success',
      device: parseDeviceName(ua),
      browser: parseBrowser(ua),
      os: parseOS(ua),
      ipAddress: req.ip || req.socket?.remoteAddress || '',
      metadata: data.metadata,
    });
  } catch (err) {
    console.error('[ActivityLogger] Failed to log activity:', err);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Express Middleware: activityTimelineMW
   Intercepts route completions and records timeline records on successful actions.
───────────────────────────────────────────────────────────────────────────── */
export const activityTimelineMW = (req: any, res: Response, next: NextFunction) => {
  res.on('finish', async () => {
    try {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      if (!req.user) return;

      const url = req.originalUrl || '';
      const method = req.method;

      let action = '';
      let moduleName = '';
      let details = '';

      if (url.includes('/api/chat/query')) {
        action = 'AI_TUTOR_USAGE';
        moduleName = 'AI Chat Tutor';
        details = 'Queried the AI Tutor.';
      } else if (url.includes('/api/notes/generate')) {
        action = 'AI_NOTES_GENERATED';
        moduleName = 'Notes Generator';
        details = 'Generated study notes.';
      } else if (url.includes('/api/research/analyze')) {
        action = 'RESEARCH_ASSISTANT_USAGE';
        moduleName = 'Research Assistant';
        details = 'Uploaded and analyzed research documents.';
      } else if (url.includes('/api/document/upload')) {
        action = 'NOTES_UPLOADED';
        moduleName = 'Document Management';
        details = 'Uploaded a document.';
      } else if (url.includes('/api/assignment-evaluations/evaluate')) {
        action = 'ASSIGNMENT_EVALUATION';
        moduleName = 'Assignment Evaluator';
        details = 'Submitted assignment for evaluation.';
      } else if (url.includes('/api/quiz/evaluate') || url.includes('/api/quiz/evaluate-oral')) {
        action = 'QUIZ_ATTEMPT';
        moduleName = 'Quiz Arena';
        details = 'Submitted a quiz attempt.';
      } else if (url.includes('/api/quiz/generate') || url.includes('/api/quiz/assign')) {
        action = 'QUIZ_CREATED';
        moduleName = 'Quiz Arena';
        details = 'Created or assigned a quiz.';
      } else if (url.includes('/api/appointments') && method === 'POST') {
        action = 'MEETING_SCHEDULED';
        moduleName = 'Meeting Scheduler';
        details = 'Scheduled a new appointment.';
      } else if (url.includes('/api/appointments/') && url.includes('/status') && method === 'PUT') {
        action = 'MEETING_APPROVAL';
        moduleName = 'Meeting Scheduler';
        details = 'Updated appointment status.';
      } else if (url.includes('/api/messaging/messages/send')) {
        action = 'MESSAGE_SENT';
        moduleName = 'Messaging';
        details = 'Sent a private message.';
      } else if (url.includes('/api/messaging/discussions/') && url.includes('/reply')) {
        action = 'STUDENT_REPLY';
        moduleName = 'Discussion Boards';
        details = 'Replied to a discussion board thread.';
      } else if (url.includes('/api/announcements') && method === 'POST') {
        action = 'ANNOUNCEMENT_PUBLISHED';
        moduleName = 'Announcements';
        details = 'Published a new announcement.';
      } else if (url.includes('/api/office-hours/configure') || (url.includes('/api/office-hours/status') && method === 'PUT')) {
        action = 'OFFICE_HOUR_UPDATES';
        moduleName = 'Office Hours';
        details = 'Updated faculty office hours settings.';
      } else if (url.includes('/api/calendar') && method === 'POST') {
        action = 'ACADEMIC_CALENDAR_UPDATED';
        moduleName = 'Academic Calendar';
        details = 'Updated academic calendar.';
      } else if (url.includes('/api/admin/users')) {
        if (method === 'POST') {
          action = 'USER_CREATED';
          moduleName = 'User Directory';
          details = `Created new user account: ${req.body.email || ''}`;
        } else if (method === 'PUT') {
          action = 'USER_UPDATED';
          moduleName = 'User Directory';
          details = `Updated user account details: ${req.body.email || ''}`;
        } else if (method === 'DELETE') {
          action = 'USER_DELETED';
          moduleName = 'User Directory';
          details = 'Deleted user account.';
        }
      } else if (url.includes('/reset-password') && method === 'POST') {
        action = 'PASSWORD_RESET';
        moduleName = 'User Directory';
        details = 'Admin forced user password reset.';
      } else if (url.includes('/api/privacy/settings') && method === 'PUT') {
        action = 'SECURITY_SETTINGS_CHANGED';
        moduleName = 'Privacy & Security';
        details = 'Updated security settings preferences.';
      } else if (url.includes('/api/reports/generate')) {
        action = 'REPORTS_EXPORTED';
        moduleName = 'AI Reports';
        details = 'Generated AI report.';
      }

      if (action && moduleName) {
        await logActivity(req, {
          userId: req.user._id.toString(),
          userEmail: req.user.email,
          userRole: req.user.role,
          action,
          module: moduleName,
          details,
          status: 'success',
        });
      }
    } catch (logErr) {
      console.error('[activityTimelineMW] Logging error:', logErr);
    }
  });

  next();
};

/* ─────────────────────────────────────────────────────────────────────────────
   Exported parsers (reused by session controller)
───────────────────────────────────────────────────────────────────────────── */
export { parseBrowser, parseOS, parseDeviceName };
