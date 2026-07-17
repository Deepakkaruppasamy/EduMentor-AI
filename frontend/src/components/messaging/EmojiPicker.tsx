import React, { useState, useRef, useEffect } from 'react';

// Built-in emoji picker — no external dependency needed
const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
  {
    name: '😊 Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'],
  },
  {
    name: '👋 Gestures',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪'],
  },
  {
    name: '❤️ Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️'],
  },
  {
    name: '📚 Education',
    emojis: ['📚', '📖', '📝', '✏️', '📐', '📏', '🎓', '🏫', '📓', '📒', '📕', '📗', '📘', '📙', '🔬', '🔭', '💻', '🖥️', '⌨️', '🖱️', '📊', '📈', '📉', '🗂️', '📁', '📂', '🗃️', '✅', '❌', '❓', '❗', '💡', '🔔', '📌', '📎', '🔗', '✂️', '🗑️'],
  },
  {
    name: '🎉 Celebration',
    emojis: ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '⭐', '🌟', '✨', '💫', '🔥', '💯', '🎯', '🚀', '💪', '👑'],
  },
  {
    name: '⏰ Time',
    emojis: ['⏰', '⏱️', '⏲️', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '📅', '📆', '🗓️'],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filteredEmojis = search
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis)
    : EMOJI_CATEGORIES[activeCategory]?.emojis || [];

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 left-0 w-[320px] rounded-xl overflow-hidden shadow-2xl z-50"
      style={{
        background: 'rgba(17,19,24,0.98)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Search */}
      <div className="p-2 border-b border-white/5">
        <input
          type="text"
          placeholder="Search emoji…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/80 outline-none focus:border-[#4f5dc8]/50 placeholder:text-white/20"
          autoFocus
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex gap-0.5 px-1 py-1 border-b border-white/5 overflow-x-auto">
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(i)}
              className={`px-2 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
                i === activeCategory
                  ? 'bg-[#4f5dc8]/15 text-[#8b94e0]'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {cat.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="p-2 h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        <div className="grid grid-cols-8 gap-0.5">
          {filteredEmojis.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              onClick={() => onSelect(emoji)}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-lg"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
