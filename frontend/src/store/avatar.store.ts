// Avatar System Zustand Store
// Modular — independent from all other stores
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  AvatarConfig,
  AvatarExpression,
  AvatarPose,
  DEFAULT_MALE_CONFIG,
} from '../types/avatar.types';

interface AvatarInteractionState {
  currentExpression: AvatarExpression;
  currentPose: AvatarPose;
  isAnimating: boolean;
  animationName: string;
  eyeTarget: { x: number; y: number };
  mood: 'idle' | 'happy' | 'thinking' | 'excited' | 'waving';
}

interface AvatarStore {
  config: AvatarConfig;
  interaction: AvatarInteractionState;
  isCustomizerOpen: boolean;

  // Config actions
  updateConfig: (partial: Partial<AvatarConfig>) => void;
  resetConfig: () => void;

  // Interaction actions
  setExpression: (expr: AvatarExpression) => void;
  setPose: (pose: AvatarPose) => void;
  setMood: (mood: AvatarInteractionState['mood']) => void;
  setEyeTarget: (x: number, y: number) => void;
  triggerAnimation: (name: string) => void;
  clearAnimation: () => void;

  // UI
  setCustomizerOpen: (open: boolean) => void;
}

export const useAvatarStore = create<AvatarStore>()(
  persist(
    (set) => ({
      config: DEFAULT_MALE_CONFIG,
      interaction: {
        currentExpression: 'neutral',
        currentPose: 'standing',
        isAnimating: false,
        animationName: '',
        eyeTarget: { x: 0, y: 0 },
        mood: 'idle',
      },
      isCustomizerOpen: false,

      updateConfig: (partial) =>
        set((state) => ({ config: { ...state.config, ...partial } })),

      resetConfig: () =>
        set({ config: DEFAULT_MALE_CONFIG }),

      setExpression: (expr) =>
        set((state) => ({
          interaction: { ...state.interaction, currentExpression: expr },
        })),

      setPose: (pose) =>
        set((state) => ({
          interaction: { ...state.interaction, currentPose: pose },
          config: { ...state.config, pose },
        })),

      setMood: (mood) =>
        set((state) => ({
          interaction: { ...state.interaction, mood },
        })),

      setEyeTarget: (x, y) =>
        set((state) => ({
          interaction: { ...state.interaction, eyeTarget: { x, y } },
        })),

      triggerAnimation: (name) =>
        set((state) => ({
          interaction: { ...state.interaction, isAnimating: true, animationName: name },
        })),

      clearAnimation: () =>
        set((state) => ({
          interaction: { ...state.interaction, isAnimating: false, animationName: '' },
        })),

      setCustomizerOpen: (open) => set({ isCustomizerOpen: open }),
    }),
    {
      name: 'edumentor-avatar',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ config: state.config }),
    }
  )
);
