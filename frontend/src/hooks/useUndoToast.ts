/**
 * useUndoToast.ts
 * Hook for the optimistic-delete + undo toast pattern.
 *
 * Usage:
 *   const { deleteWithUndo } = useUndoToast();
 *   await deleteWithUndo({
 *     description: 'Bookmark deleted',
 *     onDelete: async () => { await bookmarkService.delete(id); },
 *     onUndo: async () => { await bookmarkService.create(data); },
 *     onUpdate: () => { setBookmarks(prev => prev.filter(b => b._id !== id)); },
 *     onRevert: () => { setBookmarks(prev => [item, ...prev]); },
 *   });
 */
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useHistoryStore, makeExpiry } from '../store/history.store';

const UNDO_WINDOW_MS = 8000;

interface UndoOptions {
  /** Short description shown in the toast */
  description: string;
  /** Optimistic UI update (runs immediately) */
  onUpdate: () => void;
  /** Called to restore UI if undo is triggered */
  onRevert: () => void;
  /** Called to perform the actual server delete (after toast expires) */
  onDelete: () => Promise<void>;
  /** Called to re-create the item on the server (when undo is tapped) */
  onUndo: () => Promise<void>;
}

export function useUndoToast() {
  const { pushAction, undo } = useHistoryStore();

  const deleteWithUndo = useCallback(async (options: UndoOptions) => {
    const { description, onUpdate, onRevert, onDelete, onUndo } = options;

    // 1. Apply optimistic UI update immediately
    onUpdate();

    // 2. Track timer — we store a ref inside the closure
    let undone = false;
    let deleteTimer: ReturnType<typeof setTimeout> | null = null;

    // 3. Register in the undo history store (for Ctrl+Z)
    pushAction({
      description,
      expiresAt: makeExpiry(UNDO_WINDOW_MS),
      undoFn: async () => {
        undone = true;
        if (deleteTimer) clearTimeout(deleteTimer);
        onRevert();
        await onUndo();
        toast.success(`↩ ${description} reversed`, { duration: 3000 });
      },
    });

    // 4. Show undo toast with countdown bar
    toast(
      (t) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#f0f2f8', margin: 0 }}>
              {description}
            </p>
            {/* Countdown bar */}
            <div style={{ marginTop: '6px', height: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #4f63ff, #7c3aed)',
                  borderRadius: '2px',
                  animation: `undoCountdown ${UNDO_WINDOW_MS}ms linear forwards`,
                }}
              />
            </div>
          </div>
          <button
            onClick={async () => {
              undone = true;
              if (deleteTimer) clearTimeout(deleteTimer);
              toast.dismiss(t.id);
              onRevert();
              try {
                await onUndo();
                toast.success(`↩ ${description} reversed`, { duration: 3000 });
              } catch {
                toast.error('Failed to undo. Please refresh.');
              }
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(79,99,255,0.2)',
              border: '1px solid rgba(79,99,255,0.3)',
              color: '#7c8fff',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Undo
          </button>
        </div>
      ),
      {
        id: `undo-${Date.now()}`,
        duration: UNDO_WINDOW_MS,
        style: {
          background: '#1a1d27',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#f0f2f8',
          borderRadius: '14px',
          padding: '12px 14px',
          maxWidth: '380px',
        },
      }
    );

    // 5. After undo window, perform the actual server delete
    deleteTimer = setTimeout(async () => {
      if (undone) return;
      try {
        await onDelete();
      } catch {
        // Revert UI silently if delete failed
        onRevert();
        toast.error(`Failed to delete. ${description} restored.`);
      }
    }, UNDO_WINDOW_MS + 200);
  }, [pushAction]);

  return { deleteWithUndo };
}
