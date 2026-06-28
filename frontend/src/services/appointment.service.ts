import api from './api';

export const appointmentService = {
  getFacultyList: () => api.get('/appointments/faculty'),
  request: (data: { facultyId: string; mode: string; date: string; timeSlot: string; purpose: string }) =>
    api.post('/appointments', data),
  getMy: () => api.get('/appointments/my'),
  getAll: () => api.get('/appointments/all'),
  updateStatus: (id: string, data: { status: string; facultyNotes?: string; rescheduledDate?: string; rescheduledSlot?: string }) =>
    api.put(`/appointments/${id}/status`, data),
  cancel: (id: string) => api.put(`/appointments/${id}/cancel`),
};
