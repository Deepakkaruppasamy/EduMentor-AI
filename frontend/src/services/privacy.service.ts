import api from './api';

export interface SecurityOverview {
  securityScore: number;
  lastLogin: string;
  loginAttempts: number;
  isLocked: boolean;
  lockUntil?: string;
  failedLogins30d: number;
  activeSessionsCount: number;
  passwordLastChanged?: string;
  passwordAgeDays: number;
  loginHistory: any[];
  deviceHistory: any[];
}

export interface PrivacySettings {
  cookiePreferences: {
    analytics: boolean;
    marketing: boolean;
    functional: boolean;
  };
  notificationPreferences: {
    emailNotifications: boolean;
    browserNotifications: boolean;
    loginAlerts: boolean;
    maintenanceAlerts: boolean;
    securityAlerts: boolean;
  };
  twoFactorEnabled: boolean;
  dataDownloadRequested: boolean;
  deletionRequested: boolean;
  language: string;
  timezone: string;
}

export interface AdminSecurityStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    lockedUsers: number;
    activeSessions: number;
    deletionRequests: number;
    downloadRequests: number;
  };
  loginStats30d: {
    failed: number;
    successful: number;
    blocked: number;
  };
  recentLoginLogs: any[];
  topFailedAccounts: any[];
  deviceStats: any[];
}

export const privacyService = {
  getSecurityOverview: async (): Promise<SecurityOverview> => {
    const res = await api.get('/privacy/security');
    return res.data;
  },

  getPrivacySettings: async (): Promise<{ settings: PrivacySettings }> => {
    const res = await api.get('/privacy/settings');
    return res.data;
  },

  updatePrivacySettings: async (settings: Partial<PrivacySettings>): Promise<{ settings: PrivacySettings; message: string }> => {
    const res = await api.put('/privacy/settings', settings);
    return res.data;
  },

  requestDataDownload: async (): Promise<{ message: string }> => {
    const res = await api.post('/privacy/data-download');
    return res.data;
  },

  requestAccountDeletion: async (): Promise<{ message: string }> => {
    const res = await api.post('/privacy/delete-account');
    return res.data;
  },

  getAdminSecurityStats: async (): Promise<AdminSecurityStats> => {
    const res = await api.get('/privacy/admin-stats');
    return res.data;
  },
};
