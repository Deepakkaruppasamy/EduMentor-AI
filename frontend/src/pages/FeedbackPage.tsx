import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/auth.store';
import { feedbackService } from '../services/feedback.service';
import { courseService } from '../services/course.service';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Loader } from '../components/common/Loader';

interface FeedbackItem {
  _id: string;
  studentName: string;
  targetType: 'platform' | 'faculty' | 'course';
  targetFacultyName?: string;
  targetCourseName?: string;
  category: string;
  rating: number;
  title: string;
  message: string;
  isAnonymous: boolean;
  status: 'pending' | 'reviewed' | 'acknowledged';
  adminNote?: string;
  createdAt: string;
}

interface Analytics {
  total: number;
  averageRating: number;
  byRating: { _id: number; count: number }[];
  byCategory: { _id: string; count: number; avgRating: number }[];
  byTargetType: { _id: string; count: number; avgRating: number }[];
  recentTrend: { _id: string; count: number; avgRating: number }[];
}

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
const CATEGORIES = ['Teaching Quality', 'Course Content', 'Platform Experience', 'AI Tutor', 'Support', 'General'];

const StarRating: React.FC<{ value: number; onChange?: (v: number) => void; readonly?: boolean; size?: string }> = ({
  value, onChange, readonly, size = 'text-2xl',
}) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`${size} transition-all ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          style={{ filter: (hover || value) >= star ? 'none' : 'grayscale(1) opacity(0.3)' }}
        >
          ⭐
        </button>
      ))}
      {!readonly && (hover || value) > 0 && (
        <span className="text-xs text-yellow-400 ml-1 font-medium">{STAR_LABELS[hover || value]}</span>
      )}
    </div>
  );
};

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: 'rgba(246,173,85,0.1)', text: '#f6ad55', border: 'rgba(246,173,85,0.3)' },
  reviewed: { bg: 'rgba(79,99,255,0.1)', text: '#7c8fff', border: 'rgba(79,99,255,0.3)' },
  acknowledged: { bg: 'rgba(72,187,120,0.1)', text: '#48bb78', border: 'rgba(72,187,120,0.3)' },
};

// ── Student: Submit Form ──────────────────────────────────────
const StudentSubmitForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [targetType, setTargetType] = useState<'platform' | 'faculty' | 'course'>('platform');
  const [category, setCategory] = useState('General');
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [targetFaculty, setTargetFaculty] = useState('');
  const [faculties, setFaculties] = useState<{ _id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/faculty/list').then(res => {
      setFaculties(res.data.data || []);
    }).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!rating) { toast.error('Please select a rating'); return; }
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!message.trim()) { toast.error('Message is required'); return; }
    if (targetType === 'faculty' && !targetFaculty) { toast.error('Please select a faculty member'); return; }
    setSubmitting(true);
    try {
      await feedbackService.submit({ targetType, targetFaculty: targetFaculty || undefined, category, rating, title, message, isAnonymous });
      toast.success('Feedback submitted successfully! 🎉');
      setRating(0); setTitle(''); setMessage(''); setTargetFaculty(''); setIsAnonymous(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-6 space-y-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Target Type */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">Feedback For</label>
          <div className="grid grid-cols-3 gap-2">
            {(['platform', 'faculty', 'course'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTargetType(t)}
                className="py-2.5 rounded-xl text-xs font-semibold transition-all capitalize"
                style={{
                  background: targetType === t ? 'rgba(79,99,255,0.15)' : 'rgba(255,255,255,0.03)',
                  border: targetType === t ? '1px solid rgba(79,99,255,0.4)' : '1px solid rgba(255,255,255,0.06)',
                  color: targetType === t ? '#7c8fff' : 'rgba(255,255,255,0.5)',
                }}
              >
                {t === 'platform' ? '🖥️ Platform' : t === 'faculty' ? '👨‍🏫 Faculty' : '📚 Course'}
              </button>
            ))}
          </div>
        </div>

        {/* Faculty Selector */}
        {targetType === 'faculty' && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">Select Faculty</label>
            <select value={targetFaculty} onChange={e => setTargetFaculty(e.target.value)} className="input-field text-xs">
              <option value="">-- Choose a faculty member --</option>
              {faculties.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
            </select>
          </div>
        )}

        {/* Category */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="input-field text-xs">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Rating */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">Rating *</label>
          <StarRating value={rating} onChange={setRating} />
        </div>

        {/* Title */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">Title *</label>
          <input
            type="text"
            placeholder="Brief summary of your feedback…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="input-field text-xs"
            maxLength={120}
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">Detailed Feedback *</label>
          <textarea
            placeholder="Share your experience, suggestions, or issues in detail…"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={5}
            className="input-field text-xs resize-none"
          />
        </div>

        {/* Anonymous toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAnonymous(!isAnonymous)}
            className="relative h-5 w-9 rounded-full transition-all flex-shrink-0"
            style={{ background: isAnonymous ? 'rgba(79,99,255,0.6)' : 'rgba(255,255,255,0.1)' }}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all shadow ${isAnonymous ? 'left-4' : 'left-0.5'}`} />
          </button>
          <span className="text-xs text-white/50">Submit anonymously <span className="text-white/25">(your name will be hidden)</span></span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary w-full py-3 text-sm disabled:opacity-40"
        >
          {submitting ? 'Submitting…' : '📤 Submit Feedback'}
        </button>
      </div>
    </div>
  );
};

