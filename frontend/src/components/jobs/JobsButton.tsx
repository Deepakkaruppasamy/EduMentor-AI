/**
 * JobsButton.tsx
 * Floating button that opens the JobsDrawer.
 * Shows a pulsing badge with active job count.
 * Positioned above the AI Assistant widget.
 */
import React from 'react';
import { useJobsStore, selectActiveJobCount, selectHasActiveJobs } from '../../store/jobs.store';

export const JobsButton: React.FC = () => {
  const { jobs, toggleDrawer } = useJobsStore();
  const activeCount = useJobsStore(selectActiveJobCount);
  const hasActive = useJobsStore(selectHasActiveJobs);

  // Only show when there are any jobs
  if (jobs.length === 0) return null;

  return (
    <button
      id="jobs-float-btn"
      onClick={toggleDrawer}
      aria-label={`Background jobs${activeCount > 0 ? `, ${activeCount} active` : ''}`}
      className="fixed z-[985] flex items-center justify-center rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95"
      style={{
        bottom: '88px',  /* Above AI assistant widget */
        right: '20px',
        width: '52px',
        height: '52px',
        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
        border: '1px solid rgba(59,130,246,0.25)',
        boxShadow: hasActive
          ? '0 8px 32px rgba(59,130,246,0.3), 0 0 0 1px rgba(59,130,246,0.1)'
          : '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Gear icon */}
      <svg
        className="w-5 h-5 text-blue-400"
        style={{ animation: hasActive ? 'spin 3s linear infinite' : undefined }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>

      {/* Active count badge */}
      {activeCount > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[9px] font-black text-white rounded-full px-1"
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            boxShadow: '0 0 8px rgba(59,130,246,0.7)',
            animation: 'jobsBadgePop 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          {activeCount > 9 ? '9+' : activeCount}
        </span>
      )}

      {/* Pulsing ring when jobs are running */}
      {hasActive && (
        <span
          className="absolute inset-0 rounded-2xl"
          style={{
            animation: 'jobsRing 2s ease-out infinite',
            border: '2px solid rgba(59,130,246,0.4)',
          }}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes jobsBadgePop {
          0%   { transform: scale(0); }
          60%  { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @keyframes jobsRing {
          0%   { transform: scale(1);    opacity: 0.8; }
          100% { transform: scale(1.45); opacity: 0;   }
        }
      `}</style>
    </button>
  );
};
