import api from './api';

export const studyPlannerService = {
  generate: (data: { examDate: string; subjects: string[]; dailyHours: number; preferredTime: string }) =>
    api.post('/study-planner/generate', data),
  getMyPlans: () => api.get('/study-planner/my'),
  deletePlan: (id: string) => api.delete(`/study-planner/${id}`),
};
