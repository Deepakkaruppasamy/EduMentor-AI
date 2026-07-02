import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { bookmarkService, Bookmark } from '../services/bookmark.service';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const ITEM_TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  chat: { icon: '💬', label: 'AI Chat Session' },
  note: { icon: '📓', label: 'AI Study Note' },
  research: { icon: '🔬', label: 'Research Paper' },
  summary: { icon: '📄', label: 'Document Summary' },
  assignment: { icon: '📋', label: 'Assignment Evaluation' },
  quiz: { icon: '📝', label: 'Practice Quiz' },
  announcement: { icon: '📣', label: 'Announcement' },
  calendar: { icon: '📆', label: 'Calendar Event' },
  meeting: { icon: '🏫', label: 'Meeting Details' },
  post: { icon: '🗣️', label: 'Faculty Post' },
  thread: { icon: '✉️', label: 'Discussion Thread' },
  ticket: { icon: '🛠️', label: 'Support Ticket' },
};

export const BookmarksPage: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sort, setSort] = useState('newest');

  // Modal / Input state for editing category
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  const fetchBookmarks = async () => {
    setLoading(true);
    try {
      const data = await bookmarkService.list({
        type: selectedType || undefined,
        category: selectedCategory || undefined,
        search: search || undefined,
        sort,
        favorite: onlyFavorites || undefined,
      });
      setBookmarks(data.bookmarks);
      setCategories(data.categories);
    } catch {
      toast.error('Failed to load bookmarks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, [selectedType, selectedCategory, onlyFavorites, sort]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBookmarks();
  };

  const handleToggleFavorite = async (b: Bookmark) => {
    try {
      const nextFav = !b.isFavorite;
      await bookmarkService.update(b._id, { isFavorite: nextFav });
      setBookmarks(prev =>
        prev.map(item => (item._id === b._id ? { ...item, isFavorite: nextFav } : item))
      );
      toast.success(nextFav ? '⭐ Added to Favorites!' : 'Removed from Favorites.');
    } catch {
      toast.error('Failed to update favorite status.');
    }
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm('Delete this bookmark?')) return;
    try {
      await bookmarkService.remove(id);
      setBookmarks(prev => prev.filter(item => item._id !== id));
      toast.success('Bookmark removed.');
    } catch {
      toast.error('Failed to remove bookmark.');
    }
  };

  const handleSaveCategory = async (id: string) => {
    try {
      await bookmarkService.update(id, { category: editCategoryName.trim() || 'General' });
      setBookmarks(prev =>
        prev.map(item => (item._id === id ? { ...item, category: editCategoryName.trim() || 'General' } : item))
      );
      setEditingBookmarkId(null);
      toast.success('Category updated.');
      // Refresh list to grab clean updated categories list
      const data = await bookmarkService.list();
      setCategories(data.categories);
    } catch {
      toast.error('Failed to update category.');
    }
  };

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
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-white animate-fadeIn">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="text-3xl">🔖</div>
        <div>
          <h1 className="text-2xl font-bold">Bookmarks &amp; Favorites</h1>
          <p className="text-xs text-white/40 mt-0.5">Quickly access and organize your bookmarked lectures, AI chats, quizzes, and files</p>
        </div>
      </div>

      {/* Filter panel */}
      <form onSubmit={handleSearchSubmit} className="glass-card p-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Keyword Search */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] uppercase tracking-wider font-bold text-white/40">Search Keywords</span>
            <input
              type="text"
              placeholder="Filter by title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field text-xs py-2"
            />
          </div>

          {/* Type Filter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] uppercase tracking-wider font-bold text-white/40">Resource Type</span>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="input-field text-xs cursor-pointer py-2"
            >
              <option value="" className="bg-[#1a1d27]">All Types</option>
              {Object.entries(ITEM_TYPE_LABELS).map(([key, value]) => (
                <option key={key} value={key} className="bg-[#1a1d27]">
                  {value.icon} {value.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] uppercase tracking-wider font-bold text-white/40">Category Folder</span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="input-field text-xs cursor-pointer py-2"
            >
              <option value="" className="bg-[#1a1d27]">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c} className="bg-[#1a1d27]">{c}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] uppercase tracking-wider font-bold text-white/40">Sorting</span>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="input-field text-xs cursor-pointer py-2"
            >
              <option value="newest" className="bg-[#1a1d27]">Newest Bookmarked</option>
              <option value="oldest" className="bg-[#1a1d27]">Oldest Bookmarked</option>
              <option value="title" className="bg-[#1a1d27]">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/5 pt-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
            <input
              type="checkbox"
              checked={onlyFavorites}
              onChange={e => setOnlyFavorites(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="font-semibold text-white/80">⭐ Show Only Favorites</span>
          </label>
          
          <button
            type="submit"
            className="btn-primary py-1.5 px-6 text-xs font-bold"
          >
            Apply Filters
          </button>
        </div>
      </form>

      {/* Bookmarks List */}
      {loading ? (
        <div className="text-center py-16 text-white/40 text-sm">Loading bookmarked items...</div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-16 bg-white/[0.01] border border-white/5 rounded-2xl text-white/40">
          <div className="text-3xl mb-3">🔍</div>
          <div className="font-semibold text-sm">No bookmarks found</div>
          <p className="text-[10px] text-white/20 mt-1">Try resetting filters or bookmarking active summaries, chats, and assignments</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence>
            {bookmarks.map((b, idx) => {
              const labelInfo = ITEM_TYPE_LABELS[b.itemType] || { icon: '📄', label: b.itemType };
              const navRoute = getNavigationRoute(b.itemType, b.itemId);

              return (
                <motion.div
                  key={b._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.03 }}
                  className="glass-card p-4 flex flex-col justify-between space-y-3 relative group"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      {/* Type Badge */}
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full mb-2">
                        <span>{labelInfo.icon}</span>
                        <span>{labelInfo.label}</span>
                      </span>

                      {/* Title */}
                      <Link to={navRoute} className="block text-xs font-bold text-white hover:text-indigo-400 transition-colors line-clamp-2 leading-relaxed">
                        {b.title}
                      </Link>
                    </div>

                    {/* Star & Close Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleToggleFavorite(b)}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs transition-all"
                        title={b.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
                      >
                        {b.isFavorite ? '⭐' : '☆'}
                      </button>
                      <button
                        onClick={() => handleRemove(b._id)}
                        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-[10px] text-red-400 hover:bg-red-500/20 transition-all"
                        title="Remove bookmark"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Footer (Category + Date) */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[10px] text-white/40">
                    {/* Editable category */}
                    {editingBookmarkId === b._id ? (
                      <div className="flex items-center gap-1 flex-1 max-w-[200px]">
                        <input
                          type="text"
                          value={editCategoryName}
                          onChange={e => setEditCategoryName(e.target.value)}
                          className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-white outline-none w-full"
                          autoFocus
                          placeholder="Category name"
                        />
                        <button
                          onClick={() => handleSaveCategory(b._id)}
                          className="bg-emerald-500 text-white rounded px-1.5 py-0.5 text-[8px] font-bold"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => setEditingBookmarkId(null)}
                          className="bg-white/5 text-white rounded px-1.5 py-0.5 text-[8px]"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => {
                          setEditingBookmarkId(b._id);
                          setEditCategoryName(b.category);
                        }}
                        className="cursor-pointer hover:text-indigo-300 font-bold font-mono tracking-wide bg-white/5 px-2 py-0.5 rounded text-[9px] select-none border border-white/5"
                        title="Click to edit category folder"
                      >
                        📁 {b.category}
                      </span>
                    )}

                    <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
