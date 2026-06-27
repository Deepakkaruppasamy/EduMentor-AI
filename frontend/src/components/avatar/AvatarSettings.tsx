import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAvatarStore } from '../../store/avatar.store';
import { useAuthStore } from '../../store/auth.store';
import { AvatarFrame } from './AvatarFrame';
import { AvatarCustomizer } from './AvatarCustomizer';
import { PoseSelector } from './PoseSelector';
import {
  AvatarExpression,
  EXPRESSION_LABELS,
  DEFAULT_MALE_CONFIG,
  DEFAULT_FEMALE_CONFIG,
} from '../../types/avatar.types';
import api from '../../services/api';
import toast from 'react-hot-toast';

type SettingsTab = 'preview' | 'customize' | 'pose' | 'expression' | 'photo';

const TAB_LABELS: Record<SettingsTab, string> = {
  preview:    '🎭 Preview',
  customize:  '🎨 Customize',
  pose:       '🧍 Pose',
  expression: '😊 Expression',
  photo:      '📷 Photo',
};

export const AvatarSettings: React.FC = () => {
  const { config, updateConfig, resetConfig, setExpression, interaction } = useAvatarStore();
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('preview');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [usePhoto, setUsePhoto] = useState(user?.useCustomPhoto || false);
  const photoRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data } = await api.put('/auth/avatar', {
        avatarGender: config.gender,
        avatarModel: JSON.stringify(config),
        avatarPose: config.pose,
        avatarExpression: config.expression,
        avatarOutfit: config.outfit,
        avatarAccessories: JSON.stringify(config.accessories),
        avatarAnimation: config.animationStyle,
        useCustomPhoto: usePhoto,
      });
      updateUser({
        avatarGender: data.user.avatarGender,
        avatarModel: data.user.avatarModel,
        avatarPose: data.user.avatarPose,
        avatarExpression: data.user.avatarExpression,
        avatarOutfit: data.user.avatarOutfit,
        avatarAccessories: data.user.avatarAccessories,
        avatarAnimation: data.user.avatarAnimation,
        useCustomPhoto: data.user.useCustomPhoto,
      });
      toast.success('Avatar saved successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save avatar');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }

    const formData = new FormData();
    formData.append('image', file);
    setIsUploading(true);
    try {
      const { data } = await api.post('/auth/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ profileImage: data.imageUrl });
      toast.success('Photo uploaded!');
    } catch {
      toast.error('Photo upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    resetConfig();
    toast.success('Avatar reset to default');
  };

  const expressions = Object.keys(EXPRESSION_LABELS) as AvatarExpression[];

  return (
    <div className="glass-card p-5 space-y-4 border border-white/5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>🎭</span> Avatar Settings
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="text-[10px] px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/5 text-white/40 hover:text-white/80 hover:border-white/15 transition-all"
          >
            ↩ Reset
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary text-[10px] py-1.5 px-4"
          >
            {isSaving ? (
              <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : '💾 Save Avatar'}
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {(Object.keys(TAB_LABELS) as SettingsTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              activeTab === tab
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                : 'text-white/40 hover:text-white/70 border border-transparent'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {/* Preview */}
          {activeTab === 'preview' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <AvatarFrame size={140} showControls />
              <div className="text-center space-y-1">
                <p className="text-xs font-semibold text-white">{user?.name}</p>
                <p className="text-[10px] text-white/40">Click • Double-click • Long press • Hover</p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-xs text-center">
                {[
                  { label: 'Single Click', action: '👋 Wave' },
                  { label: 'Double Click', action: '👍 Thumbs Up' },
                  { label: 'Long Press', action: '🌟 Pop Out' },
                  { label: 'Hover', action: '😊 Smile' },
                ].map((h) => (
                  <div key={h.label} className="rounded-xl p-2 bg-white/[0.03] border border-white/5">
                    <div className="text-[9px] text-white/30 font-semibold">{h.label}</div>
                    <div className="text-[10px] text-white/70 font-bold mt-0.5">{h.action}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customize */}
          {activeTab === 'customize' && <AvatarCustomizer />}

          {/* Pose */}
          {activeTab === 'pose' && <PoseSelector />}

          {/* Expression */}
          {activeTab === 'expression' && (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-3">
                Default Expression — <span className="text-primary-400">{EXPRESSION_LABELS[config.expression]}</span>
              </p>
              <div className="grid grid-cols-5 gap-2">
                {expressions.map((expr) => {
                  const icons: Record<AvatarExpression, string> = {
                    neutral: '😐', happy: '😄', smile: '🙂', laugh: '😂',
                    thinking: '🤔', confused: '😕', surprised: '😲',
                    excited: '🤩', proud: '😤', sleepy: '😴',
                  };
                  return (
                    <motion.button
                      key={expr}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        updateConfig({ expression: expr });
                        setExpression(expr);
                      }}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                        config.expression === expr
                          ? 'bg-primary-500/20 border-primary-500/40'
                          : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                      }`}
                    >
                      <span className="text-xl">{icons[expr]}</span>
                      <span className="text-[8px] text-white/50 font-semibold">{EXPRESSION_LABELS[expr]}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Photo */}
          {activeTab === 'photo' && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setUsePhoto(false)}
                  className={`flex-1 py-3 rounded-xl border text-xs font-semibold transition-all ${
                    !usePhoto ? 'bg-primary-500/20 border-primary-500/40 text-primary-300' : 'bg-white/[0.03] border-white/5 text-white/40'
                  }`}
                >
                  🎭 Use Avatar
                </button>
                <button
                  onClick={() => setUsePhoto(true)}
                  className={`flex-1 py-3 rounded-xl border text-xs font-semibold transition-all ${
                    usePhoto ? 'bg-primary-500/20 border-primary-500/40 text-primary-300' : 'bg-white/[0.03] border-white/5 text-white/40'
                  }`}
                >
                  📷 Use Photo
                </button>
              </div>

              {user?.profileImage && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <img src={user.profileImage} alt="Profile" className="h-12 w-12 rounded-xl object-cover" />
                  <div>
                    <p className="text-xs text-white font-semibold">Current Photo</p>
                    <p className="text-[10px] text-white/40 mt-0.5">Uploaded profile picture</p>
                  </div>
                </div>
              )}

              <button
                onClick={() => photoRef.current?.click()}
                disabled={isUploading}
                className="w-full py-3 rounded-xl border border-dashed border-white/15 text-xs text-white/50 hover:border-primary-500/40 hover:text-primary-400 transition-all flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <><div className="h-4 w-4 border-2 border-white/20 border-t-primary-400 rounded-full animate-spin" /> Uploading...</>
                ) : (
                  <><span>📸</span> Upload New Photo</>
                )}
              </button>
              <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />

              <p className="text-[10px] text-white/30 text-center">
                Switching modes keeps both options saved. You can switch back anytime.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
