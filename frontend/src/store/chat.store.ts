import { create } from 'zustand';
import { ChatMessage, Course, ChatSource } from '../types';
import { uuidv4 } from '../utils/uuid';

interface ChatStore {
  messages: ChatMessage[];
  currentChatId: string | null;
  selectedCourse: Course | null;
  isLoading: boolean;
  activeCitation: ChatSource | null;
  addMessage: (message: Omit<ChatMessage, 'id'>) => string;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setCurrentChatId: (id: string | null) => void;
  setSelectedCourse: (course: Course | null) => void;
  setLoading: (loading: boolean) => void;
  clearChat: () => void;
  loadMessages: (messages: ChatMessage[]) => void;
  setActiveCitation: (citation: ChatSource | null) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  currentChatId: null,
  selectedCourse: null,
  isLoading: false,
  activeCitation: null,

  addMessage: (message) => {
    const id = uuidv4();
    set((state) => ({
      messages: [...state.messages, { ...message, id }],
    }));
    return id;
  },

  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  },

  setCurrentChatId: (id) => set({ currentChatId: id }),
  setSelectedCourse: (course) => set({ selectedCourse: course }),
  setLoading: (loading) => set({ isLoading: loading }),
  clearChat: () => set({ messages: [], currentChatId: null, activeCitation: null }),
  loadMessages: (messages) => set({ messages }),
  setActiveCitation: (citation) => set({ activeCitation: citation }),
}));
