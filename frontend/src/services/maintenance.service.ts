import api from './api';

export interface MaintenanceStatus {
  isEnabled: boolean;
  message: string;
  startTime?: string;
  endTime?: string;
}

export interface MaintenanceSettings {
  isEnabled: boolean;
  message: string;
  startTime?: string;
  endTime?: string;
  scheduledBy?: string;
  bannerUrl?: string;
}

export const maintenanceService = {
  // Public check, doesn't require JWT protection
  getStatus: async (): Promise<MaintenanceStatus> => {
    const res = await api.get('/maintenance/status');
    return res.data;
  },

  // Admin endpoints
  getSettings: async (): Promise<{ settings: MaintenanceSettings }> => {
    const res = await api.get('/maintenance');
    return res.data;
  },

  updateSettings: async (settings: Partial<MaintenanceSettings>): Promise<{ settings: MaintenanceSettings; message: string }> => {
    const res = await api.put('/maintenance', settings);
    return res.data;
  },
};
