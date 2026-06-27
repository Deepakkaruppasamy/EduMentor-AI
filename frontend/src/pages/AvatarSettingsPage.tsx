import React, { Suspense } from 'react';
import { AvatarFrame } from '../components/avatar/AvatarFrame';
import { AvatarCustomizer } from '../components/avatar/AvatarCustomizer';
import { PoseSelector } from '../components/avatar/PoseSelector';
import { AvatarSettings } from '../components/avatar/AvatarSettings';
import { useAvatarStore } from '../store/avatar.store';
import { Loader } from '../components/common/Loader';

export const AvatarSettingsPage: React.FC = () => {
  const { config } = useAvatarStore();

  return (
    <Suspense fallback={<Loader message="Loading Avatar Studio..." />}>
      <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fadeIn">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🎭 <span>Avatar Studio</span>
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Personalize your interactive AI companion avatar
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Live Preview Column */}
          <div className="flex flex-col gap-4">
            {/* Live Avatar preview */}
            <div className="glass-card p-6 flex flex-col items-center gap-4 border border-white/5">
              <div className="text-[9px] uppercase tracking-wider text-white/30 font-bold self-start">Live Preview</div>
              <AvatarFrame size={160} showControls />
              <div className="text-center">
                <p className="text-[10px] text-white/40">Try interacting with your avatar!</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  <span className="text-[9px] bg-white/5 border border-white/5 rounded-full px-2 py-0.5 text-white/40">Click → Wave</span>
                  <span className="text-[9px] bg-white/5 border border-white/5 rounded-full px-2 py-0.5 text-white/40">2× Click → Thumbs Up</span>
                  <span className="text-[9px] bg-white/5 border border-white/5 rounded-full px-2 py-0.5 text-white/40">Hold → Pop Out</span>
                </div>
              </div>
            </div>

            {/* Config summary */}
            <div className="glass-card p-4 space-y-2 border border-white/5">
              <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold">Current Config</p>
              {[
                { label: 'Gender',     value: config.gender },
                { label: 'Skin Tone',  value: config.skinTone.replace('_', ' ') },
                { label: 'Hair',       value: `${config.hairStyle} / ${config.hairColor}` },
                { label: 'Pose',       value: config.pose.replace(/_/g, ' ') },
                { label: 'Expression', value: config.expression },
                { label: 'Outfit',     value: config.outfit },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-[10px]">
                  <span className="text-white/30">{item.label}</span>
                  <span className="text-white/70 font-semibold capitalize">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Settings Column (span 2) */}
          <div className="lg:col-span-2 space-y-5">
            <AvatarSettings />

            {/* Pose Selector standalone section */}
            <div className="glass-card p-5 border border-white/5">
              <PoseSelector />
            </div>

            {/* Customizer standalone section */}
            <div className="glass-card p-5 border border-white/5">
              <div className="mb-4">
                <p className="text-sm font-bold text-white">🎨 Appearance Customizer</p>
                <p className="text-[10px] text-white/40 mt-0.5">Fine-tune every detail of your avatar</p>
              </div>
              <AvatarCustomizer />
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
};
