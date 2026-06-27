import React from 'react';
import { motion } from 'framer-motion';
import { AvatarConfig, AvatarPose, SKIN_TONES } from '../../types/avatar.types';

interface AvatarBodyProps {
  config: AvatarConfig;
  pose: AvatarPose;
  animationName?: string;
}

// Outfit color schemes
const OUTFIT_COLORS: Record<string, { shirt: string; pants: string; accent: string }> = {
  casual:      { shirt: '#4A90D9', pants: '#2C3E50', accent: '#FFFFFF' },
  formal:      { shirt: '#FFFFFF', pants: '#1a1a2e', accent: '#2C3E50' },
  academic:    { shirt: '#8E44AD', pants: '#2C3E50', accent: '#F39C12' },
  sporty:      { shirt: '#E74C3C', pants: '#1a1a1a', accent: '#F39C12' },
  traditional: { shirt: '#27AE60', pants: '#1a472a', accent: '#F39C12' },
};

// Body transforms per pose
const POSE_TRANSFORMS: Record<AvatarPose, {
  leftArm: string; rightArm: string;
  leftHand: string; rightHand: string;
  bodyRotate: number; bodyY: number;
  leftLeg: string; rightLeg: string;
}> = {
  standing: {
    leftArm: 'rotate(-10, 34, 90)', rightArm: 'rotate(10, 54, 90)',
    leftHand: '', rightHand: '',
    bodyRotate: 0, bodyY: 0,
    leftLeg: '', rightLeg: '',
  },
  waving: {
    leftArm: 'rotate(-45, 34, 90)', rightArm: 'rotate(-100, 54, 88)',
    leftHand: '', rightHand: 'rotate(-20, 62, 78)',
    bodyRotate: 0, bodyY: 0,
    leftLeg: '', rightLeg: '',
  },
  hands_in_pocket: {
    leftArm: 'rotate(40, 34, 90)', rightArm: 'rotate(-40, 54, 90)',
    leftHand: '', rightHand: '',
    bodyRotate: 0, bodyY: 0,
    leftLeg: '', rightLeg: '',
  },
  folded_arms: {
    leftArm: 'rotate(55, 34, 90)', rightArm: 'rotate(-55, 54, 90)',
    leftHand: 'translate(14, -8)', rightHand: 'translate(-14, -8)',
    bodyRotate: 0, bodyY: 0,
    leftLeg: '', rightLeg: '',
  },
  thinking: {
    leftArm: 'rotate(-10, 34, 90)', rightArm: 'rotate(-80, 54, 88)',
    leftHand: '', rightHand: 'translate(-4, -12)',
    bodyRotate: 2, bodyY: 0,
    leftLeg: '', rightLeg: '',
  },
  typing: {
    leftArm: 'rotate(40, 34, 90)', rightArm: 'rotate(-40, 54, 90)',
    leftHand: 'translate(6, 10)', rightHand: 'translate(-6, 10)',
    bodyRotate: 5, bodyY: 4,
    leftLeg: 'rotate(10, 38, 130)', rightLeg: 'rotate(-10, 50, 130)',
  },
  reading: {
    leftArm: 'rotate(45, 34, 90)', rightArm: 'rotate(-45, 54, 90)',
    leftHand: 'translate(8, 8)', rightHand: 'translate(-8, 8)',
    bodyRotate: -3, bodyY: 0,
    leftLeg: '', rightLeg: '',
  },
  holding_coffee: {
    leftArm: 'rotate(-10, 34, 90)', rightArm: 'rotate(-70, 54, 90)',
    leftHand: '', rightHand: '',
    bodyRotate: 0, bodyY: 0,
    leftLeg: '', rightLeg: '',
  },
  peace_sign: {
    leftArm: 'rotate(-10, 34, 90)', rightArm: 'rotate(-90, 54, 88)',
    leftHand: '', rightHand: '',
    bodyRotate: 0, bodyY: 0,
    leftLeg: '', rightLeg: '',
  },
  namaste: {
    leftArm: 'rotate(50, 34, 90)', rightArm: 'rotate(-50, 54, 90)',
    leftHand: 'translate(10, 0)', rightHand: 'translate(-10, 0)',
    bodyRotate: 0, bodyY: 0,
    leftLeg: '', rightLeg: '',
  },
  thumbs_up: {
    leftArm: 'rotate(-10, 34, 90)', rightArm: 'rotate(-90, 54, 88)',
    leftHand: '', rightHand: 'rotate(10, 62, 80)',
    bodyRotate: 0, bodyY: 0,
    leftLeg: '', rightLeg: '',
  },
  sitting: {
    leftArm: 'rotate(-10, 34, 90)', rightArm: 'rotate(10, 54, 90)',
    leftHand: '', rightHand: '',
    bodyRotate: 0, bodyY: 8,
    leftLeg: 'rotate(80, 38, 128)', rightLeg: 'rotate(-80, 50, 128)',
  },
  leaning: {
    leftArm: 'rotate(-60, 34, 88)', rightArm: 'rotate(10, 54, 90)',
    leftHand: 'translate(-2, -14)', rightHand: '',
    bodyRotate: -8, bodyY: 0,
    leftLeg: '', rightLeg: '',
  },
  saluting: {
    leftArm: 'rotate(-10, 34, 90)', rightArm: 'rotate(-100, 54, 86)',
    leftHand: '', rightHand: 'translate(-4, -14)',
    bodyRotate: 0, bodyY: 0,
    leftLeg: '', rightLeg: '',
  },
  pointing: {
    leftArm: 'rotate(-10, 34, 90)', rightArm: 'rotate(-60, 54, 90)',
    leftHand: '', rightHand: 'rotate(30, 62, 84)',
    bodyRotate: 0, bodyY: 0,
    leftLeg: '', rightLeg: '',
  },
  victory: {
    leftArm: 'rotate(-80, 34, 88)', rightArm: 'rotate(80, 54, 88)',
    leftHand: 'translate(0, -14)', rightHand: 'translate(0, -14)',
    bodyRotate: 0, bodyY: 0,
    leftLeg: '', rightLeg: '',
  },
  professional: {
    leftArm: 'rotate(-5, 34, 90)', rightArm: 'rotate(5, 54, 90)',
    leftHand: '', rightHand: '',
    bodyRotate: 0, bodyY: 0,
    leftLeg: '', rightLeg: '',
  },
  relaxed: {
    leftArm: 'rotate(20, 34, 90)', rightArm: 'rotate(-20, 54, 90)',
    leftHand: '', rightHand: '',
    bodyRotate: 3, bodyY: 0,
    leftLeg: 'rotate(5, 38, 128)', rightLeg: 'rotate(-5, 50, 128)',
  },
  walking: {
    leftArm: 'rotate(25, 34, 90)', rightArm: 'rotate(-25, 54, 90)',
    leftHand: '', rightHand: '',
    bodyRotate: 2, bodyY: 0,
    leftLeg: 'rotate(20, 38, 128)', rightLeg: 'rotate(-20, 50, 128)',
  },
};

