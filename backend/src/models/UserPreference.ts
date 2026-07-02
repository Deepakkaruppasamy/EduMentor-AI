import mongoose, { Document, Schema } from 'mongoose';

export interface IUserPreference extends Document {
  userId: mongoose.Types.ObjectId;
  general: {
    language: string;
    theme: 'light' | 'dark' | 'system';
    fontSize: 'small' | 'medium' | 'large';
    sidebarCollapsed: boolean;
    defaultLandingPage: string;
    timezone: string;
    dateFormat: string;
    shortcutsEnabled?: boolean;
  };
  notifications: {
    announcements: { browser: boolean; inApp: boolean; email: boolean };
    assignmentDeadlines: { browser: boolean; inApp: boolean; email: boolean };
    quizNotifications: { browser: boolean; inApp: boolean; email: boolean };
    meetingReminders: { browser: boolean; inApp: boolean; email: boolean };
    calendarEvents: { browser: boolean; inApp: boolean; email: boolean };
    facultyReplies: { browser: boolean; inApp: boolean; email: boolean };
    studentMessages: { browser: boolean; inApp: boolean; email: boolean };
    aiRecommendations: { browser: boolean; inApp: boolean; email: boolean };
    supportTickets: { browser: boolean; inApp: boolean; email: boolean };
    researchAssistantCompletion: { browser: boolean; inApp: boolean; email: boolean };
  };
  email: {
    weeklySummary: boolean;
    dailyDigest: boolean;
    assignmentReminderEmails: boolean;
    announcementEmails: boolean;
    aiRecommendationEmails: boolean;
    securityAlerts: boolean;
    meetingReminderEmails: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'contacts';
    onlineStatusVisibility: boolean;
    activityVisibility: boolean;
    messagePermissions: 'everyone' | 'faculty_only' | 'no_one';
    cookiePreferences: {
      analytics: boolean;
      marketing: boolean;
      functional: boolean;
    };
    aiPersonalization: boolean;
  };
  accessibility: {
    highContrastMode: boolean;
    largeText: boolean;
    reducedMotion: boolean;
    keyboardNavigation: boolean;
    screenReaderSupport: boolean;
    colorBlindFriendlyMode: boolean;
  };
  dashboard: {
    widgets: Array<{
      id: string;
      title: string;
      visible: boolean;
      gridSpan: string; // 'col-span-1' | 'col-span-2' | 'col-span-3' | 'col-span-4'
      isPinned?: boolean;
      isCollapsed?: boolean;
      height?: string; // 'auto' | 'small' | 'medium' | 'large'
    }>;
  };
}

const UserPreferenceSchema = new Schema<IUserPreference>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    general: {
      language: { type: String, default: 'English' },
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'dark' },
      fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
      sidebarCollapsed: { type: Boolean, default: false },
      defaultLandingPage: { type: String, default: 'dashboard' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      dateFormat: { type: String, default: 'YYYY-MM-DD' },
      shortcutsEnabled: { type: Boolean, default: true },
    },
    notifications: {
      announcements: {
        browser: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
      },
      assignmentDeadlines: {
        browser: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
      },
      quizNotifications: {
        browser: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
      },
      meetingReminders: {
        browser: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
      },
      calendarEvents: {
        browser: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
      },
      facultyReplies: {
        browser: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
      },
      studentMessages: {
        browser: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
      },
      aiRecommendations: {
        browser: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
      },
      supportTickets: {
        browser: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
      },
      researchAssistantCompletion: {
        browser: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
      },
    },
    email: {
      weeklySummary: { type: Boolean, default: true },
      dailyDigest: { type: Boolean, default: false },
      assignmentReminderEmails: { type: Boolean, default: true },
      announcementEmails: { type: Boolean, default: true },
      aiRecommendationEmails: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
      meetingReminderEmails: { type: Boolean, default: true },
    },
    privacy: {
      profileVisibility: { type: String, enum: ['public', 'private', 'contacts'], default: 'public' },
      onlineStatusVisibility: { type: Boolean, default: true },
      activityVisibility: { type: Boolean, default: true },
      messagePermissions: { type: String, enum: ['everyone', 'faculty_only', 'no_one'], default: 'everyone' },
      cookiePreferences: {
        analytics: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false },
        functional: { type: Boolean, default: true },
      },
      aiPersonalization: { type: Boolean, default: true },
    },
    accessibility: {
      highContrastMode: { type: Boolean, default: false },
      largeText: { type: Boolean, default: false },
      reducedMotion: { type: Boolean, default: false },
      keyboardNavigation: { type: Boolean, default: false },
      screenReaderSupport: { type: Boolean, default: false },
      colorBlindFriendlyMode: { type: Boolean, default: false },
    },
    dashboard: {
      widgets: [
        {
          id: { type: String, required: true },
          title: { type: String, required: true },
          visible: { type: Boolean, default: true },
          gridSpan: { type: String, default: 'col-span-1' },
          isPinned: { type: Boolean, default: false },
          isCollapsed: { type: Boolean, default: false },
          height: { type: String, default: 'auto' },
        },
      ],
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUserPreference>('UserPreference', UserPreferenceSchema);
