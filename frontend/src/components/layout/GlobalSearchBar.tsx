import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchService } from '../../services/search.service';
import { useAuthStore } from '../../store/auth.store';

interface SearchResult {
  _id: string;
  _type: string;
  _route: string;
  title?: string;
  name?: string;
  topic?: string;
  courseName?: string;
  noteType?: string;
  type?: string;
  priority?: string;
  role?: string;
  department?: string;
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

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

export const GlobalSearchBar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Record<string, SearchResult[]>>({});
  const [searching, setSearching] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  // Flatten results for keyboard nav
  const flatResults: SearchResult[] = Object.values(results).flat();

  const doSearch = useCallback(
    debounce(async (q: string) => {
      if (q.trim().length < 2) { setResults({}); return; }
      setSearching(true);
      try {
        const res = await searchService.search(q);
        setResults(res.data.data || {});
        setSelectedIdx(0);
      } catch {
        setResults({});
      } finally {
        setSearching(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    doSearch(query);
  }, [query]);

  // Ctrl+K shortcut
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  const handleSelect = (item: SearchResult) => {
    setOpen(false);
    setQuery('');
    setResults({});
    navigate(item._route);
  };

  const handleKeyNav = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { setSelectedIdx(prev => Math.min(prev + 1, flatResults.length - 1)); e.preventDefault(); }
    if (e.key === 'ArrowUp') { setSelectedIdx(prev => Math.max(prev - 1, 0)); e.preventDefault(); }
    if (e.key === 'Enter' && flatResults[selectedIdx]) handleSelect(flatResults[selectedIdx]);
  };

  if (!isAuthenticated) return null;

  const totalResults = flatResults.length;

  return (
    <>
      {/* Search trigger button (visible in desktop sidebar header area) */}
      <button
        id="global-search-btn"
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-all px-2 py-1.5 rounded-lg border border-white/5 hover:border-white/10 w-full"
        style={{ background: 'rgba(255,255,255,0.02)' }}>
        <span>🔍</span>
        <span>Search everything…</span>
        <kbd className="ml-auto text-[9px] px-1 py-0.5 rounded bg-white/5 text-white/20">⌘K</kbd>
      </button>

      {/* Full-screen Modal Overlay */}
      {open && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24 bg-black/70 backdrop-blur-md"
          onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-xl mx-4 rounded-2xl overflow-hidden"
            style={{ background: '#13151d', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>

            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
              {searching ? (
                <div className="w-4 h-4 rounded-full border-2 border-[#4f63ff] border-t-transparent animate-spin flex-shrink-0" />
              ) : (
                <span className="text-white/30 text-base flex-shrink-0">🔍</span>
              )}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyNav}
                placeholder="Search courses, users, notes, events, announcements…"
                className="flex-1 bg-transparent text-sm text-white/90 placeholder-white/20 outline-none"
                autoComplete="off"
              />
              {query && (
                <button onClick={() => { setQuery(''); setResults({}); inputRef.current?.focus(); }} className="text-white/30 hover:text-white/60 text-xs">✕</button>
              )}
              <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/20 flex-shrink-0">ESC</kbd>
            </div>

            {/* Results */}
            {query.length >= 2 && (
              <div className="max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {totalResults === 0 && !searching && (
                  <div className="text-center py-8 text-xs text-white/25">No results found for "{query}"</div>
                )}

                {Object.entries(results).map(([category, items]) => {
                  if (!items.length) return null;
                  const catLabel = category.charAt(0).toUpperCase() + category.slice(1) + 's';
                  return (
                    <div key={category}>
                      <div className="px-4 py-2 text-[9px] font-bold text-white/25 uppercase tracking-wider">
                        {TYPE_ICONS[items[0]?._type] || '📄'} {catLabel}
                      </div>
                      {items.map((item, itemIdx) => {
                        const globalIdx = flatResults.findIndex(r => r._id === item._id && r._type === item._type);
                        const isSelected = globalIdx === selectedIdx;
                        const label = item.title || item.name || item.topic || 'Untitled';
                        const sub = item.type || item.role || item.noteType || item.department || '';
                        const sub2 = item.courseName || '';
                        return (
                          <button
                            key={item._id + item._type}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIdx(globalIdx)}
                            className="w-full text-left flex items-center gap-3 px-4 py-2.5 transition-all"
                            style={{ background: isSelected ? 'rgba(79,99,255,0.12)' : 'transparent', borderLeft: isSelected ? '2px solid #4f63ff' : '2px solid transparent' }}>
                            <span className="text-base flex-shrink-0">{TYPE_ICONS[item._type] || '📄'}</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-white/85 truncate">{label}</div>
                              <div className="text-[10px] text-white/35 truncate">{[sub, sub2].filter(Boolean).join(' · ')}</div>
                            </div>
                            <span className="text-[9px] text-white/20 flex-shrink-0">{item._type}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div className="px-4 py-2 border-t border-white/5 flex items-center gap-3 text-[9px] text-white/20">
              <span>↑↓ navigate</span>
              <span>↵ open</span>
              <span>ESC close</span>
              {totalResults > 0 && <span className="ml-auto">{totalResults} result{totalResults !== 1 ? 's' : ''}</span>}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
