import React from 'react';
import { useAuthStore } from '../../store/auth.store';
import { useCommandPaletteStore } from '../../store/command-palette.store';

export const GlobalSearchBar: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { setIsOpen } = useCommandPaletteStore();

  if (!isAuthenticated) return null;

  return (
    <button
      id="global-search-btn"
      onClick={() => setIsOpen(true)}
      className="flex items-center gap-2 text-xs transition-all px-3 py-2.5 rounded-xl border w-full text-left cursor-pointer"
      style={{
        background: 'var(--bg-input)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-muted)'
      }}
    >
      <span>🔍</span>
      <span className="font-medium">Search everything...</span>
      <kbd className="ml-auto text-[9px] px-1.5 py-0.5 rounded font-bold font-mono" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>⌘K</kbd>
    </button>
  );
};
