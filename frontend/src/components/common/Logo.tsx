import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const dimensions = {
    sm: { width: 36, height: 36, capSize: 'text-lg' },
    md: { width: 48, height: 48, capSize: 'text-xl' },
    lg: { width: 64, height: 64, capSize: 'text-2xl' },
    xl: { width: 80, height: 80, capSize: 'text-3xl' },
  }[size];

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Background radial glow */}
      <motion.div
        className="absolute rounded-full filter blur-md opacity-40"
        style={{
          width: dimensions.width * 1.2,
          height: dimensions.height * 1.2,
          background: 'radial-gradient(circle, rgba(79,93,200,0.55) 0%, rgba(124,111,194,0.4) 70%, transparent 100%)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Main SVG Logo */}
      <motion.svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        whileHover={{ scale: 1.08, rotate: 2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f5dc8" />
            <stop offset="50%" stopColor="#6359a8" />
            <stop offset="100%" stopColor="#7c6fc2" />
          </linearGradient>
          
          <linearGradient id="accentGrad" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4da89a" />
            <stop offset="100%" stopColor="#7b87d4" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Orbit Rings */}
        <motion.circle
          cx="50"
          cy="50"
          r="42"
          stroke="url(#logoGrad)"
          strokeWidth="1.5"
          strokeDasharray="6 12"
          opacity="0.3"
          animate={{ rotate: 360 }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        />
        <motion.circle
          cx="50"
          cy="50"
          r="46"
          stroke="url(#accentGrad)"
          strokeWidth="1"
          strokeDasharray="4 8"
          opacity="0.2"
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />

        {/* Neural nodes connecting cap */}
        <line x1="50" y1="22" x2="22" y2="40" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.6" strokeDasharray="2 2" />
        <line x1="50" y1="22" x2="78" y2="40" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.6" strokeDasharray="2 2" />
        <line x1="22" y1="40" x2="50" y2="58" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.6" strokeDasharray="2 2" />
        <line x1="78" y1="40" x2="50" y2="58" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.6" strokeDasharray="2 2" />
        <line x1="50" y1="58" x2="50" y2="76" stroke="url(#accentGrad)" strokeWidth="2" opacity="0.8" />

        {/* Neural Network Nodes */}
        <motion.circle cx="50" cy="22" r="3.5" fill="#4da89a" filter="url(#glow)" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0 }} />
        <motion.circle cx="22" cy="40" r="3.5" fill="#7b87d4" filter="url(#glow)" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
        <motion.circle cx="78" cy="40" r="3.5" fill="#7b87d4" filter="url(#glow)" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
        <motion.circle cx="50" cy="58" r="4" fill="#9b96d4" filter="url(#glow)" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} />
        <motion.circle cx="50" cy="76" r="3" fill="#4da89a" filter="url(#glow)" />

        {/* Core Graduation Cap Shape */}
        <motion.path
          d="M50 25L82 42L50 59L18 42Z"
          fill="url(#logoGrad)"
          fillOpacity="0.85"
          stroke="url(#accentGrad)"
          strokeWidth="1.5"
          filter="url(#glow)"
          animate={{
            y: [0, -2, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />

        {/* Tassel */}
        <path
          d="M50 42L32 50V68"
          stroke="#4da89a"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="32" cy="68" r="2" fill="#4da89a" />
      </motion.svg>
    </div>
  );
};
