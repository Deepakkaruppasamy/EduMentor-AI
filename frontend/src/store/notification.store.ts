import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AppNotification {
  id: string;
  type: 'quiz_assigned' | 'live_battle' | 'document_status' | 'evaluation';
  title: string;
  message: string;
  courseCode?: string;
  link?: string;
  isRead: boolean;
  timestamp: string;
}

interface NotificationStore {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'isRead' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      notifications: [],

      addNotification: (notification) => {
        const newNotif: AppNotification = {
          ...notification,
          id: Math.random().toString(36).substring(2, 9),
          isRead: false,
          timestamp: new Date().toISOString(),
        };

        set((state) => {
          // Keep only the last 30 notifications to prevent storage bloat
          const updated = [newNotif, ...state.notifications].slice(0, 30);
          return { notifications: updated };
        });
      },

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        })),

      clearAll: () => set({ notifications: [] }),

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
    }),
    {
      name: 'edumentor-notifications',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
