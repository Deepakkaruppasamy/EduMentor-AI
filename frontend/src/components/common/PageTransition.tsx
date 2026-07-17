/**
 * PageTransition.tsx
 *
 * Drop-in wrapper that gives every page a smooth fade-up entrance
 * and respects prefers-reduced-motion.
 *
 * Usage:
 *   export const MyPage = () => (
 *     <PageTransition>
 *       <div>…page content…</div>
 *     </PageTransition>
 *   );
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { pageVariants } from '../../utils/motion';

interface PageTransitionProps {
  children: React.ReactNode;
  /** Extra Tailwind classes to pass to the wrapper */
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, className = '' }) => {
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      variants={shouldReduce ? undefined : pageVariants}
      initial={shouldReduce ? false : 'hidden'}
      animate="visible"
      exit="exit"
      className={className}
      style={{ willChange: 'opacity, transform' }}
    >
      {children}
    </motion.div>
  );
};
