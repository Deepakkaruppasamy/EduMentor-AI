import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { appointmentService } from '../services/appointment.service';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_COLOR: Record<string, string> = {
  Pending: '#f6ad55',
  Approved: '#48bb78',
  Rejected: '#fc8181',
  Rescheduled: '#9f7aea',
  Completed: '#4f63ff',
  Cancelled: 'rgba(255,255,255,0.2)',
};

const MODE_ICONS: Record<string, string> = { Online: '💻', Offline: '🏛️' };

export const MeetingSchedulerPage: React.FC = () => {
  const { user } = useAuthStore();
  const isStudent = user?.role === 'student';
  const isFaculty = user?.role === 'faculty';
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'calendar' | 'request' | 'appointments'>('calendar');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [mode, setMode] = useState<'Online' | 'Offline'>('Online');
  const [purpose, setPurpose] = useState('');
  const [timeSlot, setTimeSlot] = useState('09:00 - 09:30');
  const [submitting, setSubmitting] = useState(false);

  // Faculty action state
  const [actionTarget, setActionTarget] = useState<any | null>(null);
  const [facultyNotes, setFacultyNotes] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('');

  useEffect(() => {
    loadAppointments();
    if (isStudent) loadFaculty();
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const res = await appointmentService.getMy();
      setAppointments(res.data.data || []);
    } catch { toast.error('Failed to load appointments'); }
    finally { setLoading(false); }
  };

  const loadFaculty = async () => {
    try {
      const res = await appointmentService.getFacultyList();
      setFacultyList(res.data.data || []);
    } catch {}
  };

  const handleRequest = async () => {
    if (!selectedFaculty || !selectedDate || !timeSlot || !purpose.trim()) {
      toast.error('Please fill all fields');
      return;
    }
    setSubmitting(true);
    try {
      const res = await appointmentService.request({
        facultyId: selectedFaculty,
        mode,
        date: format(selectedDate, 'yyyy-MM-dd'),
        timeSlot,
        purpose: purpose.trim(),
      });
      setAppointments(prev => [res.data.data, ...prev]);
      toast.success('Appointment request sent!');
      setActiveTab('appointments');
      setPurpose('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Request failed');
    } finally { setSubmitting(false); }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await appointmentService.updateStatus(id, {
        status,
        facultyNotes: facultyNotes || undefined,
        rescheduledDate: rescheduleDate || undefined,
        rescheduledSlot: rescheduleSlot || undefined,
      });
      setAppointments(prev => prev.map(a => a._id === id ? res.data.data : a));
      setActionTarget(null);
      setFacultyNotes('');
      toast.success(`Appointment ${status.toLowerCase()}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await appointmentService.cancel(id);
      setAppointments(prev => prev.map(a => a._id === id ? { ...a, status: 'Cancelled' } : a));
      toast.success('Appointment cancelled');
    } catch { toast.error('Cancellation failed'); }
  };

  // Calendar helpers
  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();
  const appointmentsByDate = (date: Date) => appointments.filter(a => isSameDay(new Date(a.date), date));

  const TIME_SLOTS = [
    '08:00 - 08:30', '08:30 - 09:00', '09:00 - 09:30', '09:30 - 10:00',
    '10:00 - 10:30', '10:30 - 11:00', '11:00 - 11:30', '11:30 - 12:00',
    '13:00 - 13:30', '13:30 - 14:00', '14:00 - 14:30', '14:30 - 15:00',
    '15:00 - 15:30', '15:30 - 16:00', '16:00 - 16:30', '16:30 - 17:00',
  ];

  return (
    <div className="h-full flex flex-col p-6 gap-5 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white/90">📅 Meeting Scheduler</h1>
          <p className="text-xs text-white/40 mt-0.5">
            {isStudent ? 'Request appointments with faculty' : isFaculty ? 'Manage student appointment requests' : 'All platform appointments'}
          </p>
        </div>
        <div className="flex gap-2">
          {(['calendar', 'appointments', ...(isStudent ? ['request'] : [])] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
              style={{ background: activeTab === tab ? 'linear-gradient(135deg,#4f63ff,#7c3aed)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {tab === 'request' ? '+ New Request' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="flex gap-5 flex-1 min-h-0">
          <div className="flex-1 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-white/40 hover:text-white text-lg px-2">‹</button>
              <h3 className="text-sm font-bold text-white/80">{format(currentMonth, 'MMMM yyyy')}</h3>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-white/40 hover:text-white text-lg px-2">›</button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="text-center text-[10px] text-white/30 font-bold py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
              {daysInMonth.map(day => {
                const dayAppts = appointmentsByDate(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                return (
                  <button key={day.toISOString()} onClick={() => setSelectedDate(day)}
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-xs transition-all ${isSelected ? 'text-white' : isToday(day) ? 'text-[#7c8fff]' : 'text-white/50 hover:text-white/80'}`}
                    style={{ background: isSelected ? 'rgba(79,99,255,0.25)' : isToday(day) ? 'rgba(79,99,255,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isSelected ? 'rgba(79,99,255,0.4)' : 'rgba(255,255,255,0.04)'}` }}>
                    <span className="font-semibold">{format(day, 'd')}</span>
                    {dayAppts.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayAppts.slice(0, 3).map((a, i) => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLOR[a.status] || '#fff' }} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day detail sidebar */}
          <div className="w-72 p-4 rounded-2xl overflow-y-auto" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', scrollbarWidth: 'thin' }}>
            <h4 className="text-xs font-bold text-white/60 mb-3">
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
            </h4>
            {selectedDate && appointmentsByDate(selectedDate).length === 0 && (
              <p className="text-xs text-white/20 text-center py-6">No appointments on this date</p>
            )}
            {selectedDate && appointmentsByDate(selectedDate).map(a => (
              <div key={a._id} className="mb-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold" style={{ color: STATUS_COLOR[a.status] }}>{a.status}</span>
                  <span className="text-[10px] text-white/30">{a.timeSlot}</span>
                </div>
                <div className="text-xs font-semibold text-white/80 mt-1">{isStudent ? a.faculty?.name : a.student?.name}</div>
                <div className="text-[10px] text-white/40 mt-0.5 flex items-center gap-1">{MODE_ICONS[a.mode]} {a.mode}</div>
                <p className="text-[10px] text-white/50 mt-1 truncate">{a.purpose}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Request Tab (Student only) */}
      {activeTab === 'request' && isStudent && (
        <div className="max-w-xl p-6 rounded-2xl space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-bold text-white/80">New Appointment Request</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] text-white/40 mb-1">Select Faculty *</label>
              <select value={selectedFaculty} onChange={e => setSelectedFaculty(e.target.value)} className="input-field text-xs">
                <option value="">Choose a faculty member…</option>
                {facultyList.map(f => <option key={f._id} value={f._id}>{f.name} — {f.department || 'Faculty'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-white/40 mb-1">Meeting Mode *</label>
              <div className="flex gap-2">
                {(['Online', 'Offline'] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${mode === m ? 'text-white border-[#4f63ff]/40' : 'text-white/40 border-white/5'}`}
                    style={{ background: mode === m ? 'rgba(79,99,255,0.15)' : 'rgba(255,255,255,0.02)' }}>
                    {MODE_ICONS[m]} {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-white/40 mb-1">Date *</label>
              <input type="date" value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''} min={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setSelectedDate(new Date(e.target.value))} className="input-field text-xs" />
            </div>
            <div>
              <label className="block text-[10px] text-white/40 mb-1">Time Slot *</label>
              <select value={timeSlot} onChange={e => setTimeSlot(e.target.value)} className="input-field text-xs">
                {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] text-white/40 mb-1">Purpose *</label>
              <textarea value={purpose} onChange={e => setPurpose(e.target.value)} rows={3}
                placeholder="Describe the purpose of this meeting…"
                className="input-field text-xs resize-none" />
            </div>
          </div>
          <button onClick={handleRequest} disabled={submitting}
            className="btn-primary w-full py-2.5 disabled:opacity-40">
            {submitting ? 'Sending Request…' : 'Send Appointment Request'}
          </button>
        </div>
      )}

      {/* Appointments List Tab */}
      {activeTab === 'appointments' && (
        <div className="space-y-3">
          {loading && <div className="text-center py-8 text-white/20 text-sm">Loading appointments…</div>}
          {!loading && appointments.length === 0 && (
            <div className="text-center py-12 text-white/20 text-xs">No appointments found</div>
          )}
          {appointments.map(a => (
            <div key={a._id} className="p-4 rounded-2xl flex items-start gap-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] font-bold text-white/40">{format(new Date(a.date), 'MMM d, yyyy')}</span>
                  <span className="text-[10px] text-white/30">{a.timeSlot}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${STATUS_COLOR[a.status]}20`, color: STATUS_COLOR[a.status] }}>{a.status}</span>
                  <span className="text-[10px] text-white/30">{MODE_ICONS[a.mode]} {a.mode}</span>
                </div>
                <div className="mt-1 font-semibold text-sm text-white/80">{isStudent ? a.faculty?.name : a.student?.name}</div>
                <div className="text-xs text-white/40 mt-0.5 truncate">{a.purpose}</div>
                {a.facultyNotes && <div className="text-xs text-[#7c8fff] mt-1">Note: {a.facultyNotes}</div>}
                {a.rescheduledDate && <div className="text-xs text-[#f6ad55] mt-1">Rescheduled to: {format(new Date(a.rescheduledDate), 'MMM d, yyyy')} {a.rescheduledSlot}</div>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {isStudent && ['Pending', 'Approved'].includes(a.status) && (
                  <button onClick={() => handleCancel(a._id)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-[#fc8181]" style={{ background: 'rgba(252,129,129,0.08)', border: '1px solid rgba(252,129,129,0.15)' }}>
                    Cancel
                  </button>
                )}
                {(isFaculty || isAdmin) && a.status === 'Pending' && (
                  <>
                    <button onClick={() => handleStatusUpdate(a._id, 'Approved')}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-[#48bb78]" style={{ background: 'rgba(72,187,120,0.08)', border: '1px solid rgba(72,187,120,0.15)' }}>
                      Approve
                    </button>
                    <button onClick={() => setActionTarget(a)}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white/40" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      Actions
                    </button>
                  </>
                )}
                {(isFaculty || isAdmin) && a.status === 'Approved' && (
                  <button onClick={() => handleStatusUpdate(a._id, 'Completed')}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-[#4f63ff]" style={{ background: 'rgba(79,99,255,0.08)', border: '1px solid rgba(79,99,255,0.15)' }}>
                    Mark Done
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Faculty Action Modal */}
      {actionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setActionTarget(null)}>
          <div className="w-96 p-6 rounded-2xl space-y-4" style={{ background: '#111318', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            <h4 className="text-sm font-bold text-white/90">Manage Appointment</h4>
            <div className="text-xs text-white/50">Student: <span className="text-white/80 font-semibold">{actionTarget.student?.name}</span></div>
            <div>
              <label className="block text-[10px] text-white/40 mb-1">Notes for Student</label>
              <textarea value={facultyNotes} onChange={e => setFacultyNotes(e.target.value)} rows={2} placeholder="Optional note…" className="input-field text-xs resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-white/40 mb-1">Reschedule Date</label>
                <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} className="input-field text-xs" />
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-1">Reschedule Slot</label>
                <select value={rescheduleSlot} onChange={e => setRescheduleSlot(e.target.value)} className="input-field text-xs">
                  <option value="">Select…</option>
                  {['09:00 - 09:30','10:00 - 10:30','11:00 - 11:30','14:00 - 14:30','15:00 - 15:30'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleStatusUpdate(actionTarget._id, 'Approved')} className="flex-1 py-2 rounded-xl text-xs font-semibold text-[#48bb78]" style={{ background: 'rgba(72,187,120,0.1)' }}>Approve</button>
              <button onClick={() => handleStatusUpdate(actionTarget._id, 'Rejected')} className="flex-1 py-2 rounded-xl text-xs font-semibold text-[#fc8181]" style={{ background: 'rgba(252,129,129,0.1)' }}>Reject</button>
              {rescheduleDate && rescheduleSlot && <button onClick={() => handleStatusUpdate(actionTarget._id, 'Rescheduled')} className="flex-1 py-2 rounded-xl text-xs font-semibold text-[#9f7aea]" style={{ background: 'rgba(159,122,234,0.1)' }}>Reschedule</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
