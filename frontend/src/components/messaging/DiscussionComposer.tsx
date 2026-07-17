import React, { useState, useEffect } from 'react';
import { DISCUSSION_CATEGORIES, DiscussionCategory } from '../../types/messaging.types';
import { messagingService } from '../../services/messaging.service';
import toast from 'react-hot-toast';

interface DiscussionComposerProps {
  onCreated: () => void;
  onCancel: () => void;
}

export const DiscussionComposer: React.FC<DiscussionComposerProps> = ({ onCreated, onCancel }) => {
  const [courses, setCourses] = useState<{ _id: string; title: string; code: string }[]>([]);
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<DiscussionCategory>('General Questions');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const { courseService } = await import('../../services/course.service');
      const data = await courseService.getMy();
      setCourses(data || []);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  };

  const handleSubmit = async () => {
    if (!courseId || !title.trim() || !content.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await messagingService.createDiscussion({ courseId, title: title.trim(), content: content.trim(), category });
      toast.success('Discussion created!');
      onCreated();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create discussion');
    } finally {
      setSubmitting(false);
    }
  };

  const categoryColors: Record<string, string> = {
    'General Questions': '#4f5dc8',
    'Assignments': '#c4893a',
    'Exams': '#c0524a',
    'Lab': '#34a87a',
    'Course Materials': '#7c6fc2',
    'Announcements': '#2d9a8a',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white/90">New Discussion</h3>
          <button onClick={onCancel} className="text-xs text-white/30 hover:text-white/60 transition-colors">
            Cancel
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Course */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">Course *</label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="input-field appearance-none"
          >
            <option value="" disabled>Select a course…</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id} className="bg-[#111318]">
                {c.code} — {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">Category</label>
          <div className="flex flex-wrap gap-1.5">
            {DISCUSSION_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  category === cat ? 'text-white border-white/20' : 'text-white/40 border-transparent hover:text-white/60 hover:bg-white/5'
                }`}
                style={category === cat ? { background: `${categoryColors[cat]}20`, borderColor: `${categoryColors[cat]}40` } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's your question?"
            className="input-field"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">Details *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Provide more context for your question or discussion…"
            rows={5}
            className="input-field resize-none"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="px-5 py-4 border-t border-white/5">
        <button
          onClick={handleSubmit}
          disabled={submitting || !courseId || !title.trim() || !content.trim()}
          className="btn-primary w-full disabled:opacity-40"
        >
          {submitting ? 'Creating…' : 'Post Discussion'}
        </button>
      </div>
    </div>
  );
};
