import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AvatarConfig,
  AvatarExpression,
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
} from '../../types/avatar.types';

interface AvatarFaceProps {
  config: AvatarConfig;
  expression: AvatarExpression;
  eyeTarget: { x: number; y: number };
  containerRef?: React.RefObject<HTMLElement>;
  size?: number;
}

// Eye shapes per expression
const getEyeShape = (expr: AvatarExpression, side: 'left' | 'right') => {
  const shapes: Record<AvatarExpression, { scaleY: number; offsetY: number }> = {
    neutral:   { scaleY: 1,    offsetY: 0 },
    happy:     { scaleY: 0.5,  offsetY: 2 },
    smile:     { scaleY: 0.7,  offsetY: 1 },
    laugh:     { scaleY: 0.3,  offsetY: 3 },
    thinking:  { scaleY: 1,    offsetY: 0 },
    confused:  { scaleY: 1.1,  offsetY: -1 },
    surprised: { scaleY: 1.4,  offsetY: -2 },
    excited:   { scaleY: 1.2,  offsetY: -1 },
    proud:     { scaleY: 0.8,  offsetY: 1 },
    sleepy:    { scaleY: 0.3,  offsetY: 2 },
  };
  return shapes[expr];
};

// Mouth shapes per expression
const getMouthPath = (expr: AvatarExpression): string => {
  const paths: Record<AvatarExpression, string> = {
    neutral:   'M 36 58 Q 44 60 52 58',
    happy:     'M 34 56 Q 44 66 54 56',
    smile:     'M 35 57 Q 44 64 53 57',
    laugh:     'M 32 55 Q 44 70 56 55',
    thinking:  'M 38 59 Q 44 58 50 60',
    confused:  'M 36 60 Q 44 55 52 61',
    surprised: 'M 38 57 Q 44 65 50 57',
    excited:   'M 33 56 Q 44 68 55 56',
    proud:     'M 36 57 Q 44 63 52 57',
    sleepy:    'M 37 59 Q 44 61 51 59',
  };
  return paths[expr];
};

// Eyebrow shapes per expression
const getEyebrowPath = (expr: AvatarExpression, side: 'left' | 'right') => {
  const leftX = side === 'left' ? 28 : 44;
  const rightX = side === 'left' ? 40 : 56;

  const transforms: Record<AvatarExpression, { y1: number; y2: number }> = {
    neutral:   { y1: 28, y2: 28 },
    happy:     { y1: 25, y2: 25 },
    smile:     { y1: 26, y2: 26 },
    laugh:     { y1: 24, y2: 24 },
    thinking:  side === 'left' ? { y1: 26, y2: 28 } : { y1: 24, y2: 26 },
    confused:  side === 'left' ? { y1: 25, y2: 30 } : { y1: 30, y2: 25 },
    surprised: { y1: 22, y2: 22 },
    excited:   { y1: 23, y2: 23 },
    proud:     { y1: 27, y2: 24 },
    sleepy:    { y1: 32, y2: 32 },
  };

  const t = transforms[expr];
  return `M ${leftX} ${t.y1} Q ${(leftX + rightX) / 2} ${t.y2 - 2} ${rightX} ${t.y1}`;
};

