import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { AvatarFace } from './AvatarFace';
import { useAvatarStore } from '../../store/avatar.store';
import { AvatarExpression, AvatarPose } from '../../types/avatar.types';

// Pose → natural expression mapping so face reflects the pose
const POSE_EXPRESSION: Record<AvatarPose, AvatarExpression> = {
  standing:        'neutral',
  waving:          'happy',
  hands_in_pocket: 'neutral',
  folded_arms:     'neutral',
  thinking:        'thinking',
  typing:          'neutral',
  reading:         'thinking',
  holding_coffee:  'smile',
  peace_sign:      'smile',
  namaste:         'neutral',
  thumbs_up:       'proud',
  sitting:         'neutral',
  leaning:         'smile',
  saluting:        'neutral',
  pointing:        'neutral',
  victory:         'excited',
  professional:    'neutral',
  relaxed:         'smile',
  walking:         'neutral',
};

interface AvatarFrameProps {
  size?: number;
  className?: string;
  showControls?: boolean;
}

// Background gradients
const BG_GRADIENTS: Record<string, string> = {
  gradient_blue:   'linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #1565c0 100%)',
  gradient_purple: 'linear-gradient(135deg, #4a148c 0%, #6a1b9a 50%, #7b1fa2 100%)',
  gradient_green:  'linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #388e3c 100%)',
  gradient_sunset: 'linear-gradient(135deg, #bf360c 0%, #e64a19 50%, #ff7043 100%)',
  gradient_ocean:  'linear-gradient(135deg, #006064 0%, #00838f 50%, #0097a7 100%)',
  dark:            'linear-gradient(135deg, #0a0b0f 0%, #1a1d27 100%)',
  light:           'linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)',
};

// Expression triggered by interaction
const INTERACTION_EXPR: Record<string, AvatarExpression> = {
  click: 'happy',
  dblclick: 'excited',
  longpress: 'proud',
  hover: 'smile',
  achievement: 'laugh',
  error: 'confused',
  loading: 'thinking',
};

