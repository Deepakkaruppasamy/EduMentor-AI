import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type AvatarState = 'idle' | 'thinking' | 'speaking' | 'happy' | 'encouraging';

interface AIBuddyAvatarProps {
  state: AvatarState;
  size?: number;
}

interface StarParticle {
  id: number;
  x: number;
  y: number;
  scale: number;
}

export const AIBuddyAvatar: React.FC<AIBuddyAvatarProps> = ({ state, size = 64 }) => {
  const [stars, setStars] = useState<StarParticle[]>([]);

  // Spawn floating stars periodically when happy
  useEffect(() => {
    if (state !== 'happy') {
      setStars([]);
      return;
    }

    const interval = setInterval(() => {
      setStars(prev => [
        ...prev.slice(-10), // Limit to 10 active stars
        {
          id: Math.random(),
          x: Math.random() * 80 - 40, // offset left/right
          y: 20,
          scale: Math.random() * 0.6 + 0.4,
        }
      ]);
    }, 400);

    return () => clearInterval(interval);
  }, [state]);

  // Framer Motion Variants
  
  // Body/Head breathing variant
  const headBreathingVariants = {
    idle: {
      y: [0, -4, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    thinking: {
      y: [0, -2, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    speaking: {
      y: [-2, 2, -2],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    happy: {
      y: [0, -6, 0],
      scale: [1, 1.05, 1],
      transition: {
        duration: 1.2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    encouraging: {
      y: [0, -6, 0, -4, 0],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  // Eyes variant
  const eyesContainerVariants = {
    idle: {
      x: 0,
      y: 0
    },
    thinking: {
      x: [-6, 6, -6],
      y: 0,
      transition: {
        duration: 2.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    speaking: {
      x: 0,
      y: [-1, 1, -1],
      transition: {
        duration: 0.4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    happy: {
      x: 0,
      y: -2
    },
    encouraging: {
      x: 0,
      y: 0
    }
  };

  // Blinking animation for idle/encouraging
  const leftEyeScaleVariants = {
    idle: {
      scaleY: [1, 1, 0.1, 1, 1],
      transition: {
        duration: 4,
        repeat: Infinity,
        times: [0, 0.9, 0.92, 0.94, 1],
        ease: "easeInOut"
      }
    },
    thinking: { scaleY: 1 },
    speaking: { scaleY: 1 },
    happy: { scaleY: 1 },
    encouraging: {
      scaleY: [1, 1, 0.1, 1, 1],
      transition: {
        duration: 3,
        repeat: Infinity,
        times: [0, 0.88, 0.9, 0.92, 1],
        ease: "easeInOut"
      }
    }
  };

  const rightEyeScaleVariants = {
    idle: {
      scaleY: [1, 1, 0.1, 1, 1],
      transition: {
        duration: 4,
        repeat: Infinity,
        times: [0, 0.91, 0.93, 0.95, 1],
        ease: "easeInOut"
      }
    },
    thinking: { scaleY: 1 },
    speaking: { scaleY: 1 },
    happy: { scaleY: 1 },
    encouraging: {
      scaleY: [1, 1, 0.1, 1, 1],
      transition: {
        duration: 3,
        repeat: Infinity,
        times: [0, 0.89, 0.91, 0.93, 1],
        ease: "easeInOut"
      }
    }
  };

  // Ring background glow
  const ringVariants = {
    idle: {
      rotate: 0,
      scale: 1,
      opacity: 0.6,
      strokeDasharray: "15 5 10 10",
      transition: { duration: 10, repeat: Infinity, ease: "linear" }
    },
    thinking: {
      rotate: 360,
      scale: [1, 1.05, 1],
      opacity: 0.9,
      strokeDasharray: "25 10",
      transition: {
        rotate: { duration: 3, repeat: Infinity, ease: "linear" },
        scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
      }
    },
    speaking: {
      rotate: 180,
      scale: [0.98, 1.02, 0.98],
      opacity: 0.8,
      strokeDasharray: "8 4",
      transition: {
        rotate: { duration: 5, repeat: Infinity, ease: "linear" },
        scale: { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
      }
    },
    happy: {
      rotate: [0, 360],
      scale: 1.1,
      opacity: 1,
      strokeDasharray: "30 5",
      transition: {
        rotate: { duration: 2, repeat: Infinity, ease: "linear" }
      }
    },
    encouraging: {
      rotate: 0,
      scale: [1, 1.03, 1],
      opacity: 0.7,
      strokeDasharray: "15 5 10 10",
      transition: {
        scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
      }
    }
  };

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      
      {/* Sparkles / Stars when happy */}
      <AnimatePresence>
        {stars.map(star => (
          <motion.svg
            key={star.id}
            initial={{ opacity: 0, x: star.x, y: star.y, scale: 0 }}
            animate={{ opacity: [0, 1, 1, 0], y: -45, scale: star.scale, rotate: 180 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute text-yellow-400 fill-current w-4 h-4 pointer-events-none"
            viewBox="0 0 24 24"
            style={{ zIndex: 10 }}
          >
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </motion.svg>
        ))}
      </AnimatePresence>

      {/* Main Avatar SVG */}
      <motion.svg
        width="100%"
        height="100%"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full filter drop-shadow-[0_4px_12px_rgba(79,99,255,0.25)]"
      >
        <defs>
          {/* Gradients */}
          <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#4f63ff" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.15)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.03)" />
          </linearGradient>

          <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>

          <linearGradient id="cheekGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="haloGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>

        {/* Ambient Ring Glow */}
        <circle cx="60" cy="60" r="45" fill="url(#ringGlow)" />

        {/* Dynamic Status Halo */}
        <motion.circle
          cx="60"
          cy="60"
          r="48"
          stroke="url(#haloGrad)"
          strokeWidth="2"
          strokeLinecap="round"
          variants={ringVariants}
          animate={state}
        />

        {/* Outer Ears/Antennae */}
        <g>
          {/* Left ear */}
          <motion.rect
            x="12"
            y="52"
            width="6"
            height="16"
            rx="3"
            fill="#4f63ff"
            opacity="0.8"
            animate={state === 'speaking' ? { scaleX: [1, 1.3, 1], x: [0, -1, 0] } : {}}
            transition={{ duration: 0.3, repeat: Infinity }}
          />
          {/* Right ear */}
          <motion.rect
            x="102"
            y="52"
            width="6"
            height="16"
            rx="3"
            fill="#4f63ff"
            opacity="0.8"
            animate={state === 'speaking' ? { scaleX: [1, 1.3, 1], x: [0, 1, 0] } : {}}
            transition={{ duration: 0.3, repeat: Infinity }}
          />
        </g>

        {/* Head Base (Main Glassmorphic Capsule) */}
        <motion.g
          variants={headBreathingVariants}
          animate={state}
          style={{ transformOrigin: "60px 60px" }}
        >
          {/* Neck connection */}
          <rect x="52" y="85" width="16" height="12" rx="4" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" />
          
          {/* Head Body */}
          <rect
            x="18"
            y="24"
            width="84"
            height="64"
            rx="24"
            fill="url(#bodyGrad)"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="1.5"
            style={{ backdropFilter: "blur(8px)" }}
          />

          {/* Screen Faceplate (Dark Area) */}
          <rect
            x="24"
            y="30"
            width="72"
            height="52"
            rx="18"
            fill="url(#screenGrad)"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1"
          />

          {/* Cheeks Glow (pinkish blush) */}
          <circle cx="34" cy="66" r="5" fill="url(#cheekGrad)" />
          <circle cx="86" cy="66" r="5" fill="url(#cheekGrad)" />

          {/* EYES CONTAINER */}
          <motion.g
            variants={eyesContainerVariants}
            animate={state}
            style={{ transformOrigin: "60px 52px" }}
          >
            {/* LEFT EYE */}
            {state === 'happy' ? (
              // Arched Happy Eye
              <path
                d="M 33 55 Q 39 46 45 55"
                stroke="url(#eyeGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
            ) : (
              // Normal Pill Eye
              <motion.rect
                x="35"
                y="45"
                width="8"
                height="14"
                rx="4"
                fill="url(#eyeGrad)"
                variants={leftEyeScaleVariants}
                animate={state}
                style={{ transformOrigin: "39px 52px" }}
              />
            )}

            {/* RIGHT EYE */}
            {state === 'happy' ? (
              // Arched Happy Eye
              <path
                d="M 75 55 Q 81 46 87 55"
                stroke="url(#eyeGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
            ) : (
              // Normal Pill Eye
              <motion.rect
                x="77"
                y="45"
                width="8"
                height="14"
                rx="4"
                fill="url(#eyeGrad)"
                variants={rightEyeScaleVariants}
                animate={state}
                style={{ transformOrigin: "81px 52px" }}
              />
            )}
          </motion.g>

          {/* MOUTH / SOUNDWAVE FACIAL INDICATOR */}
          <g>
            {state === 'speaking' ? (
              // Oscillating Speech wave
              <motion.path
                d="M 46 68 Q 50 60 54 68 T 58 68 T 62 68 T 66 68 T 70 68 T 74 68"
                stroke="#60a5fa"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                animate={{
                  d: [
                    "M 46 68 Q 50 60 54 68 T 58 74 T 62 62 T 66 74 T 70 60 T 74 68",
                    "M 46 68 Q 50 74 54 68 T 58 62 T 62 74 T 66 60 T 70 74 T 74 68",
                    "M 46 68 Q 50 60 54 68 T 58 74 T 62 62 T 66 74 T 70 60 T 74 68"
                  ]
                }}
                transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}
              />
            ) : state === 'happy' || state === 'encouraging' ? (
              // Smile Curve
              <motion.path
                d="M 48 67 Q 60 77 72 67"
                stroke="#60a5fa"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3 }}
              />
            ) : state === 'thinking' ? (
              // Flat thinking line with quick left-right dash animations
              <motion.path
                d="M 50 68 H 70"
                stroke="#60a5fa"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="2 3"
                animate={{ strokeDashOffset: [0, -10] }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              // Idle state small warm curve
              <path
                d="M 54 69 Q 60 72 66 69"
                stroke="rgba(96, 165, 250, 0.7)"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            )}
          </g>
        </motion.g>
      </motion.svg>
    </div>
  );
};
