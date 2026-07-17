import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';

interface LoaderProps {
  message?: string;
  fullscreen?: boolean;
  small?: boolean;
}

const LOADING_STEPS = [
  'Architecting personalized syllabus...',
  'Ingesting lecture document context...',
  'Calibrating explainability parameters...',
  'Checking hybrid RAG retrieval vectors...',
  'Initializing Llama 3 tutor engine...',
  'Synthesizing study recommendations...',
];

export const Loader: React.FC<LoaderProps> = ({ message, fullscreen = false, small = false }) => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (small) return;
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [small]);

  if (small) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-4 space-y-2.5">
        <div className="relative flex items-center justify-center">
          <motion.div
            className="absolute rounded-full border-t border-b border-primary-500/30"
            style={{ width: 44, height: 44 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
          <Logo size="sm" />
        </div>
        {message && (
          <p className="text-[10px] text-white/40 font-mono animate-pulse">
            {message}
          </p>
        )}
      </div>
    );
  }

  const content = (
    <div className="flex flex-col items-center justify-center text-center p-8 z-10">
      {/* Pulse Outer Aura */}
      <div className="relative flex items-center justify-center mb-6">
        <motion.div
          className="absolute rounded-full border border-primary-500/20"
          style={{ width: 110, height: 110 }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute rounded-full border border-purple-500/10"
          style={{ width: 140, height: 140 }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: 0.8 }}
        />
        
        {/* Animated Spin Border */}
        <motion.div
          className="absolute rounded-full border-t-2 border-b-2 border-primary-500/40"
          style={{ width: 90, height: 90 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />

        {/* Core Animated Logo */}
        <Logo size="lg" />
      </div>

      {/* Primary Loading Text */}
      <h3 className="text-sm font-bold text-white tracking-wide mb-1.5 uppercase opacity-90">
        EduMentor AI
      </h3>

      {/* Custom or Cycled Message */}
      <div className="h-6 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={message || stepIndex}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3 }}
            className="text-xs text-white/40 font-mono"
          >
            {message || LOADING_STEPS[stepIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Futuristic Progress Dot Indicator */}
      <div className="flex gap-1.5 mt-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1 w-4 rounded-full bg-primary-500"
            animate={{
              opacity: [0.2, 0.8, 0.2],
              backgroundColor: ['#4f5dc8', '#7c6fc2', '#4f5dc8']
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0b0f] z-50 overflow-hidden">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
          style={{ 
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', 
            backgroundSize: '24px 24px' 
          }} 
        />
        {content}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center min-h-[300px]">
      {content}
    </div>
  );
};
