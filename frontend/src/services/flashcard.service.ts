import api from './api';

export interface Flashcard {
  _id: string;
  front: string;
  back: string;
  interval?: number;
  repetition?: number;
  efactor?: number;
  nextReview?: string;
}

export interface FlashcardDeck {
  _id: string;
  course: { _id: string; title: string; code: string };
  student: string;
  title: string;
  topic: string;
  cards: Flashcard[];
  createdAt: string;
}

export const flashcardService = {
  generate: async (params: { courseId: string; topic: string; count?: number }): Promise<FlashcardDeck> => {
    const { data } = await api.post('/flashcards/generate', params);
    return data.deck;
  },
  getMy: async (courseId?: string): Promise<FlashcardDeck[]> => {
    const { data } = await api.get('/flashcards/my', { params: { courseId } });
    return data.decks;
  },
  getById: async (id: string): Promise<FlashcardDeck> => {
    const { data } = await api.get(`/flashcards/${id}`);
    return data.deck;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/flashcards/${id}`);
  },
  review: async (deckId: string, cardId: string, score: number): Promise<FlashcardDeck> => {
    const { data } = await api.post(`/flashcards/${deckId}/cards/${cardId}/review`, { score });
    return data.deck;
  },
};
