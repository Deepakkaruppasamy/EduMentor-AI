import React, { useState, useEffect } from 'react';
import { bookmarkService, Bookmark } from '../../services/bookmark.service';
import { Link } from 'react-router-dom';

const TYPE_ICONS: Record<string, string> = {
  chat: '💬',
  note: '📓',
  research: '🔬',
  summary: '📄',
  assignment: '📋',
  quiz: '📝',
  announcement: '📣',
  calendar: '📆',
  meeting: '🏫',
  post: '🗣️',
  thread: '✉️',
  ticket: '🛠️',
};

export const BookmarksWidget: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = async () => {
    setLoading(true);
    try {
      const data = await bookmarkService.list({
        search: search || undefined,
      });
      setBookmarks(data.bookmarks.slice(0, 4)); // Show top 4 items for widget
      
      const count = await bookmarkService.getCount();
      setTotalCount(count);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, [search]);

  const getNavigationRoute = (type: string, itemId: string) => {
    if (type === 'chat') return `/chat?chatId=${itemId}`;
    if (type === 'quiz') return `/quiz?quizId=${itemId}`;
    if (type === 'course') return `/courses`;
    if (type === 'note') return `/notes-generator`;
    if (type === 'research') return `/research-assistant`;
    if (type === 'announcement') return `/announcements`;
    if (type === 'calendar') return `/calendar`;
    if (type === 'meeting') return `/meetings`;
    if (type === 'ticket') return `/support`;
    return '/dashboard';
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white/80 flex items-center gap-1.5">
            <span>🔖</span> Bookmarks &amp; Favorites
          </h3>
          <span className="text-[10px] text-white/40 font-medium">Total Saved: {totalCount} items</span>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Quick search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-white/5 border border-white/5 rounded-lg px-2.5 py-1 text-[10px] text-white outline-none w-28 focus:border-white/20 transition-all"
          />
          <Link
            to="/bookmarks"
            className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider font-mono bg-indigo-500/5 px-2 py-1 rounded-md border border-indigo-500/10"
          >
            All
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-6 text-xs text-white/30">Loading bookmarks...</div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-6 text-xs text-white/30 italic">No bookmarked items found.</div>
      ) : (
        <div className="space-y-2">
          {bookmarks.map(b => {
            const navRoute = getNavigationRoute(b.itemType, b.itemId);
            return (
              <div
                key={b._id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base flex-shrink-0">{TYPE_ICONS[b.itemType] || '📄'}</span>
                  <div className="min-w-0">
                    <Link
                      to={navRoute}
                      className="font-bold text-white hover:text-indigo-400 hover:underline transition-colors block truncate max-w-[200px]"
                    >
                      {b.title}
                    </Link>
                    <span className="text-[9px] font-medium text-indigo-400/70 mt-0.5 block font-mono">
                      📁 {b.category} {b.isFavorite ? '· ⭐ Fav' : ''}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-white/25 flex-shrink-0">
                  {new Date(b.createdAt).toLocaleDateString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
