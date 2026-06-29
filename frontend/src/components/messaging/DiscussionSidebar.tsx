import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { useMessagingStore } from '../../store/messaging.store';
import { messagingService } from '../../services/messaging.service';
import { MsgDiscussion, DISCUSSION_CATEGORIES, DiscussionCategory } from '../../types/messaging.types';
import { format } from 'date-fns';
import { Loader } from '../common/Loader';

interface DiscussionSidebarProps {
  onSelectDiscussion: (disc: MsgDiscussion) => void;
  onCreateNew: () => void;
}

export const DiscussionSidebar: React.FC<DiscussionSidebarProps> = ({ onSelectDiscussion, onCreateNew }) => {
  const { user } = useAuthStore();
  const { discussions, activeDiscussion, setDiscussions } = useMessagingStore();
  const [courses, setCourses] = useState<{ _id: string; title: string; code: string }[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Load user's courses
  useEffect(() => {
    loadCourses();
  }, []);

  // Load discussions when course changes
  useEffect(() => {
    if (selectedCourse) loadDiscussions();
  }, [selectedCourse, selectedCategory]);

  const loadCourses = async () => {
    try {
      const { courseService } = await import('../../services/course.service');
      const data = await courseService.getMy();
      setCourses(data || []);
      if (data && data.length > 0) setSelectedCourse(data[0]._id);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  };

  const loadDiscussions = async () => {
    if (!selectedCourse) return;
    setLoading(true);
    try {
      const res = await messagingService.getCourseDiscussions(selectedCourse, selectedCategory || undefined);
      setDiscussions(res.data.data || []);
    } catch (err) {
      console.error('Failed to load discussions:', err);
    } finally {
      setLoading(false);
    }
  };

  const categoryColors: Record<string, string> = {
    'General Questions': '#4f63ff',
    'Assignments': '#f6ad55',
    'Exams': '#fc8181',
    'Lab': '#48bb78',
    'Course Materials': '#9f7aea',
    'Announcements': '#38b2ac',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white/90">Discussions</h3>
          <button
            onClick={onCreateNew}
            className="h-7 px-2.5 rounded-lg text-[10px] font-semibold flex items-center gap-1"
            style={{ background: 'linear-gradient(135deg, #4f63ff, #7c3aed)', color: 'white' }}
          >
            + New
          </button>
        </div>

        {/* Course selector */}
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/[0.08] text-white/80 outline-none focus:border-[#4f63ff]/40 mb-2 appearance-none"
          style={{ backgroundImage: 'none' }}
        >
          <option value="" disabled>Select course…</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id} className="bg-[#111318]">
              {c.code} — {c.title}
            </option>
          ))}
        </select>

        {/* Category filter */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-2 py-1 rounded-md text-[10px] transition-colors ${
              !selectedCategory ? 'bg-[#4f63ff]/20 text-[#7c8fff]' : 'text-white/30 hover:text-white/50 hover:bg-white/5'
            }`}
          >
            All
          </button>
          {DISCUSSION_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
              className={`px-2 py-1 rounded-md text-[10px] transition-colors ${
                selectedCategory === cat ? 'text-white' : 'text-white/30 hover:text-white/50 hover:bg-white/5'
              }`}
              style={selectedCategory === cat ? { background: `${categoryColors[cat]}30` } : {}}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Discussion list */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        {loading ? (
          <div className="p-6"><Loader small message="Retrieving discussions..." /></div>
        ) : discussions.length === 0 ? (
          <div className="p-6 text-center text-xs">
            <div className="text-2xl mb-2">💭</div>
            <div className="text-white/25">No discussions yet</div>
            {selectedCourse && (
              <button onClick={onCreateNew} className="mt-2 text-[#7c8fff] hover:underline text-[10px]">
                Start a discussion →
              </button>
            )}
          </div>
        ) : (
          discussions.map((disc) => {
            const isActive = activeDiscussion?._id === disc._id;
            return (
              <button
                key={disc._id}
                onClick={() => onSelectDiscussion(disc)}
                className={`w-full px-4 py-3 text-left transition-all border-l-2 ${
                  isActive
                    ? 'bg-[#4f63ff]/10 border-l-[#4f63ff]'
                    : 'border-l-transparent hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: categoryColors[disc.category] || '#4f63ff' }}
                  />
                  <span className="text-[10px] text-white/30 truncate">{disc.category}</span>
                  {disc.isResolved && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-medium ml-auto flex-shrink-0">
                      ✓ Resolved
                    </span>
                  )}
                </div>
                <div className="text-xs font-medium text-white/80 truncate">{disc.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-white/30">{disc.author?.name}</span>
                  <span className="text-[10px] text-white/20">•</span>
                  <span className="text-[10px] text-white/25">{disc.replyCount} replies</span>
                  <span className="text-[10px] text-white/20 ml-auto">
                    {format(new Date(disc.createdAt), 'MMM d')}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
