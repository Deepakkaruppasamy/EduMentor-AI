import React, { useState, useEffect } from 'react';
import { supportService, SupportTicketData, SupportMessageData } from '../../services/support.service';
import { useSupportStore } from '../../store/support.store';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import api from '../../services/api';

const SUPPORT_CATEGORIES = [
  'Login Issues',
  'Password Reset',
  'OTP Problems',
  'Course Access',
  'Technical Issues',
  'File Upload Issues',
  'Feature Requests',
];

export const AdminSupportPanel: React.FC = () => {
  const { tickets, setTickets, updateTicketInList } = useSupportStore();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketData | null>(null);
  const [ticketMessages, setTicketMessages] = useState<SupportMessageData[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Analytics state
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Announcement state
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annTarget, setAnnTarget] = useState<'all' | 'student' | 'faculty'>('all');
  const [broadcasting, setBroadcasting] = useState(false);

  // User directory for assignment dropdown
  const [staffUsers, setStaffUsers] = useState<any[]>([]);

  useEffect(() => {
    loadTickets();
    loadAnalytics();
    loadStaffUsers();
  }, []);

  const loadTickets = async () => {
    try {
      const res = await supportService.getTickets();
      setTickets(res.data.data || []);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    }
  };

  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await supportService.getAnalytics();
      setAnalytics(res.data.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const loadStaffUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      const list = res.data?.users || res.data?.data || res.data || [];
      // Filter admins/faculty as potential assignees
      setStaffUsers(list.filter((u: any) => u.role === 'admin' || u.role === 'faculty'));
    } catch (err) {
      console.error('Failed to load staff users:', err);
    }
  };

  const handleSelectTicket = async (ticket: SupportTicketData) => {
    setSelectedTicket(ticket);
    setLoadingMessages(true);
    try {
      const res = await supportService.getTicketDetails(ticket._id);
      setTicketMessages(res.data.data.messages || []);
    } catch (err) {
      toast.error('Failed to load ticket thread');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket || sendingReply) return;
    setSendingReply(true);
    try {
      const res = await supportService.replyToTicket(selectedTicket._id, replyText.trim());
      setTicketMessages((prev) => [...prev, res.data.data]);
      setReplyText('');
      toast.success('Reply submitted');
      // Update ticket status locally in store to 'Waiting for User'
      updateTicketInList(selectedTicket._id, { status: 'Waiting for User' });
      setSelectedTicket((prev) => prev ? { ...prev, status: 'Waiting for User' } : null);
    } catch (err) {
      toast.error('Failed to submit reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateTicketMeta = async (status?: string, priority?: string, assignedToId?: string | null) => {
    if (!selectedTicket) return;
    try {
      const res = await supportService.updateTicketAdmin(selectedTicket._id, {
        status,
        priority,
        assignedToId,
      });
      const updated = res.data.data;
      updateTicketInList(selectedTicket._id, updated);
      setSelectedTicket(updated);
      toast.success('Ticket metadata updated');
      loadAnalytics(); // Reload metrics
    } catch (err) {
      toast.error('Failed to update ticket parameters');
    }
  };

  const handleBroadcastAnnouncement = async () => {
    if (!annTitle.trim() || !annContent.trim() || broadcasting) return;
    setBroadcasting(true);
    try {
      await supportService.createAnnouncement({
        title: annTitle.trim(),
        content: annContent.trim(),
        targetRole: annTarget,
      });
      toast.success('Announcement broadcasted globally!');
      setAnnTitle('');
      setAnnContent('');
    } catch (err) {
      toast.error('Failed to broadcast announcement');
    } finally {
      setBroadcasting(false);
    }
  };

  // Filters application
  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = !statusFilter || t.status === statusFilter;
    const matchesPriority = !priorityFilter || t.priority === priorityFilter;
    const matchesCategory = !categoryFilter || t.category === categoryFilter;
    const matchesSearch =
      !searchQuery ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesPriority && matchesCategory && matchesSearch;
  });

  // Recharts Colors
  const COLORS = ['#4f63ff', '#f6ad55', '#fc8181', '#48bb78', '#9f7aea', '#38b2ac'];

  const categoryChartData = analytics?.categories?.map((cat: any) => ({
    name: cat._id,
    value: cat.count,
  })) || [];

  const ratingsChartData = analytics?.feedbackRatings?.map((f: any) => ({
    name: f._id,
    count: f.count,
  })) || [];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full" style={{ scrollbarWidth: 'thin' }}>
      {/* Super Admin Dashboard Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-[10px] text-white/30 font-semibold uppercase">Total Tickets</div>
            <div className="text-xl font-bold text-white/80 mt-1">{analytics.totalTickets}</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-[10px] text-white/30 font-semibold uppercase">Open Tickets</div>
            <div className="text-xl font-bold text-[#f6ad55] mt-1">{analytics.openTickets}</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-[10px] text-white/30 font-semibold uppercase">Resolved</div>
            <div className="text-xl font-bold text-[#48bb78] mt-1">{analytics.resolvedTickets}</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-[10px] text-white/30 font-semibold uppercase">Critical Issues</div>
            <div className="text-xl font-bold text-[#fc8181] mt-1">{analytics.criticalTickets}</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-[10px] text-white/30 font-semibold uppercase">CSAT Score</div>
            <div className="text-xl font-bold text-[#7c8fff] mt-1">{analytics.csatScore}%</div>
          </div>
        </div>
      )}

      {/* Analytics Charts Grid */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Categories Chart */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col h-[280px]">
            <h4 className="text-xs font-bold text-white/60 mb-4 uppercase">Tickets by Category</h4>
            <div className="flex-1 min-h-0 flex items-center justify-between">
              <div className="w-[180px] h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryChartData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={70}>
                      {categoryChartData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#111318', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5 overflow-y-auto pl-4" style={{ maxHeight: '180px', scrollbarWidth: 'none' }}>
                {categoryChartData.map((item: any, i: number) => (
                  <div key={item.name} className="flex items-center gap-2 text-[10px] text-white/60">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="truncate flex-1">{item.name}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Customer Satisfaction Chart */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col h-[280px]">
            <h4 className="text-xs font-bold text-white/60 mb-4 uppercase">Feedback Ratings (CSAT)</h4>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingsChartData}>
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#111318', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <Bar dataKey="count" fill="#4f63ff" radius={[4, 4, 0, 0]}>
                    {ratingsChartData.map((item: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={item.name === 'Not Resolved' ? '#fc8181' : '#4f63ff'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Main Console Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Ticket List Table */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <h4 className="text-sm font-bold text-white/80">Support Tickets Audit</h4>
            <input
              type="text"
              placeholder="Search Ticket, Subject, User…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field text-xs max-w-xs"
            />
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-3 gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field text-xs">
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting for User">Waiting for User</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="input-field text-xs">
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input-field text-xs">
              <option value="">All Categories</option>
              {SUPPORT_CATEGORIES.map((cat: string) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="border border-white/5 rounded-xl overflow-hidden bg-white/[0.01]">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-white/50 border-b border-white/5">
                  <th className="p-3">Ticket ID</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-white/20">No matching tickets found</td>
                  </tr>
                ) : (
                  filteredTickets.map((t) => (
                    <tr
                      key={t._id}
                      onClick={() => handleSelectTicket(t)}
                      className={`border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors cursor-pointer ${
                        selectedTicket?._id === t._id ? 'bg-[#4f63ff]/10' : ''
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-white/80">{t.ticketId}</td>
                      <td className="p-3">
                        <div className="font-semibold text-white/70">{t.user?.name}</div>
                        <div className="text-[10px] text-white/30 capitalize">{t.user?.role}</div>
                      </td>
                      <td className="p-3 truncate max-w-[150px]" title={t.subject}>{t.subject}</td>
                      <td className="p-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                          style={{
                            background:
                              t.priority === 'Critical'
                                ? 'rgba(252,129,129,0.15)'
                                : t.priority === 'High'
                                ? 'rgba(246,173,85,0.15)'
                                : 'rgba(255,255,255,0.05)',
                            color:
                              t.priority === 'Critical'
                                ? '#fc8181'
                                : t.priority === 'High'
                                ? '#f6ad55'
                                : 'rgba(255,255,255,0.4)',
                          }}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                          style={{
                            background:
                              t.status === 'Resolved' || t.status === 'Closed'
                                ? 'rgba(72,187,120,0.15)'
                                : 'rgba(79,99,255,0.15)',
                            color:
                              t.status === 'Resolved' || t.status === 'Closed'
                                ? '#48bb78'
                                : '#7c8fff',
                          }}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ticket Actions & Thread */}
        <div className="lg:col-span-5 space-y-6">
          {selectedTicket ? (
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
              {/* Header metadata controls */}
              <div className="flex justify-between items-start border-b border-white/5 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white/80">{selectedTicket.ticketId}</h4>
                  <div className="text-[10px] text-white/40 mt-0.5">Subject: {selectedTicket.subject}</div>
                </div>
              </div>

              {/* Status and Priority selectors */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-white/45 mb-1">Status</label>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateTicketMeta(e.target.value)}
                    className="input-field text-xs"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Waiting for User">Waiting for User</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-white/45 mb-1">Priority</label>
                  <select
                    value={selectedTicket.priority}
                    onChange={(e) => handleUpdateTicketMeta(undefined, e.target.value)}
                    className="input-field text-xs"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Assignee select */}
              <div className="text-xs">
                <label className="block text-[10px] text-white/45 mb-1">Assigned Support Staff</label>
                <select
                  value={selectedTicket.assignedTo?._id || ''}
                  onChange={(e) => handleUpdateTicketMeta(undefined, undefined, e.target.value || null)}
                  className="input-field text-xs"
                >
                  <option value="">Unassigned</option>
                  {staffUsers.map((u) => (
                    <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              {/* Ticket conversation audit logs */}
              <div className="border-t border-white/5 pt-3">
                <label className="block text-[10px] text-white/45 mb-2 uppercase">Message Logs</label>
                <div className="max-h-[220px] overflow-y-auto space-y-2.5 pr-2" style={{ scrollbarWidth: 'thin' }}>
                  {loadingMessages ? (
                    <div className="text-center py-4 text-white/20">Loading thread…</div>
                  ) : (
                    ticketMessages.map((msg) => {
                      const isAdmin = msg.role === 'admin';
                      return (
                        <div key={msg._id} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                          <div className="flex justify-between items-center text-[9px] text-white/30 font-semibold mb-1">
                            <span style={{ color: isAdmin ? '#9f7aea' : '#7c8fff' }}>{msg.senderName} ({msg.role})</span>
                            <span>{format(new Date(msg.createdAt), 'MMM d, h:mm a')}</span>
                          </div>
                          <p className="text-xs text-white/70 leading-relaxed">{msg.content}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Admin reply composer */}
              <div className="border-t border-white/5 pt-3 flex gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Direct reply to student/faculty user…"
                  rows={2}
                  className="input-field text-xs resize-none"
                />
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sendingReply}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold disabled:opacity-40 flex-shrink-0 self-end"
                  style={{ background: 'linear-gradient(135deg, #4f63ff, #7c3aed)' }}
                >
                  {sendingReply ? '…' : '➤'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 border-dashed text-center text-white/20 text-xs py-12">
              Select a support ticket from the list to audit messages and take action
            </div>
          )}

          {/* Admin Announcement Broadcaster Form */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white/60 uppercase">📢 Broadcaster Support Notification</h4>
            <div className="space-y-3 text-xs">
              <input
                type="text"
                placeholder="Announcement Title"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                className="input-field text-xs"
              />
              <textarea
                placeholder="Broadcast notice content detailing system maintentance, outages, or platform updates…"
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                rows={3}
                className="input-field text-xs resize-none"
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setAnnTarget('all')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border ${
                      annTarget === 'all' ? 'bg-[#4f63ff]/20 text-[#7c8fff] border-[#4f63ff]/30' : 'text-white/40 border-transparent'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setAnnTarget('student')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border ${
                      annTarget === 'student' ? 'bg-[#4f63ff]/20 text-[#7c8fff] border-[#4f63ff]/30' : 'text-white/40 border-transparent'
                    }`}
                  >
                    Students
                  </button>
                  <button
                    onClick={() => setAnnTarget('faculty')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border ${
                      annTarget === 'faculty' ? 'bg-[#4f63ff]/20 text-[#7c8fff] border-[#4f63ff]/30' : 'text-white/40 border-transparent'
                    }`}
                  >
                    Faculty
                  </button>
                </div>
                <button
                  onClick={handleBroadcastAnnouncement}
                  disabled={!annTitle.trim() || !annContent.trim() || broadcasting}
                  className="btn-primary px-4 py-2"
                >
                  {broadcasting ? 'Broadcasting…' : 'Publish Notice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