export const AvatarBody: React.FC<AvatarBodyProps> = ({ config, pose, animationName }) => {
  const skin = SKIN_TONES[config.skinTone];
  const outfit = OUTFIT_COLORS[config.outfit] || OUTFIT_COLORS.casual;
  const pt = POSE_TRANSFORMS[pose] || POSE_TRANSFORMS.standing;
  const isFemale = config.gender === 'female';

  // Special hand props for specific poses
  const renderSpecialHands = () => {
    if (pose === 'holding_coffee') {
      return (
        <g transform="translate(56, 106)">
          <rect x="-6" y="-6" width="12" height="14" rx="3" fill="#8B4513" />
          <rect x="-4" y="-4" width="8" height="10" rx="2" fill="#6F4E37" />
          <line x1="6" y1="0" x2="10" y2="4" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    }
    if (pose === 'thumbs_up') {
      return (
        <g transform={`rotate(-90, 54, 88) translate(54, 74)`}>
          <rect x="-4" y="-8" width="8" height="12" rx="3" fill={skin.base} />
          <rect x="-3" y="-14" width="6" height="8" rx="2" fill={skin.base} />
        </g>
      );
    }
    if (pose === 'peace_sign') {
      return (
        <g transform={`rotate(-90, 54, 88) translate(54, 74)`}>
          <rect x="-5" y="-4" width="10" height="8" rx="2" fill={skin.base} />
          <rect x="-5" y="-14" width="4" height="12" rx="2" fill={skin.base} />
          <rect x="1" y="-14" width="4" height="12" rx="2" fill={skin.base} />
        </g>
      );
    }
    if (pose === 'namaste') {
      return (
        <g transform="translate(44, 108)">
          <rect x="-8" y="-6" width="16" height="12" rx="3" fill={skin.base} />
        </g>
      );
    }
    return null;
  };

  return (
    <motion.svg
      viewBox="0 0 88 160"
      width={88}
      height={88}
      style={{ overflow: 'visible' }}
      animate={{ rotate: pt.bodyRotate, y: pt.bodyY }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {/* ── Neck ─────────────────────────────────────────────── */}
      <rect x="38" y="78" width="12" height="12" rx="4" fill={skin.base} />

      {/* ── Shirt / Body ─────────────────────────────────────── */}
      <path
        d={isFemale
          ? 'M22 90 Q28 86 38 88 L44 92 L50 88 Q60 86 66 90 L68 130 L20 130 Z'
          : 'M20 90 Q28 86 38 88 L44 92 L50 88 Q60 86 68 90 L70 130 L18 130 Z'}
        fill={outfit.shirt}
      />
      {/* Collar */}
      <path
        d="M38 88 L44 96 L50 88 L48 88 L44 94 L40 88 Z"
        fill={config.outfit === 'formal' ? '#E0E0E0' : outfit.shirt}
        stroke={outfit.accent} strokeWidth="0.5"
      />

      {/* ── Pants / Lower ────────────────────────────────────── */}
      <rect x="20" y="128" width="20" height="28" rx="4" fill={outfit.pants} transform={pt.leftLeg} />
      <rect x="48" y="128" width="20" height="28" rx="4" fill={outfit.pants} transform={pt.rightLeg} />

      {/* ── Shoes ────────────────────────────────────────────── */}
      <ellipse cx="30" cy="158" rx="11" ry="5" fill="#1a1a1a" />
      <ellipse cx="58" cy="158" rx="11" ry="5" fill="#1a1a1a" />

      {/* ── Arms ─────────────────────────────────────────────── */}
      {/* Left Arm */}
      <g transform={pt.leftArm}>
        <rect x="12" y="88" width="10" height="30" rx="5" fill={outfit.shirt} />
        {/* Left Hand */}
        <g transform={pt.leftHand}>
          <ellipse cx="17" cy="120" rx="6" ry="7" fill={skin.base} />
        </g>
      </g>

      {/* Right Arm */}
      <g transform={pt.rightArm}>
        <rect x="66" y="88" width="10" height="30" rx="5" fill={outfit.shirt} />
        {/* Right Hand */}
        <g transform={pt.rightHand}>
          <ellipse cx="71" cy="120" rx="6" ry="7" fill={skin.base} />
        </g>
      </g>

      {/* Special pose hands */}
      {renderSpecialHands()}

      {/* Formal outfit tie */}
      {config.outfit === 'formal' && (
        <path d="M42 90 L44 108 L46 90 L44 88 Z" fill="#C0392B" />
      )}

      {/* Academic outfit tassel/badge */}
      {config.outfit === 'academic' && (
        <circle cx="36" cy="96" r="4" fill={outfit.accent} opacity="0.9" />
      )}
    </motion.svg>
  );
};
