/**
 * history.store.ts
 * In-memory undo/history stack for reversible user actions.
 * NOT persisted to localStorage — resets on page reload for security.
 * Max 10 actions. Each action expires after 30 seconds.
 */
import { create } from 'zustand';

export interface UndoAction {
  id: string;
  description: string;
  /** Async function that reverses the action */
  undoFn: () => Promise<void>;
  /** When this action can no longer be undone */
  expiresAt: number;
  /** Whether the undo has already been executed */
  executed: boolean;
}

interface HistoryStore {
  stack: UndoAction[];

  /** Push a new undoable action onto the stack */
  pushAction: (action: Omit<UndoAction, 'id' | 'executed'>) => string;

  /** Execute the most recent un-executed undo */
  undo: () => Promise<boolean>;

  /** Remove expired actions */
  pruneExpired: () => void;

  /** Clear the entire stack */
  clearAll: () => void;
}

const MAX_STACK = 10;
const DEFAULT_TTL_MS = 30_000;

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  stack: [],

  pushAction: (action) => {
    const id = `undo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({
      stack: [
        { ...action, id, executed: false },
        ...state.stack,
      ].slice(0, MAX_STACK),
    }));
    return id;
  },

  undo: async () => {
    const { stack } = get();
    const now = Date.now();
    const actionToUndo = stack.find(
      (a) => !a.executed && a.expiresAt > now
    );
    if (!actionToUndo) return false;

    // Mark as executed before running to prevent double-undo
    set((state) => ({
      stack: state.stack.map((a) =>
        a.id === actionToUndo.id ? { ...a, executed: true } : a
      ),
    }));

    try {
      await actionToUndo.undoFn();
      return true;
    } catch {
      // Revert the executed flag on failure
      set((state) => ({
        stack: state.stack.map((a) =>
          a.id === actionToUndo.id ? { ...a, executed: false } : a
        ),
      }));
      return false;
    }
  },

  pruneExpired: () => {
    const now = Date.now();
    set((state) => ({
      stack: state.stack.filter((a) => a.expiresAt > now),
    }));
  },

  clearAll: () => set({ stack: [] }),
}));

/** Helper to create an expiry timestamp */
export const makeExpiry = (ttlMs = DEFAULT_TTL_MS) => Date.now() + ttlMs;