// ── Feedback Card ─────────────────────────────────────────────
const FeedbackCard: React.FC<{
  fb: FeedbackItem;
  showStudent?: boolean;
  onUpdateStatus?: (id: string, status: string, note: string) => void;
  onDelete?: (id: string) => void;
}> = ({ fb, showStudent, onUpdateStatus, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [editNote, setEditNote] = useState(fb.adminNote || '');
  const [editStatus, setEditStatus] = useState(fb.status);
  const [saving, setSaving] = useState(false);
  const colors = statusColors[fb.status];

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateStatus?.(fb._id, editStatus, editNote);
      toast.success('Feedback updated');
    } catch {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      layout
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <StarRating value={fb.rating} readonly size="text-sm" />
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(79,99,255,0.1)', color: '#7c8fff' }}>
                {fb.category}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize" style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                {fb.status}
              </span>
            </div>
            <h4 className="text-sm font-bold text-white/90 truncate">{fb.title}</h4>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-white/30">
              {showStudent && <span>{fb.isAnonymous ? '🕵️ Anonymous' : `👤 ${fb.studentName}`}</span>}
              <span>•</span>
              <span className="capitalize">{fb.targetType}{fb.targetFacultyName ? ` · ${fb.targetFacultyName}` : ''}</span>
              <span>•</span>
              <span>{format(new Date(fb.createdAt), 'MMM d, yyyy')}</span>
            </div>
          </div>
          <span className="text-white/30 text-sm mt-1">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs text-white/60 leading-relaxed pt-4 whitespace-pre-wrap">{fb.message}</p>

              {fb.adminNote && (
                <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(79,99,255,0.05)', border: '1px solid rgba(79,99,255,0.15)' }}>
                  <span className="text-primary-400 font-bold block mb-1">📝 Admin Note</span>
                  <p className="text-white/60">{fb.adminNote}</p>
                </div>
              )}

              {onUpdateStatus && (
                <div className="space-y-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-white/30 block mb-1 uppercase font-bold">Status</label>
                      <select value={editStatus} onChange={e => setEditStatus(e.target.value as any)} className="input-field text-xs">
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="acknowledged">Acknowledged</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button onClick={handleSave} disabled={saving} className="btn-primary text-xs px-4 py-2 w-full disabled:opacity-40">
                        {saving ? 'Saving…' : '✓ Save'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-white/30 block mb-1 uppercase font-bold">Admin Note</label>
                    <textarea
                      value={editNote}
                      onChange={e => setEditNote(e.target.value)}
                      placeholder="Add internal note or response…"
                      rows={2}
                      className="input-field text-xs resize-none"
                    />
                  </div>
                  <button
                    onClick={() => { if (confirm('Delete this feedback?')) onDelete?.(fb._id); }}
                    className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    🗑️ Delete feedback
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Admin Analytics Panel ─────────────────────────────────────
const AdminAnalytics: React.FC<{ analytics: Analytics }> = ({ analytics }) => {
  const maxRatingCount = Math.max(...(analytics.byRating.map(r => r.count) || [1]));

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Feedback', value: analytics.total, icon: '💬', color: '#7c8fff' },
          { label: 'Avg. Rating', value: `${analytics.averageRating} ⭐`, icon: '⭐', color: '#f6ad55' },
          { label: 'Platform Reviews', value: analytics.byTargetType.find(t => t._id === 'platform')?.count || 0, icon: '🖥️', color: '#48bb78' },
          { label: 'Faculty Reviews', value: analytics.byTargetType.find(t => t._id === 'faculty')?.count || 0, icon: '👨‍🏫', color: '#fc8181' },
        ].map((kpi, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="text-2xl mb-1">{kpi.icon}</div>
            <div className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-[10px] text-white/30 mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Rating Distribution */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h4 className="text-xs font-bold text-white/60 uppercase mb-4">⭐ Rating Distribution</h4>
        <div className="space-y-2.5">
          {[5, 4, 3, 2, 1].map(star => {
            const item = analytics.byRating.find(r => r._id === star);
            const count = item?.count || 0;
            const pct = maxRatingCount > 0 ? (count / maxRatingCount) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="text-xs text-white/40 w-12 text-right">{star} ⭐</span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: (5 - star) * 0.1 }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, #4f63ff, #9f7aea)` }}
                  />
                </div>
                <span className="text-xs text-white/40 w-6">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h4 className="text-xs font-bold text-white/60 uppercase mb-4">📂 By Category</h4>
          <div className="space-y-2">
            {analytics.byCategory.map(c => (
              <div key={c._id} className="flex items-center justify-between text-xs">
                <span className="text-white/60">{c._id}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white/30">{c.count}</span>
                  <span className="text-yellow-400">{c.avgRating.toFixed(1)} ⭐</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h4 className="text-xs font-bold text-white/60 uppercase mb-4">🎯 By Target</h4>
          <div className="space-y-2">
            {analytics.byTargetType.map(t => (
              <div key={t._id} className="flex items-center justify-between text-xs">
                <span className="text-white/60 capitalize">{t._id}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white/30">{t.count}</span>
                  <span className="text-yellow-400">{t.avgRating.toFixed(1)} ⭐</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────
export const FeedbackPage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role;

  const [activeTab, setActiveTab] = useState<'submit' | 'my' | 'received' | 'all' | 'analytics'>('submit');
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Set default tab based on role
  useEffect(() => {
    if (role === 'student') setActiveTab('submit');
    else if (role === 'faculty') setActiveTab('received');
    else if (role === 'admin') setActiveTab('all');
  }, [role]);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      if (activeTab === 'my') {
        const res = await feedbackService.getMy();
        setFeedbackList(res.data.data);
      } else if (activeTab === 'received') {
        const res = await feedbackService.getFacultyReceived();
        setFeedbackList(res.data.data);
      } else if (activeTab === 'all') {
        const params: any = {};
        if (filterStatus) params.status = filterStatus;
        if (filterCategory) params.category = filterCategory;
        const res = await feedbackService.getAll(params);
        setFeedbackList(res.data.data);
      } else if (activeTab === 'analytics') {
        const res = await feedbackService.getAnalytics();
        setAnalytics(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'submit') {
      loadFeedback();
    }
  }, [activeTab, filterStatus, filterCategory]);

  const handleUpdateStatus = async (id: string, status: string, adminNote: string) => {
    await feedbackService.updateStatus(id, { status, adminNote });
    setFeedbackList(prev => prev.map(f => f._id === id ? { ...f, status: status as any, adminNote } : f));
  };

  const handleDelete = async (id: string) => {
    try {
      await feedbackService.delete(id);
      setFeedbackList(prev => prev.filter(f => f._id !== id));
      toast.success('Feedback deleted');
    } catch {
      toast.error('Failed to delete feedback');
    }
  };

  const tabs = [
    ...(role === 'student' ? [{ key: 'submit', label: '✏️ Submit Feedback' }] : []),
    ...(role === 'student' ? [{ key: 'my', label: '📋 My Submissions' }] : []),
    ...(role === 'faculty' ? [{ key: 'received', label: '📥 Received Feedback' }] : []),
    ...(role === 'admin' ? [
      { key: 'all', label: '📋 All Feedback' },
      { key: 'analytics', label: '📊 Analytics' },
    ] : []),
  ] as { key: typeof activeTab; label: string }[];

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center text-xl" style={{ background: 'linear-gradient(135deg, rgba(79,99,255,0.2), rgba(159,122,234,0.2))', border: '1px solid rgba(79,99,255,0.3)' }}>
              💬
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Feedback Center</h1>
              <p className="text-xs text-white/40">
                {role === 'student' && 'Share your experience and help us improve'}
                {role === 'faculty' && 'View feedback from your students'}
                {role === 'admin' && 'Monitor all platform feedback and insights'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: activeTab === tab.key ? 'rgba(79,99,255,0.15)' : 'rgba(255,255,255,0.03)',
                border: activeTab === tab.key ? '1px solid rgba(79,99,255,0.4)' : '1px solid rgba(255,255,255,0.06)',
                color: activeTab === tab.key ? '#7c8fff' : 'rgba(255,255,255,0.45)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Submit Tab (Student) */}
        {activeTab === 'submit' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <StudentSubmitForm onSuccess={() => setActiveTab('my')} />
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(79,99,255,0.05)', border: '1px solid rgba(79,99,255,0.15)' }}>
                <h3 className="text-xs font-bold text-primary-400 uppercase">💡 Tips</h3>
                <ul className="text-xs text-white/50 space-y-2 leading-relaxed">
                  <li>• Be specific and constructive</li>
                  <li>• Rate based on your actual experience</li>
                  <li>• Suggest improvements where possible</li>
                  <li>• Use anonymous mode for sensitive topics</li>
                </ul>
              </div>
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-xs font-bold text-white/40 uppercase mb-3">Categories</h3>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(c => (
                    <span key={c} className="text-[10px] px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Submissions (Student) */}
        {activeTab === 'my' && (
          <div className="space-y-3">
            {loading ? (
              <Loader small message="Loading your feedback..." />
            ) : feedbackList.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-4xl mb-3">📭</div>
                <p className="text-white/30 text-sm">You haven't submitted any feedback yet</p>
                <button onClick={() => setActiveTab('submit')} className="btn-primary text-xs px-4 py-2 mt-4">Submit Feedback</button>
              </div>
            ) : feedbackList.map(fb => (
              <FeedbackCard key={fb._id} fb={fb} />
            ))}
          </div>
        )}

        {/* Received Feedback (Faculty) */}
        {activeTab === 'received' && (
          <div className="space-y-3">
            {loading ? (
              <Loader small message="Loading received feedback..." />
            ) : feedbackList.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-4xl mb-3">📭</div>
                <p className="text-white/30 text-sm">No feedback received yet</p>
              </div>
            ) : (
              <>
                {/* Faculty summary strip */}
                {feedbackList.length > 0 && (() => {
                  const avg = feedbackList.reduce((s, f) => s + f.rating, 0) / feedbackList.length;
                  return (
                    <div className="rounded-2xl p-4 flex items-center gap-6" style={{ background: 'rgba(79,99,255,0.05)', border: '1px solid rgba(79,99,255,0.15)' }}>
                      <div>
                        <p className="text-2xl font-bold text-yellow-400">{avg.toFixed(1)} ⭐</p>
                        <p className="text-[10px] text-white/30">Average Rating</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-primary-400">{feedbackList.length}</p>
                        <p className="text-[10px] text-white/30">Total Reviews</p>
                      </div>
                    </div>
                  );
                })()}
                {feedbackList.map(fb => <FeedbackCard key={fb._id} fb={fb} showStudent />)}
              </>
            )}
          </div>
        )}

        {/* All Feedback (Admin) */}
        {activeTab === 'all' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field text-xs py-2 w-auto">
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="acknowledged">Acknowledged</option>
              </select>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input-field text-xs py-2 w-auto">
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className="text-xs text-white/30 flex items-center">{feedbackList.length} result(s)</span>
            </div>

            {loading ? (
              <Loader small message="Loading all platform feedback..." />
            ) : feedbackList.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-4xl mb-3">📭</div>
                <p className="text-white/30 text-sm">No feedback found</p>
              </div>
            ) : feedbackList.map(fb => (
              <FeedbackCard key={fb._id} fb={fb} showStudent onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} />
            ))}
          </div>
        )}

        {/* Analytics (Admin) */}
        {activeTab === 'analytics' && (
          loading ? (
            <Loader small message="Aggregating feedback analytics..." />
          ) : analytics ? (
            <AdminAnalytics analytics={analytics} />
          ) : null
        )}
      </div>
    </div>
  );
};
