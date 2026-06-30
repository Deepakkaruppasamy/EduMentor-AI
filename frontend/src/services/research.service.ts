import api from './api';

export const researchService = {
  analyze: (formData: FormData) =>
    api.post('/research/analyze', formData, {
      headers: { 'Content-Type': undefined },
    }),
  getHistory: () => api.get('/research/history'),
  deleteHistory: (id: string) => api.delete(`/research/history/${id}`),
};
