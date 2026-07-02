import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import UserPreference from '../models/UserPreference';
import { asyncHandler } from '../middleware/errorHandler';

const getDefaultWidgets = (role: 'student' | 'faculty' | 'admin') => {
  if (role === 'admin') {
    return [
      { id: 'ai-performance', title: 'AI Performance', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'user-analytics', title: 'User Analytics', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'security', title: 'Security Dashboard', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'system-health', title: 'System Health', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'support', title: 'Support Center', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'activity', title: 'Activity Feed', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'announcements', title: 'Announcements', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'database-status', title: 'Database Status', visible: true, gridSpan: 'col-span-1', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'api-status', title: 'API Status', visible: true, gridSpan: 'col-span-1', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'reports', title: 'Reports', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
    ];
  } else if (role === 'faculty') {
    return [
      { id: 'student-analytics', title: 'Student Analytics', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'assignments', title: 'Assignments', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'quizzes', title: 'Quiz Management', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'messages', title: 'Messages', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'office-hours', title: 'Office Hours', visible: true, gridSpan: 'col-span-1', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'meetings', title: 'Meetings', visible: true, gridSpan: 'col-span-1', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'ai-assistant', title: 'AI Assistant', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'announcements', title: 'Announcements', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'calendar', title: 'Calendar', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'notifications', title: 'Notifications', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
    ];
  } else {
    // student
    return [
      { id: 'ai-tutor', title: 'AI Tutor', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'ai-explain', title: 'AI Explain Mode', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'ai-notes', title: 'AI Notes', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'study-planner', title: 'AI Study Planner', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'research-assistant', title: 'AI Research Assistant', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'assignments', title: 'Assignments', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'quizzes', title: 'Quizzes', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'progress', title: 'Learning Progress', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'recommendations', title: 'AI Recommendations', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'calendar', title: 'Calendar', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'notifications', title: 'Notifications', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'bookmarks', title: 'Bookmarks', visible: true, gridSpan: 'col-span-1', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'recently-viewed', title: 'Recently Viewed', visible: true, gridSpan: 'col-span-1', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'meetings', title: 'Upcoming Meetings', visible: true, gridSpan: 'col-span-1', isPinned: false, isCollapsed: false, height: 'auto' },
      { id: 'activity', title: 'Activity Feed', visible: true, gridSpan: 'col-span-2', isPinned: false, isCollapsed: false, height: 'auto' },
    ];
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/preferences
───────────────────────────────────────────────────────────────────────────── */
export const getPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id;
  const role = req.user!.role;

  let prefs = await UserPreference.findOne({ userId });
  const defaultWidgets = getDefaultWidgets(role);

  if (!prefs) {
    prefs = await UserPreference.create({
      userId,
      dashboard: {
        widgets: defaultWidgets,
      },
    });
  } else {
    // Sync missing default widgets into existing layouts
    const existingIds = new Set(prefs.dashboard.widgets.map((w: any) => w.id));
    const missingWidgets = defaultWidgets.filter((w: any) => !existingIds.has(w.id));

    if (missingWidgets.length > 0) {
      prefs.dashboard.widgets.push(...missingWidgets);
      await prefs.save();
    }
  }

  res.json({ success: true, preferences: prefs });
});

/* ─────────────────────────────────────────────────────────────────────────────
   PUT /api/preferences
───────────────────────────────────────────────────────────────────────────── */
export const updatePreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id;
  const { general, notifications, email, privacy, accessibility, dashboard } = req.body;

  const updateObj: Record<string, any> = {};

  if (general) updateObj.general = general;
  if (notifications) updateObj.notifications = notifications;
  if (email) updateObj.email = email;
  if (privacy) updateObj.privacy = privacy;
  if (accessibility) updateObj.accessibility = accessibility;
  if (dashboard) updateObj.dashboard = dashboard;

  const prefs = await UserPreference.findOneAndUpdate(
    { userId },
    { $set: updateObj },
    { new: true, upsert: true }
  );

  res.json({ success: true, message: 'Preferences updated successfully', preferences: prefs });
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/preferences/reset-dashboard
───────────────────────────────────────────────────────────────────────────── */
export const resetDashboardLayout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id;
  const role = req.user!.role;

  const prefs = await UserPreference.findOneAndUpdate(
    { userId },
    { $set: { 'dashboard.widgets': getDefaultWidgets(role) } },
    { new: true, upsert: true }
  );

  res.json({ success: true, message: 'Dashboard layout reset to defaults', preferences: prefs });
});
