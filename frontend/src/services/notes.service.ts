import api from './api';

export const notesService = {
  generate: (data: { courseName: string; courseId?: string; topic: string; noteType: string }) =>
    api.post('/notes/generate', data),
  getMyNotes: (params?: { noteType?: string; search?: string }) =>
    api.get('/notes/my', { params }),
  deleteNote: (id: string) => api.delete(`/notes/${id}`),
};
