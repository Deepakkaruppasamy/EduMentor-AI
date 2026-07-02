import api from './api';

export interface UserPreferences {
  general: {
    language: string;
    theme: 'light' | 'dark' | 'system';
    fontSize: 'small' | 'medium' | 'large';
    sidebarCollapsed: boolean;
    defaultLandingPage: string;
    timezone: string;
    dateFormat: string;
  };
  notifications: Record<string, { browser: boolean; inApp: boolean; email: boolean }>;
  email: Record<string, boolean>;
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
      gridSpan: string;
    }>;
  };
}

export const preferenceService = {
  get: async () => {
    const { data } = await api.get<{ success: boolean; preferences: UserPreferences }>('/preferences');
    return data.preferences;
  },

  update: async (prefs: Partial<UserPreferences>) => {
    const { data } = await api.put<{ success: boolean; preferences: UserPreferences }>('/preferences', prefs);
    return data.preferences;
  },

  resetDashboard: async () => {
    const { data } = await api.post<{ success: boolean; preferences: UserPreferences }>('/preferences/reset-dashboard');
    return data.preferences;
  },
};
