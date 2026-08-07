import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../../store/auth.store';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const LANGUAGES = [
  // Indian Languages (22 Scheduled Languages — 8th Schedule)
  'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil',
  'Urdu', 'Gujarati', 'Kannada', 'Malayalam', 'Odia',
  'Punjabi', 'Assamese', 'Maithili', 'Sanskrit', 'Santali',
  'Kashmiri', 'Nepali', 'Sindhi', 'Konkani', 'Manipuri',
  'Bodo', 'Dogri',
  // International Languages
  'English', 'Spanish', 'French', 'German', 'Chinese',
  'Arabic', 'Portuguese', 'Japanese', 'Korean', 'Russian',
];

export const LanguageSelector: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 176 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentLanguage = user?.preferredLanguage || 'English';

  // Reposition dropdown whenever it opens
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 280;
      const viewportHeight = window.innerHeight;

      // Open upward if not enough space below, otherwise downward
      const spaceBelow = viewportHeight - rect.bottom;
      const openUpward = spaceBelow < dropdownHeight + 8;

      setDropdownPos({
        top: openUpward ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
        left: rect.right - 176, // right-aligned with button
        width: 176,
      });
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        // Check if click is inside the portal dropdown
        const portal = document.getElementById('lang-selector-portal');
        if (portal && portal.contains(event.target as Node)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on scroll / resize
  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [isOpen]);

  const handleLanguageChange = async (lang: string) => {
    setIsOpen(false);
    if (lang === currentLanguage) return;
    try {
      const { data } = await api.put('/auth/me', { preferredLanguage: lang });
      updateUser({ preferredLanguage: data.user.preferredLanguage });
      toast.success(`Language switched to ${lang}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update language preference');
    }
  };

  const dropdown = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="lang-selector-portal"
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            zIndex: 99999,
            background: 'rgba(18, 20, 30, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            maxHeight: '280px',
            overflowY: 'auto',
          }}
        >
          {/* Indian Languages */}
          <div className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-white/25 border-b border-white/5 sticky top-0"
               style={{ background: 'rgba(18, 20, 30, 0.98)' }}>
            🇮🇳 Indian Languages
          </div>
          <div className="p-1">
            {LANGUAGES.slice(0, 22).map((lang) => (
              <button
                type="button"
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`w-full text-left text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors
                  ${lang === currentLanguage
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* International Languages */}
          <div className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-white/25 border-t border-b border-white/5 sticky top-0"
               style={{ background: 'rgba(18, 20, 30, 0.98)' }}>
            🌍 International
          </div>
          <div className="p-1">
            {LANGUAGES.slice(22).map((lang) => (
              <button
                type="button"
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`w-full text-left text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors
                  ${lang === currentLanguage
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              >
                {lang}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition-all border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-xs font-semibold text-white/80 active:scale-95"
        title="Switch Language"
      >
        <span>🌐</span>
        <span className="max-w-[80px] truncate">{currentLanguage}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-[10px] text-white/40 inline-block"
        >
          ▼
        </motion.span>
      </button>

      {/* Render dropdown via portal so it escapes overflow:hidden parents */}
      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </>
  );
};
