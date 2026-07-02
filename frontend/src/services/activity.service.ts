import api from './api';

export interface ActivityLog {
  _id: string;
  userId: string;
  userEmail: string;
  userRole: 'student' | 'faculty' | 'admin';
  action: string;
  module: string;
  details: string;
  status: 'success' | 'warning' | 'error';
  device: string;
  browser: string;
  os: string;
  ipAddress?: string;
  createdAt: string;
}

export interface ActivityResponse {
  logs: ActivityLog[];
  total: number;
  page: number;
  totalPages: number;
  modules: string[];
}

export const activityService = {
  getMyTimeline: async (params?: {
    page?: number;
    limit?: number;
    module?: string;
    action?: string;
    status?: string;
    from?: string;
    to?: string;
  }): Promise<ActivityResponse> => {
    const res = await api.get('/activity', { params });
    return res.data;
  },

  getAllTimeline: async (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    module?: string;
    action?: string;
    status?: string;
    role?: string;
    from?: string;
    to?: string;
  }): Promise<ActivityResponse & { stats: any }> => {
    const res = await api.get('/activity/all', { params });
    return res.data;
  },

  getModules: async (): Promise<{ modules: string[] }> => {
    const res = await api.get('/activity/modules');
    return res.data;
  },

  exportTimeline: async (params?: {
    module?: string;
    action?: string;
    status?: string;
    from?: string;
    to?: string;
    role?: string;
    format?: 'json' | 'csv';
  }): Promise<Blob> => {
    const res = await api.get('/activity/export', { params, responseType: 'blob' });
    return res.data;
  },
};
