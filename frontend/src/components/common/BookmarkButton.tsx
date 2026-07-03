import React, { useState, useEffect } from 'react';
import { bookmarkService } from '../../services/bookmark.service';
import toast from 'react-hot-toast';

interface BookmarkButtonProps {
  itemType: 'chat' | 'note' | 'research' | 'summary' | 'assignment' | 'quiz' | 'announcement' | 'calendar' | 'meeting' | 'post' | 'thread' | 'ticket';
  itemId: string;
  title: string;
  category?: string;
  className?: string;
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  itemType,
  itemId,
  title,
  category = 'General',
  className = '',
}) => {
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const checkStatus = async () => {
      try {
        const { bookmarks } = await bookmarkService.list({ type: itemType });
        const found = bookmarks.find(b => b.itemId === itemId);
        if (active) {
          setBookmarkId(found ? found._id : null);
        }
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    };
    if (itemId) {
      checkStatus();
    } else {
      setBookmarkId(null);
      setLoading(false);
    }
    return () => {
      active = false;
    };
  }, [itemType, itemId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (loading || !itemId) return;

    try {
      if (bookmarkId) {
        await bookmarkService.remove(bookmarkId);
        setBookmarkId(null);
        toast.success('Bookmark removed.');
      } else {
        const saved = await bookmarkService.create({
          itemType,
          itemId,
          title,
          category,
        });
        setBookmarkId(saved._id);
        toast.success('Bookmark saved.');
      }
    } catch {
      toast.error('Failed to update bookmark.');
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-1.5 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all ${className}`}
      title={bookmarkId ? 'Remove Bookmark' : 'Bookmark this Item'}
    >
      <span className="text-xs leading-none">{bookmarkId ? '🔖' : '🏷️'}</span>
    </button>
  );
};
