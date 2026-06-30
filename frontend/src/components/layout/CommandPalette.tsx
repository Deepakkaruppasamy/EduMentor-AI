import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';
import toast from 'react-hot-toast';

interface Command {
  id: string;
  icon: string;
  label: string;
  description?: string;
  category: string;
  action: () => void;
  keywords?: string[];
}

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const go = (path: string) => { setOpen(false); setQuery(''); navigate(path); };

  // Build command list based on user role
  const allCommands: Command[] = [
    // ── Navigation ──
    ...(user?.role === 'student' ? [
      { id: 'nav-dashboard', icon: '📊', label: 'Dashboard', category: 'Navigate', action: () => go('/dashboard'), keywords: ['home', 'overview'] },
      { id: 'nav-chat', icon: '💬', label: 'AI Chat Tutor', category: 'Navigate', action: () => go('/chat'), keywords: ['chat', 'ai', 'tutor', 'ask'] },
      { id: 'nav-quiz', icon: '📝', label: 'Quiz Generator', category: 'Navigate', action: () => go('/quiz'), keywords: ['quiz', 'test', 'mcq'] },
      { id: 'nav-notes', icon: '📓', label: 'Notes Generator', category: 'Navigate', action: () => go('/notes-generator'), keywords: ['notes', 'summary', 'revision'] },
      { id: 'nav-flashcards', icon: '🎴', label: 'Flashcards', category: 'Navigate', action: () => go('/flashcards'), keywords: ['flash', 'card', 'memory'] },
      { id: 'nav-planner', icon: '🗓️', label: 'Study Planner', category: 'Navigate', action: () => go('/study-planner'), keywords: ['plan', 'schedule', 'study'] },
      { id: 'nav-research', icon: '🔬', label: 'Research Assistant', category: 'Navigate', action: () => go('/research-assistant'), keywords: ['research', 'paper', 'pdf'] },
      { id: 'nav-assignment', icon: '📋', label: 'Assignment Evaluator', category: 'Navigate', action: () => go('/assignment-evaluator'), keywords: ['assignment', 'grade', 'evaluate'] },
      { id: 'nav-recommendations', icon: '🎯', label: 'Recommendations', category: 'Navigate', action: () => go('/recommendations'), keywords: ['recommend', 'topics', 'weak'] },
      { id: 'nav-courses', icon: '📚', label: 'My Courses', category: 'Navigate', action: () => go('/courses'), keywords: ['course', 'subject', 'enroll'] },
      { id: 'nav-reports', icon: '🖨️', label: 'AI Reports', category: 'Navigate', action: () => go('/reports'), keywords: ['report', 'pdf', 'download'] },
    ] : []),
    ...(user?.role === 'faculty' || user?.role === 'admin' ? [
      { id: 'nav-admin', icon: '📈', label: 'Dashboard', category: 'Navigate', action: () => go('/admin'), keywords: ['home', 'overview', 'admin'] },
      { id: 'nav-analytics', icon: '📊', label: 'Analytics', category: 'Navigate', action: () => go('/analytics'), keywords: ['analytics', 'stats', 'data'] },
      { id: 'nav-documents', icon: '📁', label: 'Upload Documents', category: 'Navigate', action: () => go('/documents'), keywords: ['upload', 'pdf', 'document'] },
      { id: 'nav-gradebook', icon: '📒', label: 'Gradebook', category: 'Navigate', action: () => go('/gradebook'), keywords: ['grade', 'marks', 'score'] },
      { id: 'nav-faculty-ai', icon: '🧙‍♂️', label: 'Faculty AI Assistant', category: 'Navigate', action: () => go('/faculty-ai-assistant'), keywords: ['ai', 'assistant', 'help'] },
      { id: 'nav-quiz-faculty', icon: '⚔️', label: 'Quiz Battle Arena', category: 'Navigate', action: () => go('/quiz'), keywords: ['quiz', 'battle', 'live'] },
      { id: 'nav-courses-faculty', icon: '📚', label: 'Manage Courses', category: 'Navigate', action: () => go('/courses'), keywords: ['course', 'manage'] },
      { id: 'nav-reports-faculty', icon: '🖨️', label: 'AI Reports', category: 'Navigate', action: () => go('/reports'), keywords: ['report', 'pdf'] },
    ] : []),
    ...(user?.role === 'admin' ? [
      { id: 'nav-users', icon: '👥', label: 'User Directory', category: 'Navigate', action: () => go('/admin/users'), keywords: ['users', 'students', 'faculty', 'manage'] },
      { id: 'nav-ai-eval', icon: '🧪', label: 'AI Evaluation', category: 'Navigate', action: () => go('/ai-evaluation'), keywords: ['evaluation', 'metrics', 'rag', 'accuracy'] },
    ] : []),
    // ── Shared pages ──
    { id: 'nav-messages', icon: '✉️', label: 'Messages', category: 'Navigate', action: () => go('/messages'), keywords: ['messages', 'chat', 'inbox'] },
    { id: 'nav-announcements', icon: '📣', label: 'Announcements', category: 'Navigate', action: () => go('/announcements'), keywords: ['announcement', 'notice', 'post'] },
    { id: 'nav-support', icon: '🛠️', label: 'Support Center', category: 'Navigate', action: () => go('/support'), keywords: ['support', 'help', 'ticket'] },
    { id: 'nav-meetings', icon: '📅', label: 'Meeting Scheduler', category: 'Navigate', action: () => go('/meetings'), keywords: ['meeting', 'appointment', 'schedule'] },
    { id: 'nav-office-hours', icon: '🏫', label: 'Office Hours', category: 'Navigate', action: () => go('/office-hours'), keywords: ['office', 'hours', 'slot'] },
    { id: 'nav-calendar', icon: '📆', label: 'Academic Calendar', category: 'Navigate', action: () => go('/calendar'), keywords: ['calendar', 'events', 'academic'] },
    { id: 'nav-profile', icon: '👤', label: 'My Profile', category: 'Navigate', action: () => go('/profile'), keywords: ['profile', 'account', 'settings'] },
    { id: 'nav-avatar', icon: '🎭', label: 'Avatar Studio', category: 'Navigate', action: () => go('/avatar-settings'), keywords: ['avatar', 'studio', 'appearance'] },
    { id: 'nav-feedback', icon: '💬', label: 'Feedback Center', category: 'Navigate', action: () => go('/feedback'), keywords: ['feedback', 'rate', 'review'] },
    // ── Actions ──
    {
      id: 'action-theme',
      icon: theme === 'dark' ? '☀️' : '🌙',
      label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      description: 'Toggle between dark and light themes',
      category: 'Actions',
      action: () => { toggleTheme(); setOpen(false); setQuery(''); toast.success(theme === 'dark' ? '☀️ Light mode enabled' : '🌙 Dark mode enabled'); },
      keywords: ['theme', 'dark', 'light', 'mode', 'toggle'],
    },
    {
      id: 'action-logout',
      icon: '🚪',
      label: 'Sign Out',
      description: 'Log out of EduMentor AI',
      category: 'Actions',
      action: () => { logout(); toast.success('Logged out successfully'); navigate('/login'); setOpen(false); },
      keywords: ['logout', 'sign out', 'exit'],
    },
  ];

  // Filter by query
  const filtered = query.trim().length === 0
    ? allCommands
    : allCommands.filter(cmd => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.category.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.keywords?.some(k => k.includes(q))
        );
      });

  // Group by category
  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    (acc[cmd.category] = acc[cmd.category] || []).push(cmd);
    return acc;
  }, {});

  // Flat list for keyboard nav
  const flat = filtered;

  // Ctrl+K / Cmd+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Reset selection when query changes
  useEffect(() => { setSelectedIdx(0); }, [query]);

  const handleKeyNav = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { setSelectedIdx(p => Math.min(p + 1, flat.length - 1)); e.preventDefault(); }
    if (e.key === 'ArrowUp') { setSelectedIdx(p => Math.max(p - 1, 0)); e.preventDefault(); }
    if (e.key === 'Enter' && flat[selectedIdx]) { flat[selectedIdx].action(); }
  };

  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);

  if (!user) return null;

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[500] flex items-start justify-center pt-20 px-4"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
            style={{
              background: 'var(--bg-modal)',
              border: '1px solid var(--border-medium)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }} className="text-base flex-shrink-0">⌘</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyNav}
                placeholder="Search commands, pages, actions…"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--text-primary)' }}
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ color: 'var(--text-muted)' }} className="text-xs hover:opacity-80">✕</button>
              )}
              <kbd className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[420px] overflow-y-auto py-2" style={{ scrollbarWidth: 'thin' }}>
              {flat.length === 0 && (
                <div className="py-10 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  No commands found for "<span style={{ color: 'var(--text-primary)' }}>{query}</span>"
                </div>
              )}

              {Object.entries(grouped).map(([category, cmds]) => (
                <div key={category}>
                  <div className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    {category}
                  </div>
                  {cmds.map(cmd => {
                    const globalIdx = flat.findIndex(c => c.id === cmd.id);
                    const isSelected = globalIdx === selectedIdx;
                    return (
                      <button
                        key={cmd.id}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelectedIdx(globalIdx)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                        style={{
                          background: isSelected ? 'rgba(79,99,255,0.12)' : 'transparent',
                          borderLeft: isSelected ? '2px solid #4f63ff' : '2px solid transparent',
                        }}
                      >
                        <span className="text-base flex-shrink-0">{cmd.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{cmd.label}</div>
                          {cmd.description && (
                            <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{cmd.description}</div>
                          )}
                        </div>
                        {isSelected && (
                          <kbd className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>↵</kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2.5 text-[9px]" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <span>↑↓ navigate</span>
              <span>↵ run</span>
              <span>ESC close</span>
              <span className="ml-auto">{flat.length} command{flat.length !== 1 ? 's' : ''}</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
