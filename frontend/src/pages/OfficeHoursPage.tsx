import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth.store';
import { officeHoursService } from '../services/officeHours.service';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';

const STATUS_CONFIG = {
  Available: { color: '#48bb78', bg: 'rgba(72,187,120,0.12)', icon: '🟢' },
  Busy: { color: '#f6ad55', bg: 'rgba(246,173,85,0.12)', icon: '🟡' },
  Offline: { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.04)', icon: '⚫' },
  OnLeave: { color: '#9f7aea', bg: 'rgba(159,122,234,0.12)', icon: '🏖️' },
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const OfficeHoursPage: React.FC = () => {
  const { user } = useAuthStore();
  const isFaculty = user?.role === 'faculty';

  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [myConfig, setMyConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'directory' | 'configure' | 'queue'>('directory');
  const [selectedFaculty, setSelectedFaculty] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [myQueueEntry, setMyQueueEntry] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Configure form state
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [status, setStatus] = useState<string>('Offline');
  const [statusMsg, setStatusMsg] = useState('');
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('17:00');
  const [duration, setDuration] = useState(30);
  const [maxAppts, setMaxAppts] = useState(1);
  const [saving, setSaving] = useState(false);

  // Real-time queue updates via Socket.IO
  useEffect(() => {
    const targetFacultyId = isFaculty ? user?.id : selectedFaculty?.faculty?._id;
    if (!targetFacultyId) return;

    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('join_faculty', targetFacultyId);
    });

    socket.on('queue:updated', async (data: any) => {
      try {
        const res = await officeHoursService.getQueue(targetFacultyId);
        setQueue(res.data.data || []);
        if (!isFaculty) {
          const mine = (res.data.data || []).find((q: any) => q.student?._id === user?.id);
          setMyQueueEntry(mine || null);
        }
      } catch (err) {
        console.error('Failed to reload queue:', err);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isFaculty, selectedFaculty, user]);

  useEffect(() => {
    loadFacultyList();
    if (isFaculty) {
      loadMyConfig();
      // Load current faculty queue
      officeHoursService.getQueue(user?.id).then(res => setQueue(res.data.data || []));
    }
  }, []);

  const loadFacultyList = async () => {
    setLoading(true);
    try {
      const res = await officeHoursService.getAllFacultyAvailability();
      setFacultyList(res.data.data || []);
    } catch { toast.error('Failed to load faculty list'); }
    finally { setLoading(false); }
  };

  const loadMyConfig = async () => {
    try {
      const res = await officeHoursService.getMyConfig();
      const config = res.data.data;
      if (config) {
        setMyConfig(config);
        setWorkingDays(config.workingDays || [1,2,3,4,5]);
        setStatus(config.status || 'Offline');
        setStatusMsg(config.statusMessage || '');
        if (config.slots?.[0]) {
          setSlotStart(config.slots[0].startTime);
          setSlotEnd(config.slots[0].endTime);
          setDuration(config.slots[0].durationMinutes);
          setMaxAppts(config.slots[0].maxAppointments);
        }
      }
    } catch {}
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await officeHoursService.configure({
        workingDays,
        slots: [{ startTime: slotStart, endTime: slotEnd, durationMinutes: duration, maxAppointments: maxAppts }],
        status,
        statusMessage: statusMsg,
      });
      toast.success('Office hours configuration saved!');
      loadFacultyList();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const handleQuickStatus = async (newStatus: string) => {
    try {
      await officeHoursService.updateStatus({ status: newStatus });
      setStatus(newStatus);
      toast.success(`Status set to ${newStatus}`);
      loadFacultyList();
    } catch { toast.error('Status update failed'); }
  };

  const handleSelectFaculty = async (entry: any) => {
    setSelectedFaculty(entry);
    try {
      const res = await officeHoursService.getQueue(entry.faculty._id);
      setQueue(res.data.data || []);
      const mine = (res.data.data || []).find((q: any) => q.student?._id === user?.id);
      setMyQueueEntry(mine || null);
    } catch {}
    setActiveTab('queue');
  };

  const handleJoinQueue = async () => {
    if (!selectedFaculty) return;
    try {
      const res = await officeHoursService.joinQueue(selectedFaculty.faculty._id);
      setMyQueueEntry(res.data.data);
      const qRes = await officeHoursService.getQueue(selectedFaculty.faculty._id);
      setQueue(qRes.data.data || []);
      toast.success(`Joined queue at position ${res.data.data.position}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to join queue');
    }
  };

  const handleLeaveQueue = async () => {
    if (!selectedFaculty) return;
    try {
      await officeHoursService.leaveQueue(selectedFaculty.faculty._id);
      setMyQueueEntry(null);
      const qRes = await officeHoursService.getQueue(selectedFaculty.faculty._id);
      setQueue(qRes.data.data || []);
      toast.success('Left the consultation queue');
    } catch { toast.error('Failed to leave queue'); }
  };

  const handleCallNext = async () => {
    try {
      const res = await officeHoursService.callNext();
      if (res.data.data) {
        toast.success(`Calling: ${res.data.data.student?.name}`);
        if (selectedFaculty) {
          const qRes = await officeHoursService.getQueue(selectedFaculty.faculty._id);
          setQueue(qRes.data.data || []);
        }
      } else {
        toast('Queue is empty!');
      }
    } catch { toast.error('Failed to call next'); }
  };

  const toggleDay = (day: number) => {
    setWorkingDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  return (
    <div className="h-full flex flex-col p-6 gap-5 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white/90">🏫 Office Hours</h1>
          <p className="text-xs text-white/40 mt-0.5">
            {isFaculty ? 'Configure your availability and manage consultation queue' : 'View faculty availability and join consultation queues'}
          </p>
        </div>
        <div className="flex gap-2">
          {(['directory', ...(isFaculty ? ['configure'] : ['queue'])] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
              style={{ background: activeTab === tab ? 'linear-gradient(135deg,#4f63ff,#7c3aed)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Faculty Directory */}
      {activeTab === 'directory' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && <div className="col-span-3 text-center py-8 text-white/20 text-sm">Loading…</div>}
          {facultyList.map(({ faculty, officeHours }) => {
            const s = (officeHours?.status as keyof typeof STATUS_CONFIG) || 'Offline';
            const cfg = STATUS_CONFIG[s];
            return (
              <button key={faculty._id} onClick={() => handleSelectFaculty({ faculty, officeHours })}
                className="p-4 rounded-2xl text-left transition-all hover:scale-[1.01]" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: cfg.bg }}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-white/90 truncate">{faculty.name}</div>
                    <div className="text-[10px] text-white/40 truncate">{faculty.department || 'Faculty'}</div>
                    <div className="mt-2 text-[10px] font-bold" style={{ color: cfg.color }}>{s}</div>
                    {officeHours?.statusMessage && <div className="text-[10px] text-white/30 truncate">{officeHours.statusMessage}</div>}
                    {officeHours?.slots?.[0] && (
                      <div className="text-[10px] text-white/40 mt-1">
                        Hours: {officeHours.slots[0].startTime} – {officeHours.slots[0].endTime}
                      </div>
                    )}
                    {officeHours?.workingDays && (
                      <div className="flex gap-0.5 mt-1">
                        {DAYS_OF_WEEK.map((d, i) => (
                          <span key={d} className={`text-[8px] px-1 rounded ${officeHours.workingDays.includes(i) ? 'text-[#7c8fff] bg-[#4f63ff]/10' : 'text-white/20'}`}>{d}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Queue View (Student) */}
      {activeTab === 'queue' && selectedFaculty && (
        <div className="max-w-lg space-y-4">
          <div className="p-5 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-white/90">{selectedFaculty.faculty.name}</div>
                <div className="text-[10px] text-white/40">{selectedFaculty.faculty.department}</div>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: STATUS_CONFIG[(selectedFaculty.officeHours?.status || 'Offline') as keyof typeof STATUS_CONFIG]?.bg, color: STATUS_CONFIG[(selectedFaculty.officeHours?.status || 'Offline') as keyof typeof STATUS_CONFIG]?.color }}>
                {selectedFaculty.officeHours?.status || 'Offline'}
              </span>
            </div>
            <div className="text-xs text-white/60">Queue: <span className="font-bold text-white/90">{queue.length}</span> waiting</div>
            {myQueueEntry ? (
              <div className="space-y-2">
                <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(79,99,255,0.1)', border: '1px solid rgba(79,99,255,0.2)' }}>
                  <div className="text-xs text-white/60">Your position</div>
                  <div className="text-3xl font-black text-white/90 my-1">#{myQueueEntry.position}</div>
                  <div className="text-[10px] text-white/40">Estimated wait: ~{(myQueueEntry.position - 1) * 15} min</div>
                </div>
                <button onClick={handleLeaveQueue} className="w-full py-2 rounded-xl text-xs font-semibold text-[#fc8181]" style={{ background: 'rgba(252,129,129,0.08)' }}>
                  Leave Queue
                </button>
              </div>
            ) : (
              <button onClick={handleJoinQueue}
                disabled={selectedFaculty.officeHours?.status !== 'Available'}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#4f63ff,#7c3aed)' }}>
                {selectedFaculty.officeHours?.status === 'Available' ? 'Join Consultation Queue' : 'Faculty is not available'}
              </button>
            )}
          </div>

          {/* Live Queue List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white/40 uppercase">Current Queue</h4>
            {queue.length === 0 && <div className="text-center py-4 text-white/20 text-xs">Queue is empty</div>}
            {queue.map((entry, i) => (
              <div key={entry._id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: i === 0 ? 'rgba(79,99,255,0.2)' : 'rgba(255,255,255,0.05)', color: i === 0 ? '#7c8fff' : 'rgba(255,255,255,0.4)' }}>
                  #{entry.position}
                </div>
                <div className="text-xs font-semibold text-white/70">{entry.student?.name}</div>
                {entry.status === 'Called' && <span className="ml-auto text-[10px] text-[#f6ad55] font-bold animate-pulse">Being Called</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configure Tab (Faculty only) */}
      {activeTab === 'configure' && isFaculty && (
        <div className="max-w-xl space-y-5">
          {/* Quick Status Buttons */}
          <div className="p-5 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h4 className="text-xs font-bold text-white/60 uppercase">Quick Status</h4>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map(s => (
                <button key={s} onClick={() => handleQuickStatus(s)}
                  className="py-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all"
                  style={{ background: status === s ? STATUS_CONFIG[s].bg : 'rgba(255,255,255,0.02)', color: status === s ? STATUS_CONFIG[s].color : 'rgba(255,255,255,0.4)', border: `1px solid ${status === s ? STATUS_CONFIG[s].color + '40' : 'rgba(255,255,255,0.05)'}` }}>
                  {STATUS_CONFIG[s].icon}<span>{s}</span>
                </button>
              ))}
            </div>
            <input type="text" value={statusMsg} onChange={e => setStatusMsg(e.target.value)} placeholder="Optional status message…" className="input-field text-xs" />
          </div>

          {/* Working Days */}
          <div className="p-5 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h4 className="text-xs font-bold text-white/60 uppercase">Working Days</h4>
            <div className="flex gap-2 flex-wrap">
              {DAYS_OF_WEEK.map((d, i) => (
                <button key={d} onClick={() => toggleDay(i)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: workingDays.includes(i) ? 'rgba(79,99,255,0.15)' : 'rgba(255,255,255,0.03)', color: workingDays.includes(i) ? '#7c8fff' : 'rgba(255,255,255,0.35)', border: `1px solid ${workingDays.includes(i) ? 'rgba(79,99,255,0.3)' : 'rgba(255,255,255,0.05)'}` }}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Time Slots Config */}
          <div className="p-5 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h4 className="text-xs font-bold text-white/60 uppercase">Consultation Hours</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-white/40 mb-1">Start Time</label>
                <input type="time" value={slotStart} onChange={e => setSlotStart(e.target.value)} className="input-field text-xs" />
              </div>
              <div>
                <label className="block text-white/40 mb-1">End Time</label>
                <input type="time" value={slotEnd} onChange={e => setSlotEnd(e.target.value)} className="input-field text-xs" />
              </div>
              <div>
                <label className="block text-white/40 mb-1">Session Duration (min)</label>
                <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="input-field text-xs">
                  {[15, 20, 30, 45, 60].map(d => <option key={d} value={d}>{d} minutes</option>)}
                </select>
              </div>
              <div>
                <label className="block text-white/40 mb-1">Max Appointments / Slot</label>
                <select value={maxAppts} onChange={e => setMaxAppts(Number(e.target.value))} className="input-field text-xs">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleSaveConfig} disabled={saving} className="btn-primary w-full py-2.5 disabled:opacity-40">
              {saving ? 'Saving…' : 'Save Configuration'}
            </button>
          </div>

          {/* Faculty Queue Management */}
          <div className="p-5 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-white/60 uppercase">Live Queue</h4>
              <button onClick={handleCallNext} className="btn-primary text-xs px-4 py-1.5">Call Next</button>
            </div>
            {queue.length === 0 ? (
              <div className="text-center py-4 text-white/20 text-xs">No students in queue</div>
            ) : (
              queue.map((entry, i) => (
                <div key={entry._id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: entry.status === 'Called' ? 'rgba(246,173,85,0.2)' : 'rgba(79,99,255,0.1)', color: entry.status === 'Called' ? '#f6ad55' : '#7c8fff' }}>#{i+1}</div>
                  <div className="text-xs font-semibold text-white/80">{entry.student?.name}</div>
                  {entry.status === 'Called' && <span className="ml-auto text-[10px] text-[#f6ad55] font-bold">▶ Now</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
