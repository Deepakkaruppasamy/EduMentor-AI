/**
 * SyncStatusBar.tsx
 * Shows the offline sync status below the offline banner in Layout.
 * Only visible when offline, syncing, or when there are pending/errored items.
 */
import React, { useState } from 'react';
import { useSyncStore } from '../../store/sync.store';
import { getAllPending, clearAll as clearQueue } from '../../services/offlineQueue';
import { useAuthStore } from '../../store/auth.store';

export const SyncStatusBar: React.FC = () => {
  const { status, pendingCount, lastSynced, errors, clearErrors } = useSyncStore();
  const [showDetails, setShowDetails] = useState(false);
  const { user } = useAuthStore();

  // Only show when there's something interesting to report
  const shouldShow =
    status === 'offline' ||
    status === 'syncing' ||
    status === 'error' ||
    pendingCount > 0;

  if (!shouldShow) return null;

  const handleClearQueue = async () => {
    await clearQueue();
    clearErrors();
  };

  const config = {
    offline:  { dot: '#f59e0b', text: 'Offline',        bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)' },
    syncing:  { dot: '#3b82f6', text: 'Syncing…',       bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
    error:    { dot: '#ef4444', text: 'Sync error',     bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)'  },
    online:   { dot: '#22c55e', text: 'Synced',         bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.2)'  },
  }[status];

  return (
    <>
      <div
        className="flex items-center justify-between px-4 py-1.5 text-[11px] font-medium cursor-pointer select-none"
        style={{ background: config.bg, borderBottom: `1px solid ${config.border}` }}
        onClick={() => setShowDetails((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: config.dot,
              boxShadow: status === 'syncing' ? `0 0 6px ${config.dot}` : undefined,
              animation: status === 'syncing' ? 'pulse 1s ease-in-out infinite' : undefined,
            }}
          />
          <span style={{ color: config.dot }}>{config.text}</span>
          {pendingCount > 0 && (
            <span className="text-white/40">
              · {pendingCount} action{pendingCount !== 1 ? 's' : ''} queued
            </span>
          )}
          {lastSynced && status === 'online' && (
            <span className="text-white/30">
              · Last synced {new Date(lastSynced).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-white/30">
          {errors.length > 0 && (
            <span className="text-red-400">{errors.length} error{errors.length !== 1 ? 's' : ''}</span>
          )}
          <svg
            className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded detail panel */}
      {showDetails && (
        <div
          className="px-4 py-3 text-[11px] space-y-2"
          style={{ background: 'rgba(10,11,15,0.6)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          {pendingCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-white/50">
                {pendingCount} mutation{pendingCount !== 1 ? 's' : ''} will sync when online
              </span>
              <button
                onClick={handleClearQueue}
                className="text-red-400/70 hover:text-red-400 transition-colors text-[10px] font-semibold"
              >
                Clear Queue
              </button>
            </div>
          )}
          {errors.length > 0 && (
            <div className="space-y-1">
              {errors.slice(0, 3).map((err) => (
                <div key={err.id} className="flex items-start gap-2 text-red-400/70">
                  <span>⚠</span>
                  <span className="flex-1">{err.message}</span>
                  <span className="text-white/20 flex-shrink-0">
                    {new Date(err.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              <button
                onClick={clearErrors}
                className="text-white/30 hover:text-white/50 transition-colors"
              >
                Clear errors
              </button>
            </div>
          )}
          {pendingCount === 0 && errors.length === 0 && (
            <span className="text-white/30">No pending actions.</span>
          )}
        </div>
      )}
    </>
  );
};
