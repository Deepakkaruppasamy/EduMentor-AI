/**
 * onboarding.store.ts
 * Tracks feature tour completion and current tour state.
 * Persisted to localStorage so tours don't repeat after completion.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type TourId = 'student-dashboard' | 'faculty-dashboard' | 'admin-dashboard';

export interface TourStep {
  /** DOM element ID to spotlight */
  targetId: string;
  title: string;
  description: string;
  /** Positioning hint for the tooltip */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface OnboardingStore {
  /** IDs of tours the user has fully completed */
  completedTours: TourId[];
  /** Currently active tour, null if none */
  activeTour: TourId | null;
  /** Steps of the currently active tour */
  activeSteps: TourStep[];
  /** Current step index (0-based) */
  currentStep: number;

  startTour: (tourId: TourId, steps: TourStep[]) => void;
  nextStep: () => void;
  prevStep: () => void;
  completeTour: () => void;
  skipTour: () => void;
  resetTour: (tourId: TourId) => void;
  resetAllTours: () => void;
  hasTourCompleted: (tourId: TourId) => boolean;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      completedTours: [],
      activeTour: null,
      activeSteps: [],
      currentStep: 0,

      startTour: (tourId, steps) =>
        set({
          activeTour: tourId,
          activeSteps: steps,
          currentStep: 0,
        }),

      nextStep: () => {
        const { currentStep, activeSteps, completeTour } = get();
        if (currentStep >= activeSteps.length - 1) {
          completeTour();
        } else {
          set({ currentStep: currentStep + 1 });
        }
      },

      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 0) set({ currentStep: currentStep - 1 });
      },

      completeTour: () => {
        const { activeTour, completedTours } = get();
        if (!activeTour) return;
        set({
          completedTours: completedTours.includes(activeTour)
            ? completedTours
            : [...completedTours, activeTour],
          activeTour: null,
          activeSteps: [],
          currentStep: 0,
        });
      },

      skipTour: () =>
        set({
          activeTour: null,
          activeSteps: [],
          currentStep: 0,
        }),

      resetTour: (tourId) =>
        set((state) => ({
          completedTours: state.completedTours.filter((t) => t !== tourId),
        })),

      resetAllTours: () => set({ completedTours: [], activeTour: null }),

      hasTourCompleted: (tourId) => get().completedTours.includes(tourId),
    }),
    {
      name: 'edumentor-onboarding',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ completedTours: state.completedTours }),
    }
  )
);
