/**
 * Skeleton.tsx
 *
 * Professional shimmer skeleton for loading states.
 * Uses GPU-accelerated opacity animation — no background-position shift.
 *
 * Usage:
 *   <SkeletonBlock className="h-5 w-32 rounded-lg" />
 *   <SkeletonText lines={3} />
 *   <SkeletonCard />
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// ── Base block ──────────────────────────────────────────────

interface SkeletonBlockProps {
  className?: string;
}

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({ className = '' }) => {
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      className={`rounded-lg ${className}`}
      style={{ background: 'rgba(255,255,255,0.06)' }}
      animate={shouldReduce ? {} : { opacity: [0.5, 1, 0.5] }}
      transition={
        shouldReduce
          ? {}
          : {
              duration: 1.6,
              repeat: Infinity,
              ease: 'easeInOut',
            }
      }
    />
  );
};

// ── Text lines ──────────────────────────────────────────────

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonBlock
        key={i}
        className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
      />
    ))}
  </div>
);

// ── Stat card skeleton ──────────────────────────────────────

export const SkeletonStatCard: React.FC = () => (
  <div className="glass-card p-5 space-y-3">
    <div className="flex items-start gap-4">
      <SkeletonBlock className="h-11 w-11 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <SkeletonBlock className="h-6 w-16" />
        <SkeletonBlock className="h-3 w-24" />
      </div>
    </div>
  </div>
);

// ── Generic card skeleton ──────────────────────────────────

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`glass-card p-5 space-y-4 ${className}`}>
    <div className="flex items-center gap-3">
      <SkeletonBlock className="h-9 w-9 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-3 w-3/4" />
        <SkeletonBlock className="h-2.5 w-1/2" />
      </div>
    </div>
    <SkeletonText lines={2} />
  </div>
);

// ── Row skeleton (for lists/tables) ────────────────────────

export const SkeletonRow: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-3 py-3 ${className}`}>
    <SkeletonBlock className="h-8 w-8 rounded-lg flex-shrink-0" />
    <div className="flex-1 space-y-1.5">
      <SkeletonBlock className="h-3 w-2/3" />
      <SkeletonBlock className="h-2.5 w-1/3" />
    </div>
    <SkeletonBlock className="h-6 w-16 rounded-full" />
  </div>
);
