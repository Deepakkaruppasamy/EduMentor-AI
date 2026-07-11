import React from 'react';
import { getLatestCorrelationId } from '../../services/errorLogger';

interface RouteErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

export const RouteErrorFallback: React.FC<RouteErrorFallbackProps> = ({ error, onReset }) => {
  const correlationId = getLatestCorrelationId();

  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[400px] text-center">
      <div className="glass-card max-w-md p-8 border border-red-500/20" style={{ background: 'rgba(239, 68, 68, 0.02)' }}>
        {/* Warning Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
          style={{ background: 'rgba(239, 68, 68, 0.12)' }}
        >
          ⚠️
        </div>

        <h3 className="text-base font-bold text-white leading-snug">Something went wrong</h3>
        <p className="text-xs text-white/50 mt-2 leading-relaxed">
          An error occurred while loading this section of the page. You can try refreshing the view.
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-black/40 text-left border border-white/5 overflow-x-auto max-h-[120px]">
            <code className="text-[10px] text-red-400 font-mono block whitespace-pre-wrap">
              {error.name}: {error.message}
            </code>
          </div>
        )}

        {correlationId && (
          <div className="mt-4 flex flex-col gap-1 items-center">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-white/20">Support ID</span>
            <span className="text-[10px] font-mono text-indigo-400 font-bold px-2 py-0.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 select-all">
              {correlationId}
            </span>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={onReset}
            className="text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl transition-all"
            style={{
              background: 'linear-gradient(135deg, #4f63ff, #7c3aed)',
              boxShadow: '0 4px 12px rgba(79, 99, 255, 0.2)',
            }}
          >
            Retry View
          </button>
          <button
            onClick={() => window.location.reload()}
            className="text-xs font-bold text-white/60 hover:text-white bg-white/5 px-4 py-2 rounded-xl transition-all"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
};
