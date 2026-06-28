import api from './api';

export const researchService = {
  analyze: (data: { feature: string; paperTexts: string[]; paperMeta?: any[] }) =>
    api.post('/research/analyze', data),
  getHistory: () => api.get('/research/history'),
  deleteHistory: (id: string) => api.delete(`/research/history/${id}`),
};
