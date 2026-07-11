/**
 * jobs.store.ts
 * Persistent background job tracking for document processing,
 * assignment evaluation, plagiarism checks, AI note generation, etc.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type JobType =
  | 'document_index'
  | 'assignment_eval'
  | 'plagiarism_check'
  | 'ai_notes'
  | 'quiz_gen'
  | 'research'
  | 'ai_evaluation';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BackgroundJob {
  id: string;
  type: JobType;
  label: string;
  status: JobStatus;
  /** 0–100 */
  progress: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
  /** Optional navigation link when job completes */
  link?: string;
  metadata?: Record<string, unknown>;
}

interface JobsStore {
  jobs: BackgroundJob[];
  isDrawerOpen: boolean;

  addJob: (job: Omit<BackgroundJob, 'id' | 'startedAt' | 'progress'> & { progress?: number }) => string;
  updateJob: (id: string, patch: Partial<BackgroundJob>) => void;
  cancelJob: (id: string) => void;
  retryJob: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

export const useJobsStore = create<JobsStore>()(
  persist(
    (set, get) => ({
      jobs: [],
      isDrawerOpen: false,

      addJob: (jobData) => {
        const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const job: BackgroundJob = {
          ...jobData,
          id,
          progress: jobData.progress ?? 0,
          startedAt: new Date().toISOString(),
        };
        set((state) => ({ jobs: [job, ...state.jobs].slice(0, 50) }));
        return id;
      },

      updateJob: (id, patch) =>
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === id
              ? {
                  ...j,
                  ...patch,
                  completedAt:
                    (patch.status === 'completed' || patch.status === 'failed')
                      ? new Date().toISOString()
                      : j.completedAt,
                }
              : j
          ),
        })),

      cancelJob: (id) =>
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === id && (j.status === 'queued' || j.status === 'running')
              ? { ...j, status: 'cancelled', completedAt: new Date().toISOString() }
              : j
          ),
        })),

      retryJob: (id) => {
        const job = get().jobs.find((j) => j.id === id);
        if (!job) return;
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === id
              ? { ...j, status: 'queued', progress: 0, error: undefined, completedAt: undefined, startedAt: new Date().toISOString() }
              : j
          ),
        }));
      },

      clearCompleted: () =>
        set((state) => ({
          jobs: state.jobs.filter((j) => j.status !== 'completed' && j.status !== 'cancelled'),
        })),

      clearAll: () => set({ jobs: [] }),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
    }),
    {
      name: 'edumentor-jobs',
      storage: createJSONStorage(() => localStorage),
      // Only persist jobs array (not drawer state)
      partialize: (state) => ({ jobs: state.jobs }),
    }
  )
);

// Derived selectors
export const selectActiveJobCount = (state: JobsStore) =>
  state.jobs.filter((j) => j.status === 'queued' || j.status === 'running').length;

export const selectHasActiveJobs = (state: JobsStore) =>
  state.jobs.some((j) => j.status === 'queued' || j.status === 'running');

export const JOB_TYPE_META: Record<JobType, { icon: string; label: string; color: string }> = {
  document_index:  { icon: '📄', label: 'Document Indexing',   color: '#3b82f6' },
  assignment_eval: { icon: '📋', label: 'Assignment Grading',  color: '#10b981' },
  plagiarism_check:{ icon: '🔍', label: 'Plagiarism Check',    color: '#f59e0b' },
  ai_notes:        { icon: '📓', label: 'AI Notes Generation', color: '#8b5cf6' },
  quiz_gen:        { icon: '📝', label: 'Quiz Generation',     color: '#ec4899' },
  research:        { icon: '🔬', label: 'Research Analysis',   color: '#06b6d4' },
  ai_evaluation:   { icon: '🧪', label: 'AI Evaluation',      color: '#f97316' },
};
