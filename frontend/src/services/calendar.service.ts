import api from './api';

export const calendarService = {
  getEvents: (params?: { start?: string; end?: string; type?: string; course?: string }) =>
    api.get('/calendar', { params }),
  createEvent: (data: any) => api.post('/calendar', data),
  updateEvent: (id: string, data: any) => api.put(`/calendar/${id}`, data),
  deleteEvent: (id: string) => api.delete(`/calendar/${id}`),
};
