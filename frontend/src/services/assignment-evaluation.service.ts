import api from './api';

export const assignmentEvaluationService = {
  evaluate: async (file: File, courseId: string, onProgress?: (p: number) => void): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', courseId);
    
    const { data } = await api.post('/assignment-evaluations/evaluate', formData, {
      headers: { 'Content-Type': undefined },
      onUploadProgress: (evt) => {
        if (evt.total && onProgress) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    });
    return data.evaluation;
  },

  getHistory: async (courseId?: string): Promise<any[]> => {
    const { data } = await api.get('/assignment-evaluations/history', {
      params: { courseId },
    });
    return data.evaluations;
  },

  getById: async (id: string): Promise<any> => {
    const { data } = await api.get(`/assignment-evaluations/${id}`);
    return data.evaluation;
  },
};
