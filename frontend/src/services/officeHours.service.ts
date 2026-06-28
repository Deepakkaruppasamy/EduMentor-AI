import api from './api';

export const officeHoursService = {
  getAllFacultyAvailability: () => api.get('/office-hours/faculty'),
  getMyConfig: () => api.get('/office-hours/my'),
  configure: (data: any) => api.post('/office-hours/configure', data),
  updateStatus: (data: { status: string; statusMessage?: string }) => api.put('/office-hours/status', data),
  getQueue: (facultyId: string) => api.get(`/office-hours/queue/${facultyId}`),
  joinQueue: (facultyId: string) => api.post('/office-hours/queue/join', { facultyId }),
  leaveQueue: (facultyId: string) => api.post('/office-hours/queue/leave', { facultyId }),
  callNext: () => api.post('/office-hours/queue/next'),
};
