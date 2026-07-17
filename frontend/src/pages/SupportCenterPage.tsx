import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth.store';
import { useSupportStore } from '../store/support.store';
import { BookmarkButton } from '../components/common/BookmarkButton';
import { recentlyViewedService } from '../services/recently-viewed.service';
import { supportService, SupportTicketData, SupportMessageData } from '../services/support.service';
import { connectSupportSocket, disconnectSupportSocket, joinTicketRoom, leaveTicketRoom } from '../services/support-socket';
import { AdminSupportPanel } from '../components/support/AdminSupportPanel';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// FAQ Content mapping common platform issues
const FAQ_ITEMS = [
  {
    q: 'How do I upload lecture notes or study documents?',
    a: 'Navigate to "Upload Documents" in the sidebar (for faculty/admins) or select course materials. Ensure files are under 25MB and format is PDF, DOCX, or PPTX.',
  },
  {
    q: 'Can I reset my account login password?',
    a: 'Yes, if you forgot your password, select "Forgot Password" on the Login page to receive a recovery email. Admins can also force-reset passwords from the User Directory.',
  },
  {
    q: 'What is the AI Study Tutor and how is it different from Support?',
    a: 'The Educational AI Tutor (AI Chat Tutor) is trained to help you with courses, exams, homework, and coding. The Support Bot only helps with site navigation and platform tech support.',
  },
  {
    q: 'How do I take a quiz or generate a quiz?',
    a: 'Go to the "Quiz Generator" in the sidebar. Select a course and choose the number of questions, difficulty level, and format (MCQs, short answer, or long answer) to generate an interactive quiz.',
  },
  {
    q: 'Where can I customize my profile and avatar studio?',
    a: 'Click "Avatar Studio" or "My Profile" in the sidebar. In the studio, you can configure your avatar model, pose, accessories, animation styles, and expressions.',
  },
];

