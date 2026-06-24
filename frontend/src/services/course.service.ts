import api from './api';
import { Course } from '../types';

export const courseService = {
  getAll: async (): Promise<Course[]> => {
    const { data } = await api.get('/course/all');
    return data.courses;
  },
  getMy: async (): Promise<Course[]> => {
    const { data } = await api.get('/course/my');
    return data.courses;
  },
  getById: async (id: string): Promise<Course> => {
    const { data } = await api.get(`/course/${id}`);
    return data.course;
  },
  create: async (courseData: Partial<Course>): Promise<Course> => {
    const { data } = await api.post('/course/create', courseData);
    return data.course;
  },
  enroll: async (courseId: string): Promise<void> => {
    await api.post('/course/enroll', { courseId });
  },
  seed: async (): Promise<Course[]> => {
    const { data } = await api.post('/course/seed');
    return data.courses;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/course/${id}`);
  },
};
