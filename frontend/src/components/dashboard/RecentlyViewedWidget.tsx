import React, { useState, useEffect } from 'react';
import { recentlyViewedService, RecentlyViewedItem } from '../../services/recently-viewed.service';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_ICONS: Record<string, string> = {
  course: '📚',
  lecture: '📓',
  chat: '💬',
  note: '📓',
  research: '🔬',
  assignment: '📋',
  quiz: '📝',
  announcement: '📣',
  calendar: '📆',
  faculty: '👤',
  ticket: '🛠️',
};

export const RecentlyViewedWidget: React.FC = () => {
  const [history, setHistory] = useState<RecentlyViewedItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await recentlyViewedService.list({
        search: search || undefined,
      });
      setHistory(data);
    } catch {
      // ignore silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [search]);

  const handleTogglePin = async (id: string) => {
    try {
      const updated = await recentlyViewedService.togglePin(id);
      setHistory(prev =>
        prev
          .map(item => (item._id === id ? updated : item))
          .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime())
      );
      toast.success(updated.isPinned ? '📌 Item pinned to top' : 'Item unpinned');
    } catch {
      toast.error('Failed to pin item.');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await recentlyViewedService.remove(id);
      setHistory(prev => prev.filter(item => item._id !== id));
      toast.success('History entry removed.');
    } catch {
      toast.error('Failed to remove history entry.');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all unpinned recently viewed history?')) return;
    try {
      await recentlyViewedService.clear();
      setHistory(prev => prev.filter(item => item.isPinned));
      toast.success('History cleared (pinned items kept).');
    } catch {
      toast.error('Failed to clear history.');
    }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80 flex items-center gap-1.5">
          <span>🕒</span> Recently Viewed History
        </h3>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search history..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-white/5 border border-white/5 rounded-lg px-2.5 py-1 text-[10px] text-white outline-none w-32 focus:border-white/20 transition-all"
          />
          {history.some(item => !item.isPinned) && (
            <button
              onClick={handleClearAll}
              className="text-[9px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider font-mono bg-red-500/5 px-2 py-1 rounded-md border border-red-500/10"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-6 text-xs text-white/30">Loading history...</div>
      ) : history.length === 0 ? (
        <div className="text-center py-6 text-xs text-white/30 italic">No recently viewed history recorded yet.</div>
      ) : (
        <div className="grid gap-2 max-h-[220px] overflow-y-auto pr-1">
          <AnimatePresence>
            {history.map(item => (
              <div
                key={item._id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base flex-shrink-0">{TYPE_ICONS[item.itemType] || '📄'}</span>
                  <div className="min-w-0">
                    <Link
                      to={item.url}
                      className="font-bold text-white hover:text-indigo-400 hover:underline transition-colors block truncate max-w-[200px]"
                    >
                      {item.title}
                    </Link>
                    <span className="text-[9px] text-white/35 mt-0.5 block">
                      Viewed {new Date(item.viewedAt).toLocaleDateString()} at {new Date(item.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleTogglePin(item._id)}
                    className={`p-1.5 rounded-lg border text-[10px] transition-all ${item.isPinned ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-white/5 border-white/5 text-white/30 hover:text-white/70'}`}
                    title={item.isPinned ? 'Unpin item' : 'Pin item to top'}
                  >
                    📌
                  </button>
                  <button
                    onClick={() => handleRemove(item._id)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-[9px] text-white/35 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
                    title="Remove from history"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
