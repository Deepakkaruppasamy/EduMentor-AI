import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { calendarService } from '../services/calendar.service';
import { BookmarkButton } from '../components/common/BookmarkButton';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, isSameMonth } from 'date-fns';
import toast from 'react-hot-toast';

const EVENT_TYPE_CONFIG: Record<string, { color: string; icon: string }> = {
  Holiday: { color: '#fc8181', icon: '🏖️' },
  Exam: { color: '#f6ad55', icon: '📝' },
  Assignment: { color: '#4f63ff', icon: '📋' },
  Workshop: { color: '#48bb78', icon: '🔧' },
  Lecture: { color: '#38b2ac', icon: '📖' },
  Event: { color: '#9f7aea', icon: '🎉' },
  Placement: { color: '#ed8936', icon: '💼' },
  Announcement: { color: '#63b3ed', icon: '📢' },
  ClassCancellation: { color: '#fc8181', icon: '🚫' },
  Lab: { color: '#48bb78', icon: '🔬' },
};

const EVENT_TYPES = Object.keys(EVENT_TYPE_CONFIG);

export const AcademicCalendarPage: React.FC = () => {
  const { user } = useAuthStore();
  const canCreate = user?.role === 'admin' || user?.role === 'faculty';

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [filteredType, setFilteredType] = useState('');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Create form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState('Event');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newColor, setNewColor] = useState('#4f63ff');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    loadEvents(start, end);
  }, [currentMonth]);

  const loadEvents = async (start?: string, end?: string) => {
    setLoading(true);
    try {
      const res = await calendarService.getEvents({ start, end, type: filteredType || undefined });
      setEvents(res.data.data || []);
    } catch { toast.error('Failed to load calendar events'); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newStart) { toast.error('Title and start date are required'); return; }
    setSubmitting(true);
    try {
      const res = await calendarService.createEvent({
        title: newTitle.trim(), description: newDesc, type: newType,
        startDate: newStart, endDate: newEnd || newStart, color: EVENT_TYPE_CONFIG[newType]?.color || newColor,
      });
      setEvents(prev => [...prev, res.data.data]);
      setShowCreateModal(false);
      setNewTitle(''); setNewDesc(''); setNewStart(''); setNewEnd('');
      toast.success('Event created!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create event');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await calendarService.deleteEvent(id);
      setEvents(prev => prev.filter(ev => ev._id !== id));
      toast.success('Event deleted');
    } catch { toast.error('Delete failed'); }
  };

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();
  const visibleEvents = filteredType ? events.filter(e => e.type === filteredType) : events;
  const eventsOnDay = (date: Date) => visibleEvents.filter(e => {
    const s = new Date(e.startDate); const en = new Date(e.endDate);
    return date >= new Date(s.toDateString()) && date <= new Date(en.toDateString());
  });

  return (
    <div className="h-full flex flex-col p-6 gap-5 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-white/90">📆 Academic Calendar</h1>
          <p className="text-xs text-white/40 mt-0.5">University events, exams, holidays, and schedules</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canCreate && (
            <button onClick={() => setShowCreateModal(true)} className="btn-primary text-xs px-4 py-2">+ Add Event</button>
          )}
          <select value={filteredType} onChange={e => setFilteredType(e.target.value)} className="input-field text-xs h-9">
            <option value="">All Types</option>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{EVENT_TYPE_CONFIG[t].icon} {t}</option>)}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {EVENT_TYPES.map(t => (
          <button key={t} onClick={() => setFilteredType(filteredType === t ? '' : t)}
            className={`text-[10px] px-2 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${filteredType === t ? 'border' : 'border border-transparent opacity-60 hover:opacity-100'}`}
            style={{ background: `${EVENT_TYPE_CONFIG[t].color}15`, color: EVENT_TYPE_CONFIG[t].color, borderColor: EVENT_TYPE_CONFIG[t].color }}>
            {EVENT_TYPE_CONFIG[t].icon} {t}
          </button>
        ))}
      </div>

      <div className="flex gap-5 flex-1 min-h-0">
        {/* Calendar Grid */}
        <div className="flex-1 min-w-0 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-white/40 hover:text-white text-xl px-2">‹</button>
            <h3 className="text-sm font-bold text-white/80">{format(currentMonth, 'MMMM yyyy')}</h3>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-white/40 hover:text-white text-xl px-2">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center text-[10px] text-white/30 font-bold py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
            {daysInMonth.map(day => {
              const dayEvents = eventsOnDay(day);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              return (
                <button key={day.toISOString()} onClick={() => setSelectedDay(day)}
                  className={`relative min-h-[60px] p-1 rounded-xl flex flex-col items-start transition-all text-left ${isSelected ? '' : 'hover:bg-white/[0.02]'}`}
                  style={{ background: isSelected ? 'rgba(79,99,255,0.15)' : isToday(day) ? 'rgba(79,99,255,0.05)' : 'transparent', border: `1px solid ${isSelected ? 'rgba(79,99,255,0.3)' : 'rgba(255,255,255,0.03)'}` }}>
                  <span className={`text-[10px] font-bold mb-1 ${isToday(day) ? 'text-[#7c8fff]' : 'text-white/50'}`}>{format(day, 'd')}</span>
                  <div className="w-full space-y-0.5">
                    {dayEvents.slice(0, 3).map(ev => (
                      <div key={ev._id} className="text-[8px] font-semibold truncate w-full px-1 rounded"
                        style={{ background: `${ev.color || EVENT_TYPE_CONFIG[ev.type]?.color || '#4f63ff'}20`, color: ev.color || EVENT_TYPE_CONFIG[ev.type]?.color || '#4f63ff' }}>
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && <div className="text-[8px] text-white/30">+{dayEvents.length - 3} more</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Detail Sidebar */}
        <div className="w-72 flex-shrink-0 p-4 rounded-2xl overflow-y-auto" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', scrollbarWidth: 'thin' }}>
          <h4 className="text-xs font-bold text-white/60 mb-3 uppercase">
            {selectedDay ? format(selectedDay, 'EEEE, MMMM d') : 'Select a day'}
          </h4>
          {selectedDay && eventsOnDay(selectedDay).length === 0 && (
            <div className="text-xs text-white/20 text-center py-6">No events on this day</div>
          )}
          {selectedDay && eventsOnDay(selectedDay).map(ev => {
            const tc = EVENT_TYPE_CONFIG[ev.type];
            return (
              <div key={ev._id} className="mb-3 p-3 rounded-xl" style={{ background: `${tc?.color || '#4f63ff'}08`, border: `1px solid ${tc?.color || '#4f63ff'}20` }}>
                <div className="flex justify-between items-start gap-2">
                  <div className="text-[10px] font-bold" style={{ color: tc?.color || '#7c8fff' }}>{tc?.icon} {ev.type}</div>
                  <div className="flex items-center gap-1.5">
                    <BookmarkButton
                      itemType="calendar"
                      itemId={ev._id}
                      title={`Calendar: ${ev.title}`}
                      category="Calendar"
                      className="p-1 border-0 bg-transparent text-white/40 hover:text-white"
                    />
                    {canCreate && (
                      <button onClick={e => handleDelete(ev._id, e)} className="text-[10px] text-[#fc8181] opacity-60 hover:opacity-100">✕</button>
                    )}
                  </div>
                </div>
                <div className="text-xs font-semibold text-white/80 mt-1">{ev.title}</div>
                {ev.description && <div className="text-[10px] text-white/50 mt-0.5">{ev.description}</div>}
                <div className="text-[9px] text-white/30 mt-1">{format(new Date(ev.startDate), 'MMM d')} – {format(new Date(ev.endDate), 'MMM d, yyyy')}</div>
                <div className="text-[9px] text-white/25 mt-0.5">By: {ev.createdBy?.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="w-[480px] p-6 rounded-2xl space-y-4" style={{ background: '#111318', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            <h4 className="text-sm font-bold text-white/90">Add Calendar Event</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block text-white/40 mb-1">Title *</label>
                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Event title…" className="input-field text-xs" />
              </div>
              <div>
                <label className="block text-white/40 mb-1">Type</label>
                <select value={newType} onChange={e => setNewType(e.target.value)} className="input-field text-xs">
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{EVENT_TYPE_CONFIG[t].icon} {t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-white/40 mb-1">Target Roles</label>
                <select className="input-field text-xs" disabled><option>All Users</option></select>
              </div>
              <div>
                <label className="block text-white/40 mb-1">Start Date *</label>
                <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)} className="input-field text-xs" />
              </div>
              <div>
                <label className="block text-white/40 mb-1">End Date</label>
                <input type="date" value={newEnd} min={newStart} onChange={e => setNewEnd(e.target.value)} className="input-field text-xs" />
              </div>
              <div className="col-span-2">
                <label className="block text-white/40 mb-1">Description</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} className="input-field text-xs resize-none" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2 rounded-xl text-xs text-white/40 border border-white/10">Cancel</button>
              <button onClick={handleCreate} disabled={submitting} className="flex-1 btn-primary py-2 disabled:opacity-40">
                {submitting ? 'Creating…' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
