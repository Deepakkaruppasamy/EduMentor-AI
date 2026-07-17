/**
 * AnimatedNumber.tsx
 *
 * Smooth number counter that animates from 0 (or previous value) to target.
 * Uses Framer Motion's useSpring + useMotionValue for GPU-accelerated
 * number counting without layout shifts.
 *
 * Usage:
 *   <AnimatedNumber value={1247} suffix="+" />
 *   <AnimatedNumber value={94.5} decimals={1} suffix="%" />
 */

import React, { useEffect, useRef } from 'react';
import {
  useMotionValue,
  useSpring,
  useTransform,
  motion,
  useReducedMotion,
} from 'framer-motion';

interface AnimatedNumberProps {
  /** Target numeric value */
  value: number;
  /** Decimal places to display (default: 0) */
  decimals?: number;
  /** Text appended after the number */
  suffix?: string;
  /** Text prepended before the number */
  prefix?: string;
  /** Additional class name */
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 0,
  suffix = '',
  prefix = '',
  className = '',
}) => {
  const shouldReduce = useReducedMotion();
  const motionValue = useMotionValue(shouldReduce ? value : 0);

  const springValue = useSpring(motionValue, {
    damping: 40,
    stiffness: 120,
    mass: 0.8,
  });

  const displayValue = useTransform(springValue, (latest) => {
    const n = parseFloat(latest.toFixed(decimals));
    return `${prefix}${n.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`;
  });

  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      // Slight delay so component is painted before animation kicks in
      const t = setTimeout(() => motionValue.set(value), 200);
      return () => clearTimeout(t);
    }
    motionValue.set(value);
  }, [value, motionValue]);

  if (shouldReduce) {
    return (
      <span className={className}>
        {prefix}{value.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}{suffix}
      </span>
    );
  }

  return <motion.span className={className}>{displayValue}</motion.span>;
};
