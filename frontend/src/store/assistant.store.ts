import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AssistantStore {
  isOpen: boolean;
  isMinimized: boolean;
  messages: AssistantMessage[];
  hasUnread: boolean;
  isLoading: boolean;

  open: () => void;
  close: () => void;
  toggle: () => void;
  minimize: () => void;
  restore: () => void;
  addMessage: (msg: Omit<AssistantMessage, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  setLoading: (loading: boolean) => void;
  markRead: () => void;
}

export const useAssistantStore = create<AssistantStore>()(
  persist(
    (set) => ({
      isOpen: false,
      isMinimized: false,
      messages: [],
      hasUnread: false,
      isLoading: false,

      open: () => set({ isOpen: true, isMinimized: false, hasUnread: false }),
      close: () => set({ isOpen: false }),
      toggle: () =>
        set((state) => ({
          isOpen: !state.isOpen,
          isMinimized: false,
          hasUnread: state.isOpen ? state.hasUnread : false,
        })),
      minimize: () => set({ isMinimized: true }),
      restore: () => set({ isMinimized: false }),

      addMessage: (msg) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...msg,
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              timestamp: new Date().toISOString(),
            },
          ],
          hasUnread: msg.role === 'assistant' ? !state.isOpen : state.hasUnread,
        })),

      clearHistory: () => set({ messages: [] }),
      setLoading: (loading) => set({ isLoading: loading }),
      markRead: () => set({ hasUnread: false }),
    }),
    {
      name: 'edumentor-assistant',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        messages: state.messages.slice(-30), // persist last 30 messages only
      }),
    }
  )
);
