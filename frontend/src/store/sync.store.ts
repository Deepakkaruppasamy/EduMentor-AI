/**
 * sync.store.ts
 * Tracks the PWA offline sync status globally.
 * Used by SyncStatusBar, Layout, and offlineQueue.
 */
import { create } from 'zustand';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

export interface SyncError {
  id: string;
  tag: string;
  message: string;
  timestamp: string;
}

interface SyncStore {
  status: SyncStatus;
  pendingCount: number;
  lastSynced: string | null;
  errors: SyncError[];

  setStatus: (status: SyncStatus) => void;
  setPendingCount: (count: number) => void;
  setLastSynced: (ts: string) => void;
  addError: (err: Omit<SyncError, 'id'>) => void;
  clearErrors: () => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  status: navigator.onLine ? 'online' : 'offline',
  pendingCount: 0,
  lastSynced: null,
  errors: [],

  setStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSynced: (lastSynced) => set({ lastSynced }),
  addError: (err) =>
    set((state) => ({
      errors: [
        { ...err, id: Math.random().toString(36).slice(2) },
        ...state.errors,
      ].slice(0, 10),
    })),
  clearErrors: () => set({ errors: [] }),
}));
