/**
 * JobsDrawer.tsx
 * Slide-in panel (desktop right sidebar / mobile bottom sheet)
 * showing all background jobs with real-time progress bars.
 */
import React from 'react';
import { useJobsStore, BackgroundJob, JobStatus, JOB_TYPE_META, selectActiveJobCount } from '../../store/jobs.store';
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bg: string }> = {
  queued:    { label: 'Queued',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  running:   { label: 'Running',    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  completed: { label: 'Done',       color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
  failed:    { label: 'Failed',     color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  cancelled: { label: 'Cancelled',  color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
};

function elapsed(startedAt: string, completedAt?: string): string {
  const ms = new Date(completedAt ?? Date.now()).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

const JobCard: React.FC<{ job: BackgroundJob }> = ({ job }) => {
  const { updateJob, cancelJob, retryJob } = useJobsStore();
  const navigate = useNavigate();
  const meta = JOB_TYPE_META[job.type];
  const statusCfg = STATUS_CONFIG[job.status];

  return (
    <div
      className="p-3.5 rounded-xl border transition-all"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
          style={{ background: `${meta.color}18` }}
        >
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-white truncate">{job.label}</span>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
              style={{ color: statusCfg.color, background: statusCfg.bg }}
            >
              {statusCfg.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-white/30">{meta.label}</span>
            <span className="text-white/10">·</span>
            <span className="text-[10px] text-white/30">
              {elapsed(job.startedAt, job.completedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar (show when queued or running) */}
      {(job.status === 'queued' || job.status === 'running') && (
        <div className="mt-2.5 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${job.progress}%`,
              background: `linear-gradient(90deg, ${meta.color}, ${meta.color}88)`,
              animation: job.status === 'running' && job.progress < 95 ? 'progressPulse 2s ease-in-out infinite' : undefined,
            }}
          />
        </div>
      )}

      {/* Error message */}
      {job.status === 'failed' && job.error && (
        <p className="mt-2 text-[10px] text-red-400/70 bg-red-500/5 rounded-lg px-2 py-1 border border-red-500/10">
          {job.error}
        </p>
      )}

      {/* Action buttons */}
      <div className="mt-2.5 flex items-center gap-2">
        {job.status === 'completed' && job.link && (
          <button
            onClick={() => navigate(job.link!)}
            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
            style={{ background: `${meta.color}20`, color: meta.color }}
          >
            View Result →
          </button>
        )}
        {(job.status === 'queued' || job.status === 'running') && (
          <button
            onClick={() => cancelJob(job.id)}
            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg text-white/40 hover:text-red-400 transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            Cancel
          </button>
        )}
        {job.status === 'failed' && (
          <button
            onClick={() => retryJob(job.id)}
            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
            style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}
          >
            ↺ Retry
          </button>
        )}
      </div>
    </div>
  );
};

export const JobsDrawer: React.FC = () => {
  const { jobs, isDrawerOpen, closeDrawer, clearCompleted, clearAll } = useJobsStore();
  const activeCount = useJobsStore(selectActiveJobCount);

  if (!isDrawerOpen) return null;

  const active = jobs.filter((j) => j.status === 'queued' || j.status === 'running');
  const done   = jobs.filter((j) => j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled');

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className="fixed inset-0 z-[990] lg:hidden"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={closeDrawer}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full z-[991] flex flex-col"
        style={{
          width: '360px',
          maxWidth: '95vw',
          background: 'linear-gradient(180deg, #13151e 0%, #0f1119 100%)',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.6)',
          animation: 'jobsDrawerIn 0.3s cubic-bezier(0.34,1.1,0.64,1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.15)' }}
            >
              <span className="text-base">⚙️</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Background Jobs</h3>
              {activeCount > 0 && (
                <p className="text-[10px] text-blue-400">{activeCount} running</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {done.length > 0 && (
              <button
                onClick={clearCompleted}
                className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
              >
                Clear done
              </button>
            )}
            <button
              onClick={closeDrawer}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/08 transition-all"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Job list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {active.length === 0 && done.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                🌙
              </div>
              <div>
                <p className="text-xs font-bold text-white/30 uppercase tracking-wider">No active jobs</p>
                <p className="text-[10px] text-white/20 mt-1 max-w-[200px]">
                  Document processing, quiz generation, and other tasks appear here.
                </p>
              </div>
            </div>
          )}

          {active.length > 0 && (
            <>
              <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider px-0.5">Active</p>
              {active.map((job) => <JobCard key={job.id} job={job} />)}
            </>
          )}

          {done.length > 0 && (
            <>
              <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider px-0.5 pt-2">Completed</p>
              {done.map((job) => <JobCard key={job.id} job={job} />)}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes jobsDrawerIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes progressPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
      `}</style>
    </>
  );
};
