import api from './api';
import { User } from '../types';

export interface LoginCredentials { email: string; password: string; }
export interface RegisterCredentials { name: string; email: string; password: string; role: 'student' | 'faculty'; }
export interface AuthResponse { token: string; user: User; message: string; }

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/login', credentials);
    return data;
  },
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/register', credentials);
    return data;
  },
  getMe: async (): Promise<User> => {
    const { data } = await api.get('/auth/me');
    return data.user;
  },
};
