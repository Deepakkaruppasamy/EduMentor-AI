import React from 'react';
import { motion } from 'framer-motion';
import { useAvatarStore } from '../../store/avatar.store';
import { AvatarPose, POSE_LABELS } from '../../types/avatar.types';

// Emoji representations for each pose
const POSE_ICONS: Record<AvatarPose, string> = {
  standing:        '🧍',
  waving:          '👋',
  hands_in_pocket: '🫴',
  folded_arms:     '🫂',
  thinking:        '🤔',
  typing:          '💻',
  reading:         '📖',
  holding_coffee:  '☕',
  peace_sign:      '✌️',
  namaste:         '🙏',
  thumbs_up:       '👍',
  sitting:         '🪑',
  leaning:         '🤙',
  saluting:        '🫡',
  pointing:        '👉',
  victory:         '🙌',
  professional:    '💼',
  relaxed:         '😌',
  walking:         '🚶',
};

export const PoseSelector: React.FC = () => {
  const { config, updateConfig, setPose } = useAvatarStore();

  const poses = Object.keys(POSE_LABELS) as AvatarPose[];

  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-3">
        Avatar Pose — <span className="text-primary-400">{POSE_LABELS[config.pose]}</span>
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {poses.map((pose) => (
          <motion.button
            key={pose}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              updateConfig({ pose });
              setPose(pose);
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
              config.pose === pose
                ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                : 'bg-white/[0.02] border-white/5 text-white/40 hover:border-white/15 hover:text-white/70'
            }`}
          >
            <span className="text-lg leading-none">{POSE_ICONS[pose]}</span>
            <span className="text-[8px] font-semibold leading-tight text-center line-clamp-2">
              {POSE_LABELS[pose]}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
