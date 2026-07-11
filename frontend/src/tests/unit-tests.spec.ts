// Self-contained test runner
const suites: { name: string; tests: { name: string; fn: () => void | Promise<void> }[] }[] = [];
let currentSuite: string | null = null;

export function describe(name: string, fn: () => void) {
  currentSuite = name;
  suites.push({ name, tests: [] });
  fn();
}

export function it(name: string, fn: () => void | Promise<void>) {
  const suite = suites.find(s => s.name === currentSuite);
  if (suite) {
    suite.tests.push({ name, fn });
  }
}

export function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected value to be defined`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected value to be null`);
      }
    },
    not: {
      toBe(expected: any) {
        if (actual === expected) {
          throw new Error(`Expected ${actual} not to be ${expected}`);
        }
      }
    }
  };
}

import { isQueueable } from '../services/offlineQueue';
import { useJobsStore } from '../store/jobs.store';
import { useHistoryStore, makeExpiry } from '../store/history.store';
import { useOnboardingStore } from '../store/onboarding.store';
import { generateCorrelationId } from '../services/correlationId';

// Mock browser globals for node testing
if (typeof window === 'undefined') {
  (global as any).window = { location: { origin: 'http://localhost:3000' } };
}

describe('EduMentor AI — Advanced Features Unit Tests', () => {
  
  // ─── 1. Offline Sync Whitelist Filters ───
  describe('Offline Sync Whitelist Tests', () => {
    it('should queue safe mutation URLs', () => {
      expect(isQueueable('/api/preferences', 'PUT')).toBe(true);
      expect(isQueueable('/api/bookmarks', 'POST')).toBe(true);
      expect(isQueueable('/api/bookmarks/123', 'DELETE')).toBe(true);
      expect(isQueueable('/api/flashcards/456/review', 'POST')).toBe(true);
    });

    it('should reject unsafe/sensitive mutation URLs', () => {
      expect(isQueueable('/api/auth/login', 'POST')).toBe(false);
      expect(isQueueable('/api/auth/reset-password', 'POST')).toBe(false);
      expect(isQueueable('/api/users/profile', 'PUT')).toBe(false);
      expect(isQueueable('/api/preferences', 'GET')).toBe(false); // Only mutations are queued
    });
  });

  // ─── 2. Background Job State Transitions ───
  describe('Background Jobs State Machine Tests', () => {
    beforeEach(() => {
      useJobsStore.getState().clearAll();
    });

    it('should initialize a job as queued and transition to running then completed', () => {
      const store = useJobsStore.getState();
      const jobId = store.addJob({
        type: 'document_index',
        label: 'Lecture Notes.pdf',
        status: 'queued',
        progress: 0,
      });

      let job = store.jobs.find(j => j.id === jobId);
      expect(job).toBeDefined();
      expect(job?.status).toBe('queued');
      expect(job?.progress).toBe(0);

      // Transition to running
      store.updateJob(jobId, { status: 'running', progress: 45 });
      job = store.jobs.find(j => j.id === jobId);
      expect(job?.status).toBe('running');
      expect(job?.progress).toBe(45);

      // Transition to completed
      store.updateJob(jobId, { status: 'completed', progress: 100 });
      job = store.jobs.find(j => j.id === jobId);
      expect(job?.status).toBe('completed');
      expect(job?.progress).toBe(100);
      expect(job?.completedAt).toBeDefined();
    });

    it('should handle job cancellation and retry states', () => {
      const store = useJobsStore.getState();
      const jobId = store.addJob({
        type: 'quiz_gen',
        label: 'DBMS Quiz',
        status: 'running',
        progress: 30,
      });

      store.cancelJob(jobId);
      let job = store.jobs.find(j => j.id === jobId);
      expect(job?.status).toBe('cancelled');

      // Retry should reset progress & status
      store.retryJob(jobId);
      job = store.jobs.find(j => j.id === jobId);
      expect(job?.status).toBe('queued');
      expect(job?.progress).toBe(0);
    });
  });

  // ─── 3. Undo / History Stack Safety ───
  describe('Undo/History Stack Tests', () => {
    beforeEach(() => {
      useHistoryStore.getState().clearAll();
    });

    it('should cap history stack at max depth (10)', () => {
      const store = useHistoryStore.getState();
      for (let i = 0; i < 15; i++) {
        store.pushAction({
          description: `Delete item ${i}`,
          expiresAt: makeExpiry(30000),
          undoFn: async () => {},
        });
      }
      expect(store.stack.length).toBe(10);
      expect(store.stack[0].description).toBe('Delete item 14');
    });

    it('should execute the undo action and mark it executed', async () => {
      const store = useHistoryStore.getState();
      let undoTriggered = false;

      store.pushAction({
        description: 'Delete Bookmark',
        expiresAt: makeExpiry(30000),
        undoFn: async () => { undoTriggered = true; },
      });

      const success = await store.undo();
      expect(success).toBe(true);
      expect(undoTriggered).toBe(true);
      expect(store.stack[0].executed).toBe(true);
    });

    it('should prune expired actions', () => {
      const store = useHistoryStore.getState();
      
      store.pushAction({
        description: 'Active Action',
        expiresAt: Date.now() + 10000,
        undoFn: async () => {},
      });

      store.pushAction({
        description: 'Expired Action',
        expiresAt: Date.now() - 1000, // already expired
        undoFn: async () => {},
      });

      store.pruneExpired();
      expect(store.stack.length).toBe(1);
      expect(store.stack[0].description).toBe('Active Action');
    });
  });

  // ─── 4. Onboarding Tours Persistence ───
  describe('Onboarding Tours Persistence Tests', () => {
    beforeEach(() => {
      useOnboardingStore.getState().resetAllTours();
    });

    it('should start a tour and persist completion flag', () => {
      const store = useOnboardingStore.getState();
      const mockSteps = [
        { targetId: 'welcome', title: 'Hello', description: 'Step 1' },
        { targetId: 'profile', title: 'User Settings', description: 'Step 2' },
      ];

      store.startTour('student-dashboard', mockSteps);
      expect(store.activeTour).toBe('student-dashboard');
      expect(store.currentStep).toBe(0);

      store.nextStep();
      expect(store.currentStep).toBe(1);

      // Finish the tour
      store.nextStep();
      expect(store.activeTour).toBeNull();
      expect(store.hasTourCompleted('student-dashboard')).toBe(true);
    });
  });

  // ─── 5. Error Recovery & Correlation IDs ───
  describe('Error Recovery & Correlation ID Tests', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1.split('-').length).toBe(3); // userId-timestamp-rand
    });
  });
});

// Auto-run if executed under node environment directly
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('unit-tests.spec.ts')) {
  (async () => {
    console.log('\n=== EduMentor AI Features Test Suite ===');
    let total = 0;
    let passed = 0;
    let failed = 0;

    for (const suite of suites) {
      console.log(`\nSuite: ${suite.name}`);
      for (const test of suite.tests) {
        total++;
        try {
          await test.fn();
          console.log(`  ✓ ${test.name}`);
          passed++;
        } catch (err: any) {
          console.error(`  ✗ ${test.name}\n    Error: ${err.message}`);
          failed++;
        }
      }
    }

    console.log(`\nResults: ${passed}/${total} passed (${failed} failed).\n`);
    process.exit(failed > 0 ? 1 : 0);
  })();
}