export const AvatarFace: React.FC<AvatarFaceProps> = ({
  config,
  expression,
  eyeTarget,
  size = 88,
}) => {
  const [blinkState, setBlinkState] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);

  const skin = SKIN_TONES[config.skinTone];
  const hairColor = HAIR_COLORS[config.hairColor];
  const eyeColor = EYE_COLORS[config.eyeColor];
  const isFemale = config.gender === 'female';

  // Idle blink loop
  useEffect(() => {
    const scheduleBlink = () => {
      const delay = 2500 + Math.random() * 3000;
      return setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 150);
      }, delay);
    };
    const timer = scheduleBlink();
    return () => clearTimeout(timer);
  }, []);

  const eyeOffsetX = eyeTarget.x * 2.5;
  const eyeOffsetY = eyeTarget.y * 2;
  const leftEye = getEyeShape(expression, 'left');
  const rightEye = getEyeShape(expression, 'right');
  const mouthPath = getMouthPath(expression);
  const blinkScaleY = isBlinking ? 0.05 : 1;

  const scale = size / 88;

  return (
    <motion.svg
      viewBox="0 0 88 88"
      width={size}
      height={size}
      style={{ overflow: 'visible' }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* ── Hair Back Layer ─────────────────────────────────── */}
      {config.hairStyle !== 'bald' && (
        <ellipse cx="44" cy="24" rx="28" ry="26" fill={hairColor} />
      )}

      {/* ── Head / Face ─────────────────────────────────────── */}
      <ellipse cx="44" cy="42" rx="24" ry="28" fill={skin.base} />

      {/* Face shadow for depth */}
      <ellipse cx="44" cy="50" rx="22" ry="18" fill={skin.shadow} opacity="0.12" />

      {/* ── Hair Front Layer ────────────────────────────────── */}
      {config.hairStyle === 'short' && (
        <path d="M20 28 Q22 8 44 10 Q66 8 68 28 Q60 16 44 18 Q28 16 20 28Z" fill={hairColor} />
      )}
      {config.hairStyle === 'medium' && (
        <>
          <path d="M20 28 Q22 6 44 8 Q66 6 68 28 Q58 14 44 16 Q30 14 20 28Z" fill={hairColor} />
          <path d="M20 28 Q16 40 18 52" stroke={hairColor} strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M68 28 Q72 40 70 52" stroke={hairColor} strokeWidth="7" strokeLinecap="round" fill="none" />
        </>
      )}
      {config.hairStyle === 'long' && (
        <>
          <path d="M20 28 Q22 4 44 6 Q66 4 68 28 Q58 12 44 14 Q30 12 20 28Z" fill={hairColor} />
          <path d="M20 28 Q14 50 16 72" stroke={hairColor} strokeWidth="8" strokeLinecap="round" fill="none" />
          <path d="M68 28 Q74 50 72 72" stroke={hairColor} strokeWidth="8" strokeLinecap="round" fill="none" />
        </>
      )}
      {config.hairStyle === 'curly' && (
        <>
          <path d="M18 28 Q18 4 44 6 Q70 4 70 28" fill={hairColor} stroke={hairColor} strokeWidth="3" />
          {[22, 28, 34, 40, 48, 54, 60, 66].map((x, i) => (
            <circle key={i} cx={x} cy={12 + (i % 3) * 4} r="6" fill={hairColor} />
          ))}
        </>
      )}
      {config.hairStyle === 'ponytail' && (
        <>
          <path d="M20 28 Q22 6 44 8 Q66 6 68 28 Q58 14 44 16 Q30 14 20 28Z" fill={hairColor} />
          <path d="M64 20 Q80 24 78 48" stroke={hairColor} strokeWidth="6" strokeLinecap="round" fill="none" />
        </>
      )}
      {config.hairStyle === 'bun' && (
        <>
          <path d="M22 30 Q24 10 44 12 Q64 10 66 30" fill={hairColor} />
          <circle cx="44" cy="8" r="10" fill={hairColor} />
        </>
      )}
      {config.hairStyle === 'wavy' && (
        <>
          <path d="M20 28 Q22 4 44 6 Q66 4 68 28 Q60 12 44 14 Q28 12 20 28Z" fill={hairColor} />
          <path d="M20 28 Q14 42 18 55 Q15 65 18 72" stroke={hairColor} strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M68 28 Q74 42 70 55 Q73 65 70 72" stroke={hairColor} strokeWidth="7" strokeLinecap="round" fill="none" />
        </>
      )}

      {/* ── Ears ────────────────────────────────────────────── */}
      <ellipse cx="20" cy="44" rx="5" ry="7" fill={skin.base} stroke={skin.shadow} strokeWidth="0.5" />
      <ellipse cx="68" cy="44" rx="5" ry="7" fill={skin.base} stroke={skin.shadow} strokeWidth="0.5" />

      {/* ── Eyebrows ─────────────────────────────────────────── */}
      <motion.path
        d={getEyebrowPath(expression, 'left')}
        stroke={hairColor === '#E8C97A' ? '#8B6914' : hairColor}
        strokeWidth={isFemale ? 1.5 : 2.5}
        strokeLinecap="round"
        fill="none"
        animate={{ d: getEyebrowPath(expression, 'left') }}
        transition={{ duration: 0.3 }}
      />
      <motion.path
        d={getEyebrowPath(expression, 'right')}
        stroke={hairColor === '#E8C97A' ? '#8B6914' : hairColor}
        strokeWidth={isFemale ? 1.5 : 2.5}
        strokeLinecap="round"
        fill="none"
        animate={{ d: getEyebrowPath(expression, 'right') }}
        transition={{ duration: 0.3 }}
      />

      {/* ── Eyes ─────────────────────────────────────────────── */}
      {/* Left Eye */}
      <g transform={`translate(${eyeOffsetX}, ${eyeOffsetY})`}>
        <ellipse
          cx="33" cy={35 + leftEye.offsetY}
          rx="5.5" ry={5.5 * leftEye.scaleY * blinkScaleY}
          fill="white"
        />
        <motion.ellipse
          cx={33 + eyeOffsetX * 0.2} cy={35 + leftEye.offsetY + eyeOffsetY * 0.2}
          rx="3" ry={3 * leftEye.scaleY * blinkScaleY}
          fill={eyeColor}
          animate={{ scaleY: blinkScaleY * leftEye.scaleY }}
        />
        <ellipse
          cx={33 + eyeOffsetX * 0.2 + 0.8} cy={35 + leftEye.offsetY + eyeOffsetY * 0.2 - 0.8}
          rx="1" ry={blinkScaleY}
          fill="white" opacity="0.8"
        />
        {/* Lashes (female) */}
        {isFemale && !isBlinking && (
          <>
            <line x1="28" y1={32 + leftEye.offsetY} x2="27" y2={30 + leftEye.offsetY} stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="30" y1={30 + leftEye.offsetY} x2="29" y2={28 + leftEye.offsetY} stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="33" y1={29 + leftEye.offsetY} x2="33" y2={27 + leftEye.offsetY} stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="36" y1={30 + leftEye.offsetY} x2="37" y2={28 + leftEye.offsetY} stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" />
          </>
        )}
      </g>

      {/* Right Eye */}
      <g transform={`translate(${eyeOffsetX}, ${eyeOffsetY})`}>
        <ellipse
          cx="55" cy={35 + rightEye.offsetY}
          rx="5.5" ry={5.5 * rightEye.scaleY * blinkScaleY}
          fill="white"
        />
        <motion.ellipse
          cx={55 + eyeOffsetX * 0.2} cy={35 + rightEye.offsetY + eyeOffsetY * 0.2}
          rx="3" ry={3 * rightEye.scaleY * blinkScaleY}
          fill={eyeColor}
          animate={{ scaleY: blinkScaleY * rightEye.scaleY }}
        />
        <ellipse
          cx={55 + eyeOffsetX * 0.2 + 0.8} cy={35 + rightEye.offsetY + eyeOffsetY * 0.2 - 0.8}
          rx="1" ry={blinkScaleY}
          fill="white" opacity="0.8"
        />
        {isFemale && !isBlinking && (
          <>
            <line x1="50" y1={32 + rightEye.offsetY} x2="49" y2={30 + rightEye.offsetY} stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="52" y1={30 + rightEye.offsetY} x2="51" y2={28 + rightEye.offsetY} stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="55" y1={29 + rightEye.offsetY} x2="55" y2={27 + rightEye.offsetY} stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="58" y1={30 + rightEye.offsetY} x2="59" y2={28 + rightEye.offsetY} stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" />
          </>
        )}
      </g>

      {/* Glasses */}
      {config.glasses !== 'none' && (
        <g opacity="0.9">
          {config.glasses === 'round' && (
            <>
              <circle cx="33" cy="36" r="7" fill="none" stroke="#2c2c2c" strokeWidth="1.5" />
              <circle cx="55" cy="36" r="7" fill="none" stroke="#2c2c2c" strokeWidth="1.5" />
              <line x1="40" y1="36" x2="48" y2="36" stroke="#2c2c2c" strokeWidth="1.5" />
            </>
          )}
          {config.glasses === 'square' && (
            <>
              <rect x="26" y="29" width="14" height="12" rx="2" fill="none" stroke="#2c2c2c" strokeWidth="1.5" />
              <rect x="48" y="29" width="14" height="12" rx="2" fill="none" stroke="#2c2c2c" strokeWidth="1.5" />
              <line x1="40" y1="35" x2="48" y2="35" stroke="#2c2c2c" strokeWidth="1.5" />
            </>
          )}
          {config.glasses === 'rimless' && (
            <>
              <circle cx="33" cy="36" r="7" fill="none" stroke="rgba(200,200,220,0.4)" strokeWidth="0.8" />
              <circle cx="55" cy="36" r="7" fill="none" stroke="rgba(200,200,220,0.4)" strokeWidth="0.8" />
              <line x1="40" y1="36" x2="48" y2="36" stroke="rgba(200,200,220,0.4)" strokeWidth="0.8" />
            </>
          )}
        </g>
      )}

      {/* ── Nose ─────────────────────────────────────────────── */}
      <path d="M42 46 Q44 50 46 46" stroke={skin.shadow} strokeWidth="1.2" fill="none" strokeLinecap="round" />

      {/* ── Mouth ─────────────────────────────────────────────── */}
      <motion.path
        d={mouthPath}
        stroke={expression === 'laugh' || expression === 'excited' || expression === 'surprised'
          ? '#1a1a1a' : skin.shadow}
        strokeWidth={expression === 'laugh' ? 2.5 : 2}
        fill={expression === 'laugh' || expression === 'surprised' ? 'rgba(180,60,60,0.7)' : 'none'}
        strokeLinecap="round"
        animate={{ d: mouthPath }}
        transition={{ duration: 0.35, type: 'spring' }}
      />

      {/* Teeth for laugh/surprised */}
      {(expression === 'laugh' || expression === 'surprised') && (
        <rect x="38" y="57" width="12" height="5" rx="2" fill="white" opacity="0.9" />
      )}

      {/* ── Makeup (female) ───────────────────────────────────── */}
      {isFemale && config.makeup && config.makeup !== 'none' && (
        <>
          {/* Blush */}
          <ellipse cx="24" cy="50" rx="6" ry="4" fill="rgba(255,150,150,0.25)" />
          <ellipse cx="64" cy="50" rx="6" ry="4" fill="rgba(255,150,150,0.25)" />
          {/* Lipstick */}
          {(config.makeup === 'bold' || config.makeup === 'light') && (
            <motion.path
              d={mouthPath}
              stroke={config.makeup === 'bold' ? '#C0392B' : '#E88080'}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              animate={{ d: mouthPath }}
              transition={{ duration: 0.35 }}
            />
          )}
        </>
      )}

      {/* ── Beard (male) ─────────────────────────────────────── */}
      {!isFemale && config.beard && config.beard !== 'none' && (
        <>
          {config.beard === 'stubble' && (
            <ellipse cx="44" cy="62" rx="14" ry="8" fill={hairColor} opacity="0.25" />
          )}
          {config.beard === 'short' && (
            <path d="M30 56 Q34 72 44 72 Q54 72 58 56 Q52 64 44 64 Q36 64 30 56Z" fill={hairColor} opacity="0.7" />
          )}
          {config.beard === 'full' && (
            <path d="M26 50 Q28 76 44 78 Q60 76 62 50 Q54 66 44 66 Q34 66 26 50Z" fill={hairColor} opacity="0.85" />
          )}
        </>
      )}

      {/* ── Mustache (male) ──────────────────────────────────── */}
      {!isFemale && config.mustache && config.mustache !== 'none' && (
        <>
          {config.mustache === 'thin' && (
            <path d="M36 54 Q44 56 52 54" stroke={hairColor} strokeWidth="2" fill="none" strokeLinecap="round" />
          )}
          {config.mustache === 'thick' && (
            <path d="M33 54 Q38 58 44 56 Q50 58 55 54 Q50 52 44 54 Q38 52 33 54Z" fill={hairColor} />
          )}
        </>
      )}
    </motion.svg>
  );
};
