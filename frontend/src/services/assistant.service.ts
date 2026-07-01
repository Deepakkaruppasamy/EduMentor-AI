import api from './api';

export const assistantService = {
  chat: async (
    message: string,
    pageContext: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[]
  ): Promise<{ reply: string }> => {
    const res = await api.post('/assistant/chat', {
      message,
      pageContext,
      conversationHistory,
    });
    return res.data;
  },
};
