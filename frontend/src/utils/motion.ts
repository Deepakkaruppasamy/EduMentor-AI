/**
 * motion.ts — EduMentor AI Unified Motion Design System
 *
 * A single source-of-truth for all Framer Motion variants, transitions,
 * and spring configs. Import from here — never define ad-hoc animations.
 *
 * Timing philosophy:
 *   - UI interactions:    150–250 ms  (buttons, inputs, tooltips)
 *   - Panel/modal open:  200–300 ms  (drawers, dropdowns, command palette)
 *   - Page entrance:     400–600 ms  (staggered fade-up for content blocks)
 *   - Ambient/looping:   1000ms+     (spinners, progress)
 *
 * Motion principles (Linear / Notion / Vercel level):
 *   - Always ease-out for entrances, ease-in for exits.
 *   - Spring physics for anything interactive (avoids mechanical feel).
 *   - Transform + opacity only (GPU-accelerated, no layout reflow).
 *   - Respect prefers-reduced-motion via Framer Motion's `useReducedMotion`.
 */

import type { Variants, Transition } from 'framer-motion';

// ─────────────────────────────────────────────────────────
// SPRING CONFIGS
// ─────────────────────────────────────────────────────────

/** Default spring — snappy, used for most UI transitions */
export const spring = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 30,
  mass: 0.8,
};

/** Gentle spring — slower, for larger panels / drawers */
export const springGentle = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 28,
  mass: 1,
};

/** Bouncy spring — for small interactive elements (badges, chips) */
export const springBouncy = {
  type: 'spring' as const,
  stiffness: 480,
  damping: 22,
  mass: 0.6,
};

// ─────────────────────────────────────────────────────────
// TWEEN TRANSITIONS
// ─────────────────────────────────────────────────────────

export const easeOut: Transition = {
  type: 'tween',
  ease: [0.16, 1, 0.3, 1],   // Custom ease — quick start, long tail
  duration: 0.22,
};

export const easeOutMedium: Transition = {
  type: 'tween',
  ease: [0.16, 1, 0.3, 1],
  duration: 0.35,
};

export const easeOutPage: Transition = {
  type: 'tween',
  ease: [0.16, 1, 0.3, 1],
  duration: 0.5,
};

// ─────────────────────────────────────────────────────────
// FADE VARIANTS
// ─────────────────────────────────────────────────────────

/** Simple opacity fade — tooltips, popovers */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: easeOut },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
};

// ─────────────────────────────────────────────────────────
// FADE + SLIDE UP (standard page / card entrance)
// ─────────────────────────────────────────────────────────

export const fadeUpVariants: Variants = {
  hidden:  { opacity: 0, y: 12, willChange: 'transform, opacity' },
  visible: { opacity: 1, y: 0,  transition: easeOutMedium },
  exit:    { opacity: 0, y: 6,  transition: { duration: 0.18, ease: 'easeIn' } },
};

/** Subtler version for secondary content */
export const fadeUpSmallVariants: Variants = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: easeOut },
  exit:    { opacity: 0, y: 4, transition: { duration: 0.12 } },
};

// ─────────────────────────────────────────────────────────
// PAGE ENTRANCE
// ─────────────────────────────────────────────────────────

export const pageVariants: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      ...easeOutPage,
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
  exit: { opacity: 0, y: 8, transition: { duration: 0.2, ease: 'easeIn' } },
};

/** Child variant — used with stagger parent */
export const pageChildVariants: Variants = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: easeOutMedium },
};

// ─────────────────────────────────────────────────────────
// STAGGER LIST ITEM
// ─────────────────────────────────────────────────────────

export const listContainerVariants: Variants = {
  hidden:  {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

export const listItemVariants: Variants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: easeOut },
  exit:    { opacity: 0, y: 4, transition: { duration: 0.12 } },
};

// ─────────────────────────────────────────────────────────
// SCALE (modal, dialog, command palette)
// ─────────────────────────────────────────────────────────

export const scaleInVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.96, y: -6 },
  visible: { opacity: 1, scale: 1,    y: 0, transition: { ...spring, duration: 0.22 } },
  exit:    { opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.16, ease: 'easeIn' } },
};

/** For dropdowns / popovers opening downward */
export const dropdownVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.96, y: -4, transformOrigin: 'top center' },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: { ...springBouncy } },
  exit:    { opacity: 0, scale: 0.97, y: -3, transition: { duration: 0.13, ease: 'easeIn' } },
};

// ─────────────────────────────────────────────────────────
// SLIDE FROM SIDE (sidebar, drawer panels)
// ─────────────────────────────────────────────────────────

export const slideFromLeftVariants: Variants = {
  hidden:  { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0,   transition: springGentle },
  exit:    { opacity: 0, x: -12, transition: { duration: 0.2, ease: 'easeIn' } },
};

