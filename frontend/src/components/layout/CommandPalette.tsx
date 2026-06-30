import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';
import { useCommandPaletteStore } from '../../store/command-palette.store';
import { searchService } from '../../services/search.service';
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

const TYPE_ICONS: Record<string, string> = {
  Course: '📚',
  User: '👤',
  Note: '📓',
  Event: '📆',
  Announcement: '📣',
  Assignment: '📋',
  Chat: '💬',
  Discussion: '🗣️',
  Ticket: '🛠️',
};

// Simple debounce helper
function useDebounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export const CommandPalette: React.FC = () => {
  const { isOpen, setIsOpen } = useCommandPaletteStore();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const go = (path: string) => {
    setIsOpen(false);
    setQuery('');
    setSearchResults([]);
    navigate(path);
  };

  // Static commands list
  const staticCommands: Command[] = [
    // Student links
    ...(user?.role === 'student' ? [
      { id: 'nav-dashboard', icon: '📊', label: 'Dashboard', category: 'Pages', action: () => go('/dashboard'), keywords: ['home', 'overview'] },
      { id: 'nav-chat', icon: '💬', label: 'AI Chat Tutor', category: 'Pages', action: () => go('/chat'), keywords: ['chat', 'ai', 'tutor', 'ask', 'llama'] },
      { id: 'nav-quiz', icon: '📝', label: 'Quiz Generator', category: 'Pages', action: () => go('/quiz'), keywords: ['quiz', 'test', 'mcq'] },
      { id: 'nav-notes', icon: '📓', label: 'Notes Generator', category: 'Pages', action: () => go('/notes-generator'), keywords: ['notes', 'summary', 'revision'] },
      { id: 'nav-flashcards', icon: '🎴', label: 'Flashcards', category: 'Pages', action: () => go('/flashcards'), keywords: ['flash', 'card', 'memory'] },
      { id: 'nav-planner', icon: '🗓️', label: 'Study Planner', category: 'Pages', action: () => go('/study-planner'), keywords: ['plan', 'schedule', 'study'] },
      { id: 'nav-research', icon: '🔬', label: 'Research Assistant', category: 'Pages', action: () => go('/research-assistant'), keywords: ['research', 'paper', 'pdf'] },
      { id: 'nav-assignment', icon: '📋', label: 'Assignment Evaluator', category: 'Pages', action: () => go('/assignment-evaluator'), keywords: ['assignment', 'grade', 'evaluate'] },
      { id: 'nav-recommendations', icon: '🎯', label: 'Recommendations', category: 'Pages', action: () => go('/recommendations'), keywords: ['recommend', 'topics', 'weak'] },
      { id: 'nav-courses', icon: '📚', label: 'My Courses', category: 'Pages', action: () => go('/courses'), keywords: ['course', 'subject', 'enroll'] },
      { id: 'nav-reports', icon: '🖨️', label: 'AI Reports', category: 'Pages', action: () => go('/reports'), keywords: ['report', 'pdf', 'download'] },
    ] : []),
    // Faculty/Admin links
    ...(user?.role === 'faculty' || user?.role === 'admin' ? [
      { id: 'nav-admin', icon: '📈', label: 'Dashboard', category: 'Pages', action: () => go('/admin'), keywords: ['home', 'overview', 'admin'] },
      { id: 'nav-analytics', icon: '📊', label: 'Analytics', category: 'Pages', action: () => go('/analytics'), keywords: ['analytics', 'stats', 'data'] },
      { id: 'nav-documents', icon: '📁', label: 'Upload Documents', category: 'Pages', action: () => go('/documents'), keywords: ['upload', 'pdf', 'document'] },
      { id: 'nav-gradebook', icon: '📒', label: 'Gradebook', category: 'Pages', action: () => go('/gradebook'), keywords: ['grade', 'marks', 'score'] },
      { id: 'nav-faculty-ai', icon: '🧙‍♂️', label: 'Faculty AI Assistant', category: 'Pages', action: () => go('/faculty-ai-assistant'), keywords: ['ai', 'assistant', 'help'] },
      { id: 'nav-quiz-faculty', icon: '⚔️', label: 'Quiz Battle Arena', category: 'Pages', action: () => go('/quiz'), keywords: ['quiz', 'battle', 'live'] },
      { id: 'nav-courses-faculty', icon: '📚', label: 'Manage Courses', category: 'Pages', action: () => go('/courses'), keywords: ['course', 'manage'] },
      { id: 'nav-reports-faculty', icon: '🖨️', label: 'AI Reports', category: 'Pages', action: () => go('/reports'), keywords: ['report', 'pdf'] },
    ] : []),
    // Admin specific links
    ...(user?.role === 'admin' ? [
      { id: 'nav-users', icon: '👥', label: 'User Directory', category: 'Pages', action: () => go('/admin/users'), keywords: ['users', 'students', 'faculty', 'manage'] },
      { id: 'nav-ai-eval', icon: '🧪', label: 'AI Evaluation', category: 'Pages', action: () => go('/ai-evaluation'), keywords: ['evaluation', 'metrics', 'rag', 'accuracy'] },
    ] : []),
    // Shared links
    { id: 'nav-messages', icon: '✉️', label: 'Messages', category: 'Pages', action: () => go('/messages'), keywords: ['messages', 'chat', 'inbox'] },
    { id: 'nav-announcements', icon: '📣', label: 'Announcements', category: 'Pages', action: () => go('/announcements'), keywords: ['announcement', 'notice', 'post'] },
    { id: 'nav-support', icon: '🛠️', label: 'Support Center', category: 'Pages', action: () => go('/support'), keywords: ['support', 'help', 'ticket'] },
    { id: 'nav-meetings', icon: '📅', label: 'Meeting Scheduler', category: 'Pages', action: () => go('/meetings'), keywords: ['meeting', 'appointment', 'schedule'] },
    { id: 'nav-office-hours', icon: '🏫', label: 'Office Hours', category: 'Pages', action: () => go('/office-hours'), keywords: ['office', 'hours', 'slot'] },
    { id: 'nav-calendar', icon: '📆', label: 'Academic Calendar', category: 'Pages', action: () => go('/calendar'), keywords: ['calendar', 'events', 'academic'] },
    { id: 'nav-profile', icon: '👤', label: 'My Profile', category: 'Pages', action: () => go('/profile'), keywords: ['profile', 'account', 'settings'] },
    { id: 'nav-avatar', icon: '🎭', label: 'Avatar Studio', category: 'Pages', action: () => go('/avatar-settings'), keywords: ['avatar', 'studio', 'appearance'] },
    { id: 'nav-feedback', icon: '💬', label: 'Feedback Center', category: 'Pages', action: () => go('/feedback'), keywords: ['feedback', 'rate', 'review'] },
    // Actions
    {
      id: 'action-theme',
      icon: theme === 'dark' ? '☀️' : '🌙',
      label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      description: 'Toggle between dark and light themes',
      category: 'Actions',
      action: () => {
        toggleTheme();
        setIsOpen(false);
        setQuery('');
        toast.success(theme === 'dark' ? '☀️ Light mode enabled' : '🌙 Dark mode enabled');
      },
      keywords: ['theme', 'dark', 'light', 'mode', 'toggle'],
    },
    {
      id: 'action-logout',
      icon: '🚪',
      label: 'Sign Out',
      description: 'Log out of EduMentor AI',
      category: 'Actions',
      action: () => {
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
        setIsOpen(false);
      },
      keywords: ['logout', 'sign out', 'exit'],
    },
  ];

  // Backend search handler with debounce
  const querySearch = useDebounce(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await searchService.search(q);
      const data = res.data.data || {};
      const flat: any[] = Object.values(data).flat();
      setSearchResults(flat);
    } catch (err) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, 250);

  // Trigger search when query changes
  useEffect(() => {
    querySearch(query);
  }, [query, querySearch]);

  // Filter commands locally
  const filteredCommands = query.trim().length === 0
    ? staticCommands
    : staticCommands.filter(cmd => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.category.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.keywords?.some(k => k.includes(q))
        );
      });

  // Map dynamic search results to the same structure
  const mappedSearchResults: Command[] = searchResults.map((item: any) => {
    const label = item.title || item.name || item.topic || 'Untitled';
    const description = [item.type, item.role, item.noteType, item.department, item.courseName]
      .filter(Boolean)
      .join(' · ');
    return {
      id: `search-${item._id}-${item._type}`,
      icon: TYPE_ICONS[item._type] || '📄',
      label,
      description,
      category: 'Search Results',
      action: () => go(item._route),
    };
  });

  // Combined flat list of all displayable items
  const combinedItems = [...filteredCommands, ...mappedSearchResults];

  // Reset selected index when the items change
  useEffect(() => {
    setSelectedIdx(0);
  }, [query, searchResults]);

  // Global keydown listeners for opening/closing and key nav
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Toggle palette on Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
        if (!isOpen) {
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      }
      // Close on Escape
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isOpen, setIsOpen]);

  const handleKeyNav = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, combinedItems.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (combinedItems[selectedIdx]) {
        combinedItems[selectedIdx].action();
      }
    }
  };

  const closePalette = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSearchResults([]);
  }, [setIsOpen]);

  // Group combined items by category for layout
  const groupedItems = combinedItems.reduce<Record<string, Command[]>>((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 flex items-start justify-center pt-24 px-4"
          style={{
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(12px)',
            zIndex: 9999
          }}
          onClick={closePalette}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl"
            style={{
              background: 'var(--bg-modal)',
              border: '1px solid var(--border-medium)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Search Bar Input */}
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {searching ? (
                <div className="w-4 h-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin flex-shrink-0" />
              ) : (
                <span style={{ color: 'var(--text-muted)' }} className="text-base flex-shrink-0">🔍</span>
              )}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyNav}
                placeholder="Search everything, type commands, or choose actions..."
                className="flex-1 bg-transparent text-sm outline-none border-none focus:ring-0 p-0"
                style={{ color: 'var(--text-primary)' }}
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setSearchResults([]); }}
                  style={{ color: 'var(--text-muted)' }}
                  className="text-xs hover:opacity-80 px-1"
                >
                  ✕
                </button>
              )}
              <kbd className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>ESC</kbd>
            </div>

            {/* Results / Navigation List */}
            <div className="max-h-[380px] overflow-y-auto py-2" style={{ scrollbarWidth: 'thin' }}>
              {combinedItems.length === 0 && (
                <div className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  No matches found for "<span style={{ color: 'var(--text-primary)' }}>{query}</span>"
                </div>
              )}

              {Object.entries(groupedItems).map(([category, cmds]) => (
                <div key={category}>
                  <div className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest mt-1 first:mt-0" style={{ color: 'var(--text-muted)' }}>
                    {category}
                  </div>
                  {cmds.map(cmd => {
                    const globalIdx = combinedItems.findIndex(c => c.id === cmd.id);
                    const isSelected = globalIdx === selectedIdx;
                    return (
                      <button
                        key={cmd.id}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelectedIdx(globalIdx)}
                        className="w-full flex items-center gap-3.5 px-4 py-2.5 text-left transition-all"
                        style={{
                          background: isSelected ? 'rgba(79,99,255,0.12)' : 'transparent',
                          borderLeft: isSelected ? '3px solid var(--accent-blue)' : '3px solid transparent',
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

            {/* Bottom Footer Info */}
            <div className="flex items-center gap-4 px-4 py-3 text-[9px]" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>ESC close</span>
              {combinedItems.length > 0 && (
                <span className="ml-auto">{combinedItems.length} match{combinedItems.length !== 1 ? 'es' : ''}</span>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
