import api from './api';
import { Document } from '../types';

export const documentService = {
  upload: async (file: File, courseId: string, onProgress?: (p: number) => void): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', courseId);
    const { data } = await api.post('/document/upload', formData, {
      headers: { 'Content-Type': undefined },
      onUploadProgress: (evt) => {
        if (evt.total && onProgress) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    });
    return data.document;
  },
  getAll: async (courseId?: string): Promise<Document[]> => {
    const { data } = await api.get('/document/all', { params: { courseId } });
    return data.documents;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/document/${id}`);
  },
};