export const slideFromRightVariants: Variants = {
  hidden:  { opacity: 0, x: 20  },
  visible: { opacity: 1, x: 0,  transition: springGentle },
  exit:    { opacity: 0, x: 12, transition: { duration: 0.2, ease: 'easeIn' } },
};

// ─────────────────────────────────────────────────────────
// SLIDE FROM BOTTOM (mobile bottom-sheet, toasts)
// ─────────────────────────────────────────────────────────

export const slideFromBottomVariants: Variants = {
  hidden:  { opacity: 0, y: '100%' },
  visible: { opacity: 1, y: 0,     transition: springGentle },
  exit:    { opacity: 0, y: '100%', transition: { duration: 0.25, ease: [0.4, 0, 1, 1] } },
};

export const slideFromBottomSmallVariants: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0,  transition: spring },
  exit:    { opacity: 0, y: 8,  transition: { duration: 0.18, ease: 'easeIn' } },
};

// ─────────────────────────────────────────────────────────
// NOTIFICATION DRAWER (opens from sidebar)
// ─────────────────────────────────────────────────────────

export const notifDrawerVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.95, x: -8, transformOrigin: 'left top' },
  visible: { opacity: 1, scale: 1,    x: 0,  transition: { ...springBouncy } },
  exit:    { opacity: 0, scale: 0.96, x: -4, transition: { duration: 0.15, ease: 'easeIn' } },
};

// ─────────────────────────────────────────────────────────
// ACCORDION / COLLAPSIBLE CONTENT
// ─────────────────────────────────────────────────────────

export const accordionVariants: Variants = {
  hidden:  { height: 0, opacity: 0, overflow: 'hidden' },
  visible: {
    height: 'auto',
    opacity: 1,
    overflow: 'hidden',
    transition: { height: { ...easeOutMedium }, opacity: { delay: 0.05, duration: 0.2 } },
  },
  exit: {
    height: 0,
    opacity: 0,
    overflow: 'hidden',
    transition: { height: { duration: 0.2, ease: 'easeIn' }, opacity: { duration: 0.12 } },
  },
};

// ─────────────────────────────────────────────────────────
// TAB INDICATOR (underline slide)
// ─────────────────────────────────────────────────────────

export const tabIndicatorTransition: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
};

// ─────────────────────────────────────────────────────────
// CARD HOVER (elevation + y lift)
// ─────────────────────────────────────────────────────────

export const cardHoverProps = {
  whileHover: {
    y: -2,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
  whileTap: { scale: 0.99, transition: { duration: 0.1 } },
};

// ─────────────────────────────────────────────────────────
// BUTTON PRESS
// ─────────────────────────────────────────────────────────

export const buttonHoverProps = {
  whileHover: { scale: 1.015, transition: { duration: 0.15, ease: 'easeOut' } },
  whileTap:   { scale: 0.97,  transition: { duration: 0.1 } },
};

export const iconButtonHoverProps = {
  whileHover: { scale: 1.08, transition: springBouncy },
  whileTap:   { scale: 0.93, transition: { duration: 0.08 } },
};

// ─────────────────────────────────────────────────────────
// PRESENCE BADGE / DOT (notification indicator)
// ─────────────────────────────────────────────────────────

export const badgePopVariants: Variants = {
  hidden:  { scale: 0, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: springBouncy },
  exit:    { scale: 0, opacity: 0, transition: { duration: 0.1 } },
};

// ─────────────────────────────────────────────────────────
// SKELETON / SHIMMER
// ─────────────────────────────────────────────────────────

export const skeletonTransition = {
  duration: 1.4,
  repeat: Infinity,
  repeatType: 'mirror' as const,
  ease: 'easeInOut',
};

// ─────────────────────────────────────────────────────────
// PROGRESS BAR FILL
// ─────────────────────────────────────────────────────────

export const progressFillTransition: Transition = {
  type: 'spring',
  stiffness: 80,
  damping: 18,
  delay: 0.3,
};

// ─────────────────────────────────────────────────────────
// BACKDROP OVERLAY
// ─────────────────────────────────────────────────────────

export const backdropVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.18, delay: 0.05 } },
};

// ─────────────────────────────────────────────────────────
// SIDEBAR WIDTH (collapse animation)
// ─────────────────────────────────────────────────────────

export const sidebarVariants: Variants = {
  expanded: { width: 240, transition: springGentle },
  collapsed: { width: 80,  transition: springGentle },
};

// ─────────────────────────────────────────────────────────
// REDUCED MOTION FALLBACK
// (always use this in components via useReducedMotion)
// ─────────────────────────────────────────────────────────

/** Returns instant (no-op) transition if reduced motion is preferred */
export const getTransition = (
  shouldReduce: boolean | null,
  defaultTransition: Transition
): Transition =>
  shouldReduce
    ? { duration: 0 }
    : defaultTransition;
