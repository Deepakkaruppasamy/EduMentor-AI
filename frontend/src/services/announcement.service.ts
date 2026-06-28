import api from './api';

export const announcementService = {
  getAnnouncements: (params?: { type?: string; priority?: string; search?: string }) =>
    api.get('/announcements', { params }),
  create: (formData: FormData) =>
    api.post('/announcements', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  markRead: (id: string) => api.put(`/announcements/${id}/read`),
  toggleBookmark: (id: string) => api.put(`/announcements/${id}/bookmark`),
  delete: (id: string) => api.delete(`/announcements/${id}`),
};