export const AvatarFrame: React.FC<AvatarFrameProps> = ({
  size = 128,
  className = '',
  showControls = false,
}) => {
  const { config, interaction, setExpression, setMood, setEyeTarget, triggerAnimation, clearAnimation } = useAvatarStore();
  const frameRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPopOut, setIsPopOut] = useState(false);
  const [tooltip, setTooltip] = useState('');
  const [idleBreath, setIdleBreath] = useState(0);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Idle breathing animation loop
  useEffect(() => {
    if (prefersReducedMotion) return;
    let frame = 0;
    const breathe = setInterval(() => {
      frame++;
      setIdleBreath(Math.sin(frame * 0.05) * 1.5);
    }, 50);
    return () => clearInterval(breathe);
  }, [prefersReducedMotion]);

  // ── KEY FIX 1: Sync expression from config on mount and whenever config.expression changes
  // The interaction store is NOT persisted, so after reload currentExpression resets to 'neutral'.
  // This effect re-hydrates it from the persisted config.
  useEffect(() => {
    setExpression((config.expression as AvatarExpression) || 'neutral');
  }, [config.expression]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── KEY FIX 2: When pose changes, update the face expression to match
  // If user set a non-neutral expression specifically, honour that; otherwise use pose's natural expression.
  useEffect(() => {
    if (config.expression === 'neutral') {
      const poseExpr = POSE_EXPRESSION[config.pose] || 'neutral';
      setExpression(poseExpr);
    }
  }, [config.pose]); // eslint-disable-line react-hooks/exhaustive-deps

  // Eye tracking — follows mouse relative to frame center
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!frameRef.current) return;
      const rect = frameRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / 300));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / 300));
      setEyeTarget(dx, dy);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [setEyeTarget]);

  // Reset expression after animation
  const resetAfterDelay = useCallback((delay = 2000) => {
    setTimeout(() => {
      setExpression(config.expression as AvatarExpression || 'neutral');
      setMood('idle');
      setIsPopOut(false);
    }, delay);
  }, [config.expression, setExpression, setMood]);

  // Click → wave
  const handleClick = useCallback(() => {
    setExpression('happy');
    setMood('waving');
    triggerAnimation('wave');
    controls.start({
      rotate: [0, -12, 12, -8, 8, -4, 4, 0],
      transition: { duration: 0.8 },
    });
    setTooltip('👋 Hello!');
    setTimeout(() => setTooltip(''), 1500);
    resetAfterDelay(1800);
  }, [controls, setExpression, setMood, triggerAnimation, resetAfterDelay]);

  // Double click → thumbs up
  const handleDblClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setExpression('excited');
    setMood('excited');
    triggerAnimation('thumbsup');
    controls.start({
      scale: [1, 1.12, 0.95, 1.06, 1],
      transition: { duration: 0.5 },
    });
    setTooltip('👍 Thanks!');
    setTimeout(() => setTooltip(''), 1500);
    resetAfterDelay(2000);
  }, [controls, setExpression, setMood, triggerAnimation, resetAfterDelay]);

  // Long press → pop out greet
  const handleMouseDown = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setIsPopOut(true);
      setExpression('proud');
      setMood('happy');
      setTooltip('🌟 Hey there!');
      setTimeout(() => setTooltip(''), 2000);
      resetAfterDelay(2500);
    }, 700);
  }, [setExpression, setMood, resetAfterDelay]);

  const handleMouseUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  // Hover → smile
  const handleMouseEnter = useCallback(() => {
    if (interaction.mood === 'idle') {
      setExpression('smile');
    }
  }, [interaction.mood, setExpression]);

  const handleMouseLeave = useCallback(() => {
    if (interaction.mood === 'idle') {
      setExpression(config.expression as AvatarExpression || 'neutral');
    }
  }, [interaction.mood, config.expression, setExpression]);

  const bg = BG_GRADIENTS[config.background] || BG_GRADIENTS.gradient_blue;
  const frameSize = size;
  const popOutScale = isPopOut ? 1.18 : 1;

  // Frame shape clip path
  const frameClip = config.frame === 'circle'
    ? '50%'
    : config.frame === 'rounded'
    ? '20%'
    : config.frame === 'hexagon'
    ? '50%'
    : '0%';

  return (
    <div className={`relative inline-block select-none ${className}`} style={{ width: frameSize, height: frameSize }}>
      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.8 }}
            animate={{ opacity: 1, y: -8, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.8 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white/90 text-black text-[11px] font-bold rounded-full px-3 py-1 shadow-lg z-50 whitespace-nowrap pointer-events-none"
          >
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar frame */}
      <motion.div
        ref={frameRef}
        animate={controls}
        style={{
          width: frameSize,
          height: frameSize,
          borderRadius: frameClip,
          background: bg,
          overflow: 'visible',
          position: 'relative',
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(79,93,200,0.22)',
          border: '2px solid rgba(255,255,255,0.15)',
        }}
        whileHover={{ boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 4px 16px rgba(79,93,200,0.32)' }}
        onClick={handleClick}
        onDoubleClick={handleDblClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        role="img"
        aria-label={`${config.gender} avatar in ${config.pose} pose`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick();
        }}
      >
        {/* Clip container so body doesn't overflow on idle */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: frameClip,
            overflow: isPopOut ? 'visible' : 'hidden',
            position: 'relative',
          }}
        >
          {/* Idle breathing wrapper */}
          <motion.div
            animate={{ y: idleBreath }}
            transition={{ duration: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Pop-out container */}
            <motion.div
              animate={{ scale: popOutScale, y: isPopOut ? -8 : 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <AvatarFace
                config={config}
                // ── KEY FIX 3: Use config.expression as the idle baseline; interaction overrides temporarily
                expression={
                  interaction.mood !== 'idle'
                    ? interaction.currentExpression
                    : (interaction.currentExpression || (config.expression as AvatarExpression) || 'neutral')
                }
                eyeTarget={interaction.eyeTarget}
                size={Math.round(frameSize * 0.88)}
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Particle sparkle on excited */}
        <AnimatePresence>
          {interaction.mood === 'excited' && !prefersReducedMotion && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                  animate={{
                    opacity: 0, scale: 1,
                    x: (Math.cos((i / 6) * Math.PI * 2) * frameSize * 0.7),
                    y: (Math.sin((i / 6) * Math.PI * 2) * frameSize * 0.7),
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, delay: i * 0.05 }}
                  style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    width: 6, height: 6,
                    borderRadius: '50%',
                    background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A8E6CF', '#DDA0DD', '#87CEEB'][i],
                    pointerEvents: 'none',
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Interaction hint badge */}
      {showControls && (
        <div className="absolute -bottom-1 -right-1 bg-primary-500 rounded-full h-5 w-5 flex items-center justify-center text-[9px] border-2 border-[#0a0b0f] cursor-pointer z-10"
          title="Click to interact">
          ✨
        </div>
      )}
    </div>
  );
};
