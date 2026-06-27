import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAvatarStore } from '../../store/avatar.store';
import {
  AvatarConfig,
  AvatarSkinTone,
  AvatarHairStyle,
  AvatarHairColor,
  AvatarEyeColor,
  AvatarOutfit,
  AvatarAnimation,
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
} from '../../types/avatar.types';

type Tab = 'face' | 'hair' | 'style' | 'extras' | 'frame';

const TAB_LABELS: Record<Tab, string> = {
  face:   '👤 Face',
  hair:   '💇 Hair',
  style:  '👗 Style',
  extras: '🕶️ Extras',
  frame:  '🖼️ Frame',
};

interface SwatchProps {
  color: string;
  selected: boolean;
  onClick: () => void;
  label?: string;
}

const Swatch: React.FC<SwatchProps> = ({ color, selected, onClick, label }) => (
  <button
    onClick={onClick}
    title={label}
    className={`w-7 h-7 rounded-full border-2 transition-all ${selected ? 'border-primary-400 scale-110 shadow-lg shadow-primary-500/30' : 'border-white/10 hover:border-white/30'}`}
    style={{ background: color }}
  />
);

interface OptionButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

const OptionBtn: React.FC<OptionButtonProps> = ({ label, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all border ${
      selected
        ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
        : 'bg-white/[0.03] border-white/5 text-white/50 hover:border-white/20 hover:text-white/80'
    }`}
  >
    {label}
  </button>
);

export const AvatarCustomizer: React.FC = () => {
  const { config, updateConfig } = useAvatarStore();
  const [activeTab, setActiveTab] = useState<Tab>('face');

  const SKIN_TONE_OPTS: { key: AvatarSkinTone; color: string; label: string }[] = [
    { key: 'light',        color: SKIN_TONES.light.base,        label: 'Light' },
    { key: 'medium_light', color: SKIN_TONES.medium_light.base, label: 'Medium Light' },
    { key: 'medium',       color: SKIN_TONES.medium.base,       label: 'Medium' },
    { key: 'medium_dark',  color: SKIN_TONES.medium_dark.base,  label: 'Medium Dark' },
    { key: 'dark',         color: SKIN_TONES.dark.base,         label: 'Dark' },
  ];

  const HAIR_STYLE_OPTS: AvatarHairStyle[] = ['short', 'medium', 'long', 'curly', 'wavy', 'bald', 'ponytail', 'bun'];
  const HAIR_COLOR_OPTS: { key: AvatarHairColor; label: string }[] = [
    { key: 'black', label: 'Black' }, { key: 'brown', label: 'Brown' },
    { key: 'blonde', label: 'Blonde' }, { key: 'auburn', label: 'Auburn' },
    { key: 'red', label: 'Red' }, { key: 'gray', label: 'Gray' },
    { key: 'white', label: 'White' }, { key: 'blue', label: 'Blue' },
    { key: 'pink', label: 'Pink' },
  ];
  const EYE_COLOR_OPTS: { key: AvatarEyeColor; label: string }[] = [
    { key: 'brown', label: 'Brown' }, { key: 'dark_brown', label: 'Dark Brown' },
    { key: 'blue', label: 'Blue' }, { key: 'green', label: 'Green' },
    { key: 'hazel', label: 'Hazel' }, { key: 'gray', label: 'Gray' },
    { key: 'black', label: 'Black' },
  ];
  const OUTFIT_OPTS: AvatarOutfit[] = ['casual', 'formal', 'academic', 'sporty', 'traditional'];
  const BG_OPTS = [
    { key: 'gradient_blue',   label: 'Ocean Blue' },
    { key: 'gradient_purple', label: 'Royal Purple' },
    { key: 'gradient_green',  label: 'Forest Green' },
    { key: 'gradient_sunset', label: 'Sunset' },
    { key: 'gradient_ocean',  label: 'Deep Ocean' },
    { key: 'dark',            label: 'Dark' },
    { key: 'light',           label: 'Light' },
  ];
  const FRAME_OPTS: AvatarConfig['frame'][] = ['circle', 'rounded', 'hexagon', 'none'];
  const ANIM_OPTS: AvatarAnimation[] = ['smooth', 'bouncy', 'minimal', 'expressive'];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
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

      {/* Panel Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.15 }}
          className="space-y-4"
        >
          {/* ── Face Tab ── */}
          {activeTab === 'face' && (
            <div className="space-y-4">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-2">Skin Tone</p>
                <div className="flex gap-2 flex-wrap">
                  {SKIN_TONE_OPTS.map((s) => (
                    <Swatch key={s.key} color={s.color} label={s.label}
                      selected={config.skinTone === s.key}
                      onClick={() => updateConfig({ skinTone: s.key })} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-2">Eye Color</p>
                <div className="flex gap-2 flex-wrap">
                  {EYE_COLOR_OPTS.map((e) => (
                    <Swatch key={e.key} color={EYE_COLORS[e.key]} label={e.label}
                      selected={config.eyeColor === e.key}
                      onClick={() => updateConfig({ eyeColor: e.key })} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-2">Eyebrows</p>
                <div className="flex gap-1.5 flex-wrap">
                  {(['thin', 'medium', 'thick', 'arched'] as const).map((b) => (
                    <OptionBtn key={b} label={b.charAt(0).toUpperCase() + b.slice(1)}
                      selected={config.eyebrows === b}
                      onClick={() => updateConfig({ eyebrows: b })} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-2">Glasses</p>
                <div className="flex gap-1.5 flex-wrap">
                  {(['none', 'round', 'square', 'rimless'] as const).map((g) => (
                    <OptionBtn key={g} label={g === 'none' ? 'None' : g.charAt(0).toUpperCase() + g.slice(1)}
                      selected={config.glasses === g}
                      onClick={() => updateConfig({ glasses: g })} />
                  ))}
                </div>
              </div>

              {/* Gender-specific */}
              {config.gender === 'male' && (
                <>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-2">Beard</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {(['none', 'stubble', 'short', 'full'] as const).map((b) => (
                        <OptionBtn key={b} label={b === 'none' ? 'None' : b.charAt(0).toUpperCase() + b.slice(1)}
                          selected={config.beard === b}
                          onClick={() => updateConfig({ beard: b })} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-2">Mustache</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {(['none', 'thin', 'thick'] as const).map((m) => (
                        <OptionBtn key={m} label={m === 'none' ? 'None' : m.charAt(0).toUpperCase() + m.slice(1)}
                          selected={config.mustache === m}
                          onClick={() => updateConfig({ mustache: m })} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {config.gender === 'female' && (
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-2">Makeup</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {(['none', 'light', 'natural', 'bold'] as const).map((m) => (
                      <OptionBtn key={m} label={m === 'none' ? 'None' : m.charAt(0).toUpperCase() + m.slice(1)}
                        selected={config.makeup === m}
                        onClick={() => updateConfig({ makeup: m })} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Hair Tab ── */}
          {activeTab === 'hair' && (
            <div className="space-y-4">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-2">Hairstyle</p>
                <div className="flex gap-1.5 flex-wrap">
                  {HAIR_STYLE_OPTS.map((h) => (
                    <OptionBtn key={h} label={h.charAt(0).toUpperCase() + h.slice(1)}
                      selected={config.hairStyle === h}
                      onClick={() => updateConfig({ hairStyle: h })} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-2">Hair Color</p>
                <div className="flex gap-2 flex-wrap">
                  {HAIR_COLOR_OPTS.map((c) => (
                    <Swatch key={c.key} color={HAIR_COLORS[c.key]} label={c.label}
                      selected={config.hairColor === c.key}
                      onClick={() => updateConfig({ hairColor: c.key })} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Style Tab ── */}
          {activeTab === 'style' && (
            <div className="space-y-4">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-2">Outfit / Clothing</p>
                <div className="flex gap-1.5 flex-wrap">
                  {OUTFIT_OPTS.map((o) => (
                    <OptionBtn key={o} label={o.charAt(0).toUpperCase() + o.slice(1)}
                      selected={config.outfit === o}
                      onClick={() => updateConfig({ outfit: o })} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-2">Background</p>
                <div className="flex gap-1.5 flex-wrap">
                  {BG_OPTS.map((bg) => (
                    <OptionBtn key={bg.key} label={bg.label}
                      selected={config.background === bg.key}
                      onClick={() => updateConfig({ background: bg.key })} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-2">Animation Style</p>
                <div className="flex gap-1.5 flex-wrap">
                  {ANIM_OPTS.map((a) => (
                    <OptionBtn key={a} label={a.charAt(0).toUpperCase() + a.slice(1)}
                      selected={config.animationStyle === a}
                      onClick={() => updateConfig({ animationStyle: a })} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Extras Tab ── */}
          {activeTab === 'extras' && (
            <div className="space-y-4">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-2">Accessories</p>
                <div className="flex gap-1.5 flex-wrap">
                  {['None', 'Earrings', 'Necklace', 'Watch', 'Bracelet', 'Headband'].map((a) => {
                    const key = a.toLowerCase();
                    const selected = a === 'None'
                      ? config.accessories.length === 0
                      : config.accessories.includes(key);
                    return (
                      <OptionBtn key={a} label={a} selected={selected}
                        onClick={() => {
                          if (a === 'None') { updateConfig({ accessories: [] }); return; }
                          const acc = config.accessories.includes(key)
                            ? config.accessories.filter((x) => x !== key)
                            : [...config.accessories, key];
                          updateConfig({ accessories: acc });
                        }} />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Frame Tab ── */}
          {activeTab === 'frame' && (
            <div className="space-y-4">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-2">Profile Frame Shape</p>
                <div className="flex gap-1.5 flex-wrap">
                  {FRAME_OPTS.map((f) => (
                    <OptionBtn key={f} label={f === 'none' ? 'Square' : f.charAt(0).toUpperCase() + f.slice(1)}
                      selected={config.frame === f}
                      onClick={() => updateConfig({ frame: f })} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-2">Gender</p>
                <div className="flex gap-1.5">
                  <OptionBtn label="♂ Male" selected={config.gender === 'male'}
                    onClick={() => updateConfig({ gender: 'male' })} />
                  <OptionBtn label="♀ Female" selected={config.gender === 'female'}
                    onClick={() => updateConfig({ gender: 'female' })} />
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
