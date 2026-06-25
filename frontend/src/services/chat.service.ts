import api from './api';
import { ChatSession, Quiz, QuizResults } from '../types';
import { useAuthStore } from '../store/auth.store';

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
  queryStream: async (
    question: string,
    courseId: string,
    onToken: (token: string) => void,
    onDone: (data: Omit<QueryResponse, 'answer'>) => void,
    onError: (err: any) => void,
    chatId?: string
  ): Promise<void> => {
    try {
      const token = useAuthStore.getState().token;
      const response = await fetch('/api/chat/query-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ question, courseId, chatId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Save the last partial line back to the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('data: ')) {
            const dataStr = cleanLine.substring(6);
            if (dataStr) {
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === 'token') {
                  onToken(parsed.text);
                } else if (parsed.type === 'done') {
                  onDone(parsed);
                } else if (parsed.type === 'error') {
                  onError(new Error(parsed.message));
                }
              } catch (e) {
                console.warn('Failed to parse SSE JSON line:', dataStr, e);
              }
            }
          }
        }
      }
    } catch (err: any) {
      onError(err);
    }
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
