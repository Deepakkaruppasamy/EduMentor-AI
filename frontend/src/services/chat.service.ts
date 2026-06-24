import api from './api';
import { ChatSession, Quiz, QuizResults } from '../types';

export interface QueryResponse {
  chatId: string;
  answer: string;
  hallucination: {
    trustScore: number;
    status: string;
    verdict: string;
    flags: string[];
  };
  explainability: {
    sources: any[];
    overallConfidence: number;
    retrievalMethod: string;
    explanationSummary: string;
  };
}

export const chatService = {
  query: async (question: string, courseId: string, chatId?: string): Promise<QueryResponse> => {
    const { data } = await api.post('/chat/query', { question, courseId, chatId });
    return data;
  },
  getHistory: async (courseId?: string): Promise<ChatSession[]> => {
    const { data } = await api.get('/chat/history', { params: { courseId } });
    return data.chats;
  },
  getById: async (id: string): Promise<any> => {
    const { data } = await api.get(`/chat/${id}`);
    return data.chat;
  },
  rename: async (id: string, title: string): Promise<any> => {
    const { data } = await api.put(`/chat/${id}/rename`, { title });
    return data.chat;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/chat/${id}`);
  },
};

export const quizService = {
  generate: async (params: {
    courseId: string;
    topic: string;
    questionType: string;
    difficulty: string;
    count: number;
  }): Promise<Quiz> => {
    const { data } = await api.post('/quiz/generate', params);
    return data.quiz;
  },
  evaluate: async (quizId: string, answers: Record<number, string>): Promise<{ quiz: Quiz; results: QuizResults }> => {
    const { data } = await api.post('/quiz/evaluate', { quizId, answers });
    return { quiz: data.quiz, results: data.results };
  },
  getMy: async (courseId?: string): Promise<Quiz[]> => {
    const { data } = await api.get('/quiz/my', { params: { courseId } });
    return data.quizzes;
  },
  getById: async (id: string): Promise<Quiz> => {
    const { data } = await api.get(`/quiz/${id}`);
    return data.quiz;
  },
};
