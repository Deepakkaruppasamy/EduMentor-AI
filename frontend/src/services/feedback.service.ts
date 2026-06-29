import api from './api';

export interface FeedbackPayload {
  targetType: 'platform' | 'faculty' | 'course';
  targetFaculty?: string;
  targetCourse?: string;
  category: string;
  rating: number;
  title: string;
  message: string;
  isAnonymous?: boolean;
}

export const feedbackService = {
  submit: (data: FeedbackPayload) => api.post('/feedback', data),
  getMy: () => api.get('/feedback/my'),
  getFacultyReceived: () => api.get('/feedback/faculty/received'),
  getAll: (params?: Record<string, any>) => api.get('/feedback/all', { params }),
  getAnalytics: () => api.get('/feedback/analytics'),
  updateStatus: (id: string, data: { status?: string; adminNote?: string }) => api.put(`/feedback/${id}`, data),
  delete: (id: string) => api.delete(`/feedback/${id}`),
};
