import api from '../../../services/api';

export interface ActionPayload {
  selectedText: string;
  metadata: any;
  options?: any;
}

export const actionsService = {
  explain: async (payload: ActionPayload) => {
    const res = await api.post('/contextual-actions/explain', payload);
    return res.data;
  },

  generateQuiz: async (payload: ActionPayload) => {
    const res = await api.post('/contextual-actions/generate-quiz', payload);
    return res.data;
  },

  generateFlashcards: async (payload: ActionPayload) => {
    const res = await api.post('/contextual-actions/generate-flashcards', payload);
    return res.data;
  },

  translate: async (payload: ActionPayload) => {
    const res = await api.post('/contextual-actions/translate', payload);
    return res.data;
  },

  citation: async (payload: ActionPayload) => {
    const res = await api.post('/contextual-actions/citation', payload);
    return res.data;
  },

  assignmentFeedback: async (payload: ActionPayload) => {
    const res = await api.post('/contextual-actions/assignment-feedback', payload);
    return res.data;
  },

  explainMistakes: async (payload: ActionPayload) => {
    const res = await api.post('/contextual-actions/explain-mistakes', payload);
    return res.data;
  },
};

