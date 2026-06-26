import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/auth.store';
import api from '../../services/api';
import toast from 'react-hot-toast';

const LANGUAGES = ['English', 'Tamil', 'Hindi', 'German', 'French'];

export const LanguageSelector: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = user?.preferredLanguage || 'English';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = async (lang: string) => {
    setIsOpen(false);
    if (lang === currentLanguage) return;

    try {
      // 1. Update preferred language in database
      const { data } = await api.put('/auth/me', { preferredLanguage: lang });
      
      // 2. Update local Zustand auth store
      updateUser({ preferredLanguage: data.user.preferredLanguage });
      
      toast.success(`Language switched to ${lang}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update language preference');
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition-all border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-xs font-semibold text-white/80"
        title="Switch Language"
      >
        <span>🌐</span>
        <span className="max-w-[70px] truncate">{currentLanguage}</span>
        <span className="text-[10px] text-white/40">▼</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1.5 w-36 rounded-xl overflow-hidden border border-white/10 shadow-2xl z-50 p-1 flex flex-col"
          style={{ background: 'rgba(26, 29, 39, 0.98)', backdropFilter: 'blur(20px)' }}
        >
          {LANGUAGES.map((lang) => (
            <button
              type="button"
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`w-full text-left text-xs font-semibold py-2 px-3 rounded-lg transition-colors
                ${lang === currentLanguage
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/10'
                  : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            >
              {lang}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