export const SupportCenterPage: React.FC = () => {
  const { user } = useAuthStore();
  const {
    tickets,
    activeTicket,
    ticketMessages,
    ticketTimeline,
    announcements,
    setTickets,
    setActiveTicket,
    addTicket,
    updateTicketInList,
    setTicketDetails,
    addTicketMessage,
    setAnnouncements,
    addAnnouncement,
  } = useSupportStore();

  const [activeTab, setActiveTab] = useState<'aichat' | 'tickets' | 'faq' | 'admin'>('aichat');

  // AI Chat Bot state
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: `Hello ${user?.name}! I am the EduMentor Platform Support Assistant. Ask me how to reset passwords, navigate menus, upload files, or take quizzes. If you have an unresolved problem, I can help file a support ticket!` },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // CSAT Rating states
  const [showCsat, setShowCsat] = useState(false);
  const [selectedCsatRating, setSelectedCsatRating] = useState('');
  const [csatComments, setCsatComments] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Create manual ticket state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technical Issues');
  const [priority, setPriority] = useState('Medium');
  const [creatingTicket, setCreatingTicket] = useState(false);

  // User reply thread state
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Socket setup
  useEffect(() => {
    try {
      const socket = connectSupportSocket();

      // Listen for socket events
      socket.on('ticket:new_message', (message: SupportMessageData) => {
        if (activeTicket?._id === message.ticket) {
          addTicketMessage(message);
        }
      });

      socket.on('ticket:status_change', (ticket: SupportTicketData) => {
        updateTicketInList(ticket._id, ticket);
      });

      socket.on('support:new_announcement', (announcement: any) => {
        addAnnouncement(announcement);
        toast(`📢 Support Notice: ${announcement.title}`, { duration: 4000 });
      });

      return () => {
        disconnectSupportSocket();
      };
    } catch (err) {
      console.error('Failed to establish support socket connection:', err);
    }
  }, [activeTicket?._id]);

  // Load initial tickets and announcements
  useEffect(() => {
    loadTickets();
    loadAnnouncements();
  }, []);

  useEffect(() => {
    if (activeTicket) {
      loadTicketDetails(activeTicket._id);
      joinTicketRoom(activeTicket._id);
      return () => {
        leaveTicketRoom(activeTicket._id);
      };
    }
  }, [activeTicket?._id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadTickets = async () => {
    try {
      const res = await supportService.getTickets();
      setTickets(res.data.data || []);
    } catch (err) {
      console.error('Failed to load tickets list:', err);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const res = await supportService.getAnnouncements();
      setAnnouncements(res.data.data || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    }
  };

  const loadTicketDetails = async (id: string) => {
    try {
      const res = await supportService.getTicketDetails(id);
      setTicketDetails(res.data.data.messages || [], res.data.data.timeline || []);
    } catch (err) {
      console.error('Failed to load ticket threads:', err);
    }
  };

  // AI Chat Submit
  const handleSendChat = async () => {
    if (!chatInput.trim() || sendingChat) return;
    const userText = chatInput.trim();
    const updatedMessages = [...chatMessages, { role: 'user' as const, content: userText }];
    setChatMessages(updatedMessages);
    setChatInput('');
    setSendingChat(true);

    try {
      // Send chat log payload (we send history messages context)
      const res = await supportService.queryChat(
        updatedMessages.slice(-5) // Send last 5 history messages for memory context
      );
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.data.data.content }]);

      // Prompt CSAT feedback rating request if resolution terms appear
      const resolveTerms = ['resolved', 'fixed', 'helped', 'working', 'closed'];
      if (resolveTerms.some((term) => res.data.data.content.toLowerCase().includes(term))) {
        setShowCsat(true);
      }
    } catch (err: any) {
      toast.error('AI Support is currently busy. Try creating a ticket.');
    } finally {
      setSendingChat(false);
    }
  };

  // CSAT rating submission
  const handleSubmitCsat = async () => {
    if (!selectedCsatRating) {
      toast.error('Please pick a rating');
      return;
    }
    setSubmittingFeedback(true);
    try {
      // If Not Resolved, automatically create a ticket
      if (selectedCsatRating === 'Not Resolved') {
        const res = await supportService.createTicket({
          subject: 'AI Chat Bot Unresolved Problem',
          description: `User reported issue as unresolved after Support Chatbot session. Last message content: "${
            chatMessages[chatMessages.length - 1]?.content || ''
          }"`,
          category: 'Technical Issues',
          priority: 'High',
        });
        addTicket(res.data.data);
        toast.success('Issue flagged: Support ticket created automatically!');
        setActiveTab('tickets');
      } else {
        toast.success('Thank you for rating our support chatbot!');
      }
      setShowCsat(false);
      setSelectedCsatRating('');
      setCsatComments('');
    } catch (err) {
      toast.error('Feedback capture failed');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Manual Ticket submit
  const handleCreateTicket = async () => {
    if (!subject.trim() || !description.trim() || creatingTicket) return;
    setCreatingTicket(true);
    try {
      const res = await supportService.createTicket({
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
      });
      addTicket(res.data.data);
      toast.success('Support Ticket created!');
      setSubject('');
      setDescription('');
      setShowCreateForm(false);
      setActiveTicket(res.data.data);
    } catch (err) {
      toast.error('Ticket creation failed');
    } finally {
      setCreatingTicket(false);
    }
  };

  // User message reply
  const handleUserReply = async () => {
    if (!replyText.trim() || !activeTicket || sendingReply) return;
    setSendingReply(true);
    try {
      const res = await supportService.replyToTicket(activeTicket._id, replyText.trim());
      // Append reply message locally
      setTicketDetails([...ticketMessages, res.data.data], ticketTimeline);
      setReplyText('');
      toast.success('Message sent to Administrator');
    } catch (err) {
      toast.error('Failed to post message reply');
    } finally {
      setSendingReply(false);
    }
  };

  const isSuperAdmin = user?.role === 'admin';

  return (
    <div className="flex h-[calc(100vh-2rem)] rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Side Tabs Navigation */}
      <div className="w-[260px] flex-shrink-0 border-r border-white/5 flex flex-col bg-rgba(10,11,15,0.6)">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-sm font-bold text-white/95 flex items-center gap-1.5">
            🛠️ Support Center
          </h3>
        </div>

        <div className="flex-1 p-3 space-y-1.5">
          <button
            onClick={() => setActiveTab('aichat')}
            className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'aichat' ? 'bg-[#4f5dc8]/10 text-[#8b94e0]' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.02]'
            }`}
          >
            🤖 AI Support Chat
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'tickets' ? 'bg-[#4f5dc8]/10 text-[#8b94e0]' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.02]'
            }`}
          >
            📂 Ticket Center ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'faq' ? 'bg-[#4f5dc8]/10 text-[#8b94e0]' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.02]'
            }`}
          >
            📋 FAQ & Announcements
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'admin' ? 'bg-[#4f5dc8]/10 text-[#8b94e0]' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.02]'
              }`}
            >
              🛡️ Admin Console
            </button>
          )}
        </div>
      </div>

      {/* Main Console Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0b0f]">
        {/* Tab 1: AI Support Chat */}
        {activeTab === 'aichat' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Chat Header */}
            <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <div>
                <h4 className="text-xs font-bold text-white/80">Support Assistant Chatbot</h4>
                <p className="text-[10px] text-white/30">Get instant answers for site features, navigation, and resets</p>
              </div>
            </div>

            {/* Chat Message Box */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin' }}>
              {chatMessages.map((msg, i) => {
                const isAI = msg.role === 'assistant';
                return (
                  <div key={i} className={`flex max-w-[75%] flex-col ${isAI ? 'mr-auto items-start' : 'ml-auto items-end'}`}>
                    <span className="text-[9px] text-white/35 mb-0.5 px-1 font-semibold">{isAI ? 'Support Bot' : 'You'}</span>
                    <div
                      className="rounded-2xl px-4 py-2.5 text-xs leading-relaxed"
                      style={{
                        background: isAI ? 'rgba(255,255,255,0.05)' : 'rgba(79,93,200,0.10)',
                        border: isAI ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(79,93,200,0.18)',
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* CSAT Modal */}
            {showCsat && (
              <div className="p-4 border-t border-white/5 bg-[#111318]/90 backdrop-blur space-y-3">
                <div className="text-xs font-bold text-white/90">Was your support query resolved?</div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: 'Excellent', val: 'Excellent', icon: '😊' },
                    { label: 'Good', val: 'Good', icon: '🙂' },
                    { label: 'Average', val: 'Average', icon: '😐' },
                    { label: 'Poor', val: 'Poor', icon: '😞' },
                    { label: 'Not Resolved', val: 'Not Resolved', icon: '❌' },
                  ].map((r) => (
                    <button
                      key={r.val}
                      onClick={() => setSelectedCsatRating(r.val)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all ${
                        selectedCsatRating === r.val
                          ? 'bg-[#4f5dc8]/15 text-[#8b94e0] border-[#4f5dc8]/25'
                          : 'text-white/40 border-white/5 hover:text-white/70'
                      }`}
                    >
                      {r.icon} {r.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Add brief comments (optional)…"
                    value={csatComments}
                    onChange={(e) => setCsatComments(e.target.value)}
                    className="input-field text-xs flex-1"
                  />
                  <button
                    onClick={handleSubmitCsat}
                    disabled={!selectedCsatRating || submittingFeedback}
                    className="btn-primary px-4 py-2"
                  >
                    Submit Feedback
                  </button>
                </div>
              </div>
            )}

            {/* Input Composer */}
            <div className="p-4 border-t border-white/5 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Ask about resetting passwords, file uploads, quiz arena, settings…"
                className="input-field text-xs flex-1"
              />
              <button
                onClick={handleSendChat}
                disabled={!chatInput.trim() || sendingChat}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #4f5dc8, #6359a8)' }}
              >
                {sendingChat ? '…' : '➤'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Ticket Center */}
        {activeTab === 'tickets' && (
          <div className="flex-grow flex min-h-0">
            {/* Tickets Sidebar */}
            <div className="w-[300px] border-r border-white/5 flex flex-col bg-white/[0.005]">
              <div className="p-4 border-b border-white/5 flex justify-between items-center">
                <span className="text-xs font-bold text-white/80">Support Tickets</span>
                <button
                  onClick={() => { setShowCreateForm(true); setActiveTicket(null); }}
                  className="btn-primary text-[10px] px-2 py-1"
                >
                  + File Ticket
                </button>
              </div>

              <div className="flex-grow overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {tickets.length === 0 ? (
                  <div className="p-5 text-center text-white/20 text-xs">No support tickets filed yet</div>
                ) : (
                  tickets.map((t) => (
                    <button
                      key={t._id}
                      onClick={() => {
                        setShowCreateForm(false);
                        setActiveTicket(t);
                        recentlyViewedService.record({
                          itemType: 'ticket',
                          itemId: t._id,
                          title: `Ticket: ${t.subject}`,
                          url: `/support`
                        }).catch(() => {});
                      }}
                      className={`w-full p-4 border-b border-white/5 text-left transition-all hover:bg-white/[0.015] ${
                        activeTicket?._id === t._id ? 'bg-white/5' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[10px] font-bold text-[#8b94e0]">{t.ticketId}</span>
                        <span
                          className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase"
                          style={{
                            background: t.status === 'Resolved' ? 'rgba(52,168,122,0.1)' : 'rgba(79,93,200,0.08)',
                            color: t.status === 'Resolved' ? '#34a87a' : '#8b94e0',
                          }}
                        >
                          {t.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-white/70 truncate mt-1">{t.subject}</h4>
                      <div className="flex justify-between items-center text-[9px] text-white/20 mt-2">
                        <span>Category: {t.category}</span>
                        <span>{format(new Date(t.createdAt), 'MM/dd/yyyy')}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Detail Viewer */}
            <div className="flex-1 flex flex-col min-w-0">
              {showCreateForm && (
                <div className="p-6 space-y-4 overflow-y-auto h-full" style={{ scrollbarWidth: 'thin' }}>
                  <h4 className="text-sm font-bold text-white/90">File a Support Ticket</h4>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-white/40 mb-1">Subject *</label>
                      <input
                        type="text"
                        placeholder="Brief summary of the issue (e.g. OTP reset request)"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="input-field text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-white/40 mb-1">Category *</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="input-field text-xs"
                        >
                          <option value="Login Issues">Login Issues</option>
                          <option value="Password Reset">Password Reset</option>
                          <option value="OTP Problems">OTP Problems</option>
                          <option value="Course Access">Course Access</option>
                          <option value="Technical Issues">Technical Issues</option>
                          <option value="File Upload Issues">File Upload Issues</option>
                          <option value="Feature Requests">Feature Requests</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-white/40 mb-1">Priority</label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                          className="input-field text-xs"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Critical">Critical</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-white/40 mb-1">Description *</label>
                      <textarea
                        placeholder="Provide details about the issue. List steps to reproduce if applicable."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="input-field text-xs resize-none"
                      />
                    </div>
                    <button
                      onClick={handleCreateTicket}
                      disabled={!subject.trim() || !description.trim() || creatingTicket}
                      className="btn-primary w-full py-2.5 disabled:opacity-40"
                    >
                      {creatingTicket ? 'Submitting…' : 'File Ticket'}
                    </button>
                  </div>
                </div>
              )}

              {activeTicket && !showCreateForm && (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  {/* Ticket Detail Header */}
                  <div className="px-5 py-4 border-b border-white/5 bg-white/[0.005] flex justify-between items-start gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-white/80">{activeTicket.ticketId} — {activeTicket.subject}</h4>
                      <div className="text-[10px] text-white/35 mt-1">Category: {activeTicket.category} • Priority: {activeTicket.priority}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookmarkButton
                        itemType="ticket"
                        itemId={activeTicket._id}
                        title={`Ticket: ${activeTicket.subject}`}
                        category="Support Tickets"
                        className="py-1 px-2 rounded-lg text-xs"
                      />
                      <span className="text-[10px] bg-[#4f5dc8]/10 border border-[#4f5dc8]/25 text-[#8b94e0] px-2.5 py-1 rounded-lg font-bold uppercase">{activeTicket.status}</span>
                    </div>
                  </div>

                  {/* Message log thread */}
                  <div className="flex-grow overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin' }}>
                    {/* Status timeline histories */}
                    {ticketTimeline.map((item) => (
                      <div key={item._id} className="text-[10px] text-white/20 italic text-center py-1">
                        🛠️ {item.changedByName} changed ticket {item.field} to "{item.newValue}"
                      </div>
                    ))}

                    {/* Messages */}
                    {ticketMessages.map((msg) => {
                      const isOwner = msg.sender === user?.id;
                      return (
                        <div key={msg._id} className={`flex max-w-[80%] flex-col ${isOwner ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                          <span className="text-[9px] text-white/30 mb-0.5 px-1 font-semibold">{msg.senderName} ({msg.role})</span>
                          <div
                            className="rounded-xl px-3.5 py-2 text-xs leading-relaxed"
                            style={{
                              background: isOwner ? 'rgba(79,93,200,0.08)' : 'rgba(255,255,255,0.03)',
                              border: isOwner ? '1px solid rgba(79,93,200,0.13)' : '1px solid rgba(255,255,255,0.06)',
                            }}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply text Composer */}
                  {activeTicket.status !== 'Closed' && activeTicket.status !== 'Resolved' && (
                    <div className="p-4 border-t border-white/5 flex gap-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Reply to the support team or administrator…"
                        rows={1}
                        className="input-field text-xs flex-grow resize-none"
                      />
                      <button
                        onClick={handleUserReply}
                        disabled={!replyText.trim() || sendingReply}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #4f5dc8, #6359a8)' }}
                      >
                        {sendingReply ? '…' : '➤'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!activeTicket && !showCreateForm && (
                <div className="flex-grow flex items-center justify-center text-white/20 text-xs py-10">
                  Select a filed support ticket from the sidebar list, or create a new support ticket
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: FAQ & Announcements */}
        {activeTab === 'faq' && (
          <div className="p-6 space-y-6 overflow-y-auto h-full" style={{ scrollbarWidth: 'thin' }}>
            {/* Announcements Segment */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white/60 uppercase">📢 Support System Broadcasts</h4>
              {announcements.length === 0 ? (
                <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 border-dashed text-center text-white/20 text-xs">
                  No active support bulletins or system updates published
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((ann) => (
                    <div key={ann._id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-white/80">{ann.title}</h5>
                        <span className="text-[9px] text-white/25">{format(new Date(ann.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed">{ann.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FAQ items */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white/60 uppercase">❓ Frequently Asked Questions</h4>
              <div className="space-y-3">
                {FAQ_ITEMS.map((faq, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                    <h5 className="text-xs font-bold text-[#8b94e0]">{faq.q}</h5>
                    <p className="text-xs text-white/70 leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Admin Dashboard Console */}
        {activeTab === 'admin' && isSuperAdmin && (
          <AdminSupportPanel />
        )}
      </div>
    </div>
  );
};
