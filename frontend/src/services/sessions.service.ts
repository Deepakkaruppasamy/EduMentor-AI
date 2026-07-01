import api from './api';

export interface UserSession {
  _id: string;
  userId: string;
  userEmail: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  isActive: boolean;
  loginTime: string;
  lastActive: string;
  isCurrent?: boolean;
}

export const sessionsService = {
  getMySessions: async (): Promise<{ sessions: UserSession[] }> => {
    const res = await api.get('/sessions');
    return res.data;
  },

  revokeSession: async (id: string): Promise<{ message: string }> => {
    const res = await api.delete(`/sessions/${id}`);
    return res.data;
  },

  revokeAllOtherSessions: async (): Promise<{ message: string; count: number }> => {
    const res = await api.delete('/sessions/all-other');
    return res.data;
  },
};
