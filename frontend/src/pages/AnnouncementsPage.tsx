import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { announcementService } from '../services/announcement.service';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Loader } from '../components/common/Loader';
import { recentlyViewedService } from '../services/recently-viewed.service';

const TYPE_CONFIG: Record<string, { color: string; icon: string; bg: string }> = {
  General: { color: '#7c8fff', bg: 'rgba(79,99,255,0.1)', icon: '📢' },
  Academic: { color: '#48bb78', bg: 'rgba(72,187,120,0.1)', icon: '🎓' },
  Placement: { color: '#f6ad55', bg: 'rgba(246,173,85,0.1)', icon: '💼' },
  Event: { color: '#9f7aea', bg: 'rgba(159,122,234,0.1)', icon: '🎉' },
  Emergency: { color: '#fc8181', bg: 'rgba(252,129,129,0.1)', icon: '🚨' },
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  Low: { color: 'rgba(255,255,255,0.3)', label: 'Low' },
  Medium: { color: '#7c8fff', label: 'Medium' },
  High: { color: '#f6ad55', label: 'High' },
  Urgent: { color: '#fc8181', label: 'URGENT' },
};

export const AnnouncementsPage: React.FC = () => {
  const { user } = useAuthStore();
  const canCreate = user?.role === 'admin' || user?.role === 'faculty';

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [showBookmarked, setShowBookmarked] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create form
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('General');
  const [newPriority, setNewPriority] = useState('Medium');
  const [newTargetRoles, setNewTargetRoles] = useState<string[]>(['student', 'faculty', 'admin']);
  const [newScheduled, setNewScheduled] = useState('');
  const [newExpires, setNewExpires] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadAnnouncements(); }, [typeFilter, priorityFilter]);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await announcementService.getAnnouncements({
        type: typeFilter || undefined,
        priority: priorityFilter || undefined,
        search: searchFilter || undefined,
      });
      setAnnouncements(res.data.data || []);
    } catch { toast.error('Failed to load announcements'); }
    finally { setLoading(false); }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await announcementService.markRead(id);
      setAnnouncements(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a));
    } catch {}
  };

  const handleToggleBookmark = async (id: string) => {
    try {
      const res = await announcementService.toggleBookmark(id);
      setAnnouncements(prev => prev.map(a => a._id === id ? { ...a, isBookmarked: res.data.isBookmarked } : a));
      toast.success(res.data.isBookmarked ? 'Bookmarked!' : 'Bookmark removed');
    } catch { toast.error('Action failed'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await announcementService.delete(id);
      setAnnouncements(prev => prev.filter(a => a._id !== id));
      toast.success('Announcement deleted');
    } catch { toast.error('Delete failed'); }
  };

  const handleCreateAnnouncement = async () => {
    if (!newTitle.trim() || !newContent.trim()) { toast.error('Title and content are required'); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', newTitle.trim());
      formData.append('content', newContent.trim());
      formData.append('type', newType);
      formData.append('priority', newPriority);
      formData.append('targetRoles', JSON.stringify(newTargetRoles));
      if (newScheduled) formData.append('scheduledAt', newScheduled);
      if (newExpires) formData.append('expiresAt', newExpires);
      attachments.forEach(f => formData.append('attachments', f));

      const res = await announcementService.create(formData);
      setAnnouncements(prev => [{ ...res.data.data, isRead: false, isBookmarked: false }, ...prev]);
      setShowCreateModal(false);
      setNewTitle(''); setNewContent(''); setAttachments([]);
      toast.success('Announcement published!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Publish failed');
    } finally { setSubmitting(false); }
  };

  const handleMarkAllRead = async () => {
    const unread = announcements.filter(a => !a.isRead);
    await Promise.all(unread.map(a => announcementService.markRead(a._id)));
    setAnnouncements(prev => prev.map(a => ({ ...a, isRead: true })));
    toast.success('All marked as read');
  };

  const filtered = announcements.filter(a => {
    if (showBookmarked && !a.isBookmarked) return false;
    if (searchFilter && !a.title.toLowerCase().includes(searchFilter.toLowerCase()) && !a.content.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    return true;
  });
  const unreadCount = announcements.filter(a => !a.isRead).length;

  return (
    <div className="h-full flex flex-col p-6 gap-5 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-white/90">📣 Announcements</h1>
          <p className="text-xs text-white/40 mt-0.5">
            {unreadCount > 0 ? <><span className="text-[#f6ad55] font-semibold">{unreadCount} unread</span> announcements</> : 'All caught up!'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {unreadCount > 0 && <button onClick={handleMarkAllRead} className="px-3 py-2 rounded-xl text-xs font-semibold text-white/50 border border-white/10 hover:text-white">✓ Mark All Read</button>}
          <button onClick={() => setShowBookmarked(!showBookmarked)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${showBookmarked ? 'text-[#f6ad55] border-[#f6ad55]/30 bg-[#f6ad55]/10' : 'text-white/40 border-white/10'}`}>
            🔖 Bookmarked
          </button>
          {canCreate && <button onClick={() => setShowCreateModal(true)} className="btn-primary text-xs px-4 py-2">+ Publish</button>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input type="text" value={searchFilter} onChange={e => setSearchFilter(e.target.value)}
          placeholder="Search announcements…" className="input-field text-xs flex-1 min-w-[200px]" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-field text-xs h-9">
          <option value="">All Types</option>
          {Object.keys(TYPE_CONFIG).map(t => <option key={t} value={t}>{TYPE_CONFIG[t].icon} {t}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="input-field text-xs h-9">
          <option value="">All Priorities</option>
          {Object.keys(PRIORITY_CONFIG).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Announcement Cards */}
      {loading && <Loader small message="Retrieving announcements..." />}
      <div className="space-y-3">
        {filtered.length === 0 && !loading && <div className="text-center py-12 text-white/20 text-xs">No announcements found</div>}
        {filtered.map(ann => {
          const tc = TYPE_CONFIG[ann.type] || TYPE_CONFIG.General;
          const pc = PRIORITY_CONFIG[ann.priority] || PRIORITY_CONFIG.Medium;
          const isExpanded = expandedId === ann._id;
          return (
            <div key={ann._id}
              className={`rounded-2xl overflow-hidden transition-all ${!ann.isRead ? 'ring-1 ring-inset ring-white/10' : ''}`}
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              {/* Priority band */}
              <div className="h-0.5" style={{ background: pc.color }} />
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ background: tc.bg }}>
                    {tc.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`text-sm font-bold truncate ${!ann.isRead ? 'text-white/90' : 'text-white/65'}`}>{ann.title}</h3>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${pc.color}20`, color: pc.color }}>{pc.label}</span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.color }}>{ann.type}</span>
                      {!ann.isRead && <span className="w-2 h-2 rounded-full bg-[#4f63ff] animate-pulse flex-shrink-0" />}
                    </div>
                    <div className="text-[10px] text-white/30 mt-0.5">By {ann.createdBy?.name} · {format(new Date(ann.createdAt), 'MMM d, yyyy')}</div>
                    <div className={`mt-2 text-xs text-white/65 leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>{ann.content}</div>
                    {ann.content.length > 200 && (
                      <button onClick={() => {
                        const nextVal = isExpanded ? null : ann._id;
                        setExpandedId(nextVal);
                        if (!ann.isRead) handleMarkRead(ann._id);
                        if (nextVal) {
                          recentlyViewedService.record({
                            itemType: 'announcement',
                            itemId: ann._id,
                            title: `Announcement: ${ann.title}`,
                            url: `/announcements`
                          }).catch(() => {});
                        }
                      }}
                        className="text-[10px] text-[#7c8fff] mt-1 hover:underline">
                        {isExpanded ? 'Show less' : 'Read more'}
                      </button>
                    )}

                    {/* Attachments */}
                    {ann.attachments?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ann.attachments.map((att: any, i: number) => (
                          <a key={i} href={`/uploads/announcements/${att.filename}`} target="_blank" rel="noopener noreferrer"
                            className="text-[9px] px-2 py-1 rounded-lg font-semibold text-[#7c8fff] flex items-center gap-1" style={{ background: 'rgba(79,99,255,0.1)' }}>
                            📎 {att.originalName}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => handleToggleBookmark(ann._id)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all ${ann.isBookmarked ? 'text-[#f6ad55]' : 'text-white/30 hover:text-white/60'}`}
                      style={{ background: ann.isBookmarked ? 'rgba(246,173,85,0.1)' : 'rgba(255,255,255,0.03)' }}>
                      🔖
                    </button>
                    {!ann.isRead && (
                      <button onClick={() => handleMarkRead(ann._id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] text-white/30 hover:text-white/60" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        ✓
                      </button>
                    )}
                    {canCreate && ann.createdBy?._id === user?.id && (
                      <button onClick={() => handleDelete(ann._id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] text-[#fc8181] opacity-60 hover:opacity-100" style={{ background: 'rgba(252,129,129,0.05)' }}>
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Announcement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="w-[560px] max-h-[90vh] overflow-y-auto p-6 rounded-2xl space-y-4" style={{ background: '#111318', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            <h4 className="text-sm font-bold text-white/90">Publish Announcement</h4>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-white/40 mb-1">Title *</label>
                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="input-field text-xs" placeholder="Announcement title…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/40 mb-1">Type</label>
                  <select value={newType} onChange={e => setNewType(e.target.value)} className="input-field text-xs">
                    {Object.keys(TYPE_CONFIG).map(t => <option key={t} value={t}>{TYPE_CONFIG[t].icon} {t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-white/40 mb-1">Priority</label>
                  <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="input-field text-xs">
                    {Object.keys(PRIORITY_CONFIG).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-white/40 mb-1">Target Audience</label>
                <div className="flex gap-2">
                  {['student', 'faculty', 'admin'].map(role => (
                    <button key={role} onClick={() => setNewTargetRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all capitalize ${newTargetRoles.includes(role) ? 'text-[#7c8fff] border-[#4f63ff]/30 bg-[#4f63ff]/10' : 'text-white/40 border-white/10'}`}>
                      {role}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-white/40 mb-1">Content *</label>
                <textarea value={newContent} onChange={e => setNewContent(e.target.value)} rows={5} className="input-field text-xs resize-none" placeholder="Announcement body text…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/40 mb-1">Schedule (optional)</label>
                  <input type="datetime-local" value={newScheduled} onChange={e => setNewScheduled(e.target.value)} className="input-field text-xs" />
                </div>
                <div>
                  <label className="block text-white/40 mb-1">Expires (optional)</label>
                  <input type="datetime-local" value={newExpires} onChange={e => setNewExpires(e.target.value)} className="input-field text-xs" />
                </div>
              </div>
              <div>
                <label className="block text-white/40 mb-1">Attachments (PDF, DOCX, PPT, Images)</label>
                <input type="file" multiple accept=".pdf,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                  onChange={e => e.target.files && setAttachments(Array.from(e.target.files))}
                  className="input-field text-xs" />
                {attachments.length > 0 && <div className="text-[10px] text-white/30 mt-1">{attachments.length} file(s) selected</div>}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2 rounded-xl text-xs text-white/40 border border-white/10">Cancel</button>
              <button onClick={handleCreateAnnouncement} disabled={submitting} className="flex-1 btn-primary py-2 disabled:opacity-40">
                {submitting ? 'Publishing…' : 'Publish Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
