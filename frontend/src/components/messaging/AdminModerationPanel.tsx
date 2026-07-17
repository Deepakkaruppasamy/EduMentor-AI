import React, { useState, useEffect } from 'react';
import { messagingService } from '../../services/messaging.service';
import { MsgConversation, MsgMessage, MsgDiscussion, MsgDiscussionReply } from '../../types/messaging.types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { ImagePreview } from './ImagePreview';
import { FileAttachment } from './FileAttachment';
import { ReplyPreview } from './ReplyPreview';

export const AdminModerationPanel: React.FC = () => {
  const [subTab, setSubTab] = useState<'chats' | 'discussions' | 'aichats' | 'quizzes' | 'users'>('chats');

  // Conversations state
  const [conversations, setConversations] = useState<MsgConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<MsgConversation | null>(null);
  const [messages, setMessages] = useState<MsgMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Discussions state
  const [courses, setCourses] = useState<{ _id: string; title: string; code: string }[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [discussions, setDiscussions] = useState<MsgDiscussion[]>([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState<MsgDiscussion | null>(null);
  const [replies, setReplies] = useState<MsgDiscussionReply[]>([]);
  const [loadingDiscussions, setLoadingDiscussions] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  // AI Chats audit state
  const [aiSessions, setAiSessions] = useState<any[]>([]);
  const [selectedAiSession, setSelectedAiSession] = useState<any>(null);
  const [loadingAiSessions, setLoadingAiSessions] = useState(false);

  // Quizzes audit state
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    setSelectedConv(null);
    setSelectedDiscussion(null);
    setSelectedAiSession(null);
    setSelectedQuiz(null);

    if (subTab === 'chats') {
      loadConversations();
    } else if (subTab === 'discussions') {
      loadCourses();
    } else if (subTab === 'aichats') {
      loadAiSessions();
    } else if (subTab === 'quizzes') {
      loadQuizzes();
    } else if (subTab === 'users') {
      loadUsers();
    }
  }, [subTab]);

  useEffect(() => {
    if (selectedCourse && subTab === 'discussions') {
      loadDiscussions();
    }
  }, [selectedCourse]);

  const loadConversations = async () => {
    try {
      const res = await messagingService.getConversationsAdmin();
      setConversations(res.data.data || []);
    } catch (err) {
      console.error('Failed to load admin conversations:', err);
      toast.error('Failed to load conversations list');
    }
  };

  const loadMessages = async (convId: string) => {
    setLoadingMessages(true);
    try {
      const res = await messagingService.getMessagesAdmin(convId);
      setMessages(res.data.data || []);
    } catch (err) {
      console.error('Failed to load admin messages:', err);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

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
    setLoadingDiscussions(true);
    try {
      const res = await messagingService.getCourseDiscussions(selectedCourse);
      setDiscussions(res.data.data || []);
    } catch (err) {
      console.error('Failed to load discussions:', err);
    } finally {
      setLoadingDiscussions(false);
    }
  };

  const loadReplies = async (discId: string) => {
    setLoadingReplies(true);
    try {
      const res = await messagingService.getDiscussion(discId);
      setReplies(res.data.data.replies || []);
    } catch (err) {
      console.error('Failed to load discussion replies:', err);
    } finally {
      setLoadingReplies(false);
    }
  };

  const loadAiSessions = async () => {
    setLoadingAiSessions(true);
    try {
      const res = await messagingService.getChatSessionsAdmin();
      setAiSessions(res.data.data || []);
    } catch (err) {
      console.error('Failed to load AI sessions:', err);
    } finally {
      setLoadingAiSessions(false);
    }
  };

  const loadAiMessages = async (sessionId: string) => {
    try {
      const res = await messagingService.getChatMessagesAdmin(sessionId);
      setSelectedAiSession(res.data.data);
    } catch (err) {
      console.error('Failed to load AI message logs:', err);
    }
  };

  const loadQuizzes = async () => {
    setLoadingQuizzes(true);
    try {
      const res = await messagingService.getQuizzesAdmin();
      setQuizzes(res.data.data || []);
    } catch (err) {
      console.error('Failed to load Quizzes attempts:', err);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const loadQuizDetail = async (quizId: string) => {
    try {
      const res = await messagingService.getQuizDetailAdmin(quizId);
      setSelectedQuiz(res.data.data);
    } catch (err) {
      console.error('Failed to load quiz details:', err);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/admin/users');
      const list = res.data?.users || res.data?.data || res.data || [];
      setUsers(list);
    } catch (err) {
      console.error('Failed to load users list:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSelectConv = (conv: MsgConversation) => {
    setSelectedConv(conv);
    loadMessages(conv._id);
  };

  const handleSelectDiscussion = (disc: MsgDiscussion) => {
    setSelectedDiscussion(disc);
    loadReplies(disc._id);
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm('Delete this message as administrator? This will remove the message permanently for both sender and recipient.')) return;
    try {
      await messagingService.deleteMessageAdmin(msgId);
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
      toast.success('Message deleted as admin');
      loadConversations();
    } catch (err) {
      toast.error('Failed to delete message');
    }
  };

  const handleDeleteDiscussion = async (discId: string) => {
    if (!window.confirm('Delete this entire discussion board post and all associated replies? This cannot be undone.')) return;
    try {
      await messagingService.deleteDiscussionAdmin(discId);
      setDiscussions((prev) => prev.filter((d) => d._id !== discId));
      setSelectedDiscussion(null);
      toast.success('Discussion deleted as admin');
    } catch (err) {
      toast.error('Failed to delete discussion');
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!window.confirm('Delete this discussion reply?')) return;
    try {
      await messagingService.deleteDiscussionReplyAdmin(replyId);
      setReplies((prev) => prev.filter((r) => r._id !== replyId));
      toast.success('Reply deleted as admin');
    } catch (err) {
      toast.error('Failed to delete reply');
    }
  };

  const handleDeleteAiChat = async (sessionId: string) => {
    if (!window.confirm('Delete this Student-AI Chat conversation record? This will delete it permanently.')) return;
    try {
      await messagingService.deleteChatAdmin(sessionId);
      setAiSessions((prev) => prev.filter((s) => s._id !== sessionId));
      setSelectedAiSession(null);
      toast.success('AI Chat session deleted');
    } catch (err) {
      toast.error('Failed to delete AI chat session');
    }
  };

  const handleDeleteQuizAttempt = async (quizId: string) => {
    if (!window.confirm('Delete this Student Quiz attempt record?')) return;
    try {
      await messagingService.deleteQuizAdmin(quizId);
      setQuizzes((prev) => prev.filter((q) => q._id !== quizId));
      setSelectedQuiz(null);
      toast.success('Quiz attempt deleted');
    } catch (err) {
      toast.error('Failed to delete quiz attempt');
    }
  };

  const handleToggleRestrict = async (userId: string, currentStatus: boolean) => {
    try {
      await messagingService.restrictUserMessaging(userId, !currentStatus);
      toast.success('User permissions updated');
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isMessagingRestricted: !currentStatus } : u))
      );
    } catch (err) {
      toast.error('Failed to update user privileges');
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col">
      {/* Sub tabs */}
      <div className="px-5 py-3 border-b border-white/5 flex gap-2 flex-wrap" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <button
          onClick={() => setSubTab('chats')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
            subTab === 'chats' ? 'bg-[#4f5dc8]/15 text-[#8b94e0]' : 'text-white/40 hover:text-white/60'
          }`}
        >
          💬 Private Chats Log
        </button>
        <button
          onClick={() => setSubTab('discussions')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
            subTab === 'discussions' ? 'bg-[#4f5dc8]/15 text-[#8b94e0]' : 'text-white/40 hover:text-white/60'
          }`}
        >
          🗣️ Public Discussions
        </button>
        <button
          onClick={() => setSubTab('aichats')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
            subTab === 'aichats' ? 'bg-[#4f5dc8]/15 text-[#8b94e0]' : 'text-white/40 hover:text-white/60'
          }`}
        >
          🧙‍♂️ AI Tutor Chat Logs
        </button>
        <button
          onClick={() => setSubTab('quizzes')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
            subTab === 'quizzes' ? 'bg-[#4f5dc8]/15 text-[#8b94e0]' : 'text-white/40 hover:text-white/60'
          }`}
        >
          📝 Quiz Attempts Log
        </button>
        <button
          onClick={() => setSubTab('users')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
            subTab === 'users' ? 'bg-[#4f5dc8]/15 text-[#8b94e0]' : 'text-white/40 hover:text-white/60'
          }`}
        >
          🔒 Permissions
        </button>
      </div>

      {/* Pane container */}
      <div className="flex-1 flex min-h-0">
        {/* Chats Tab */}
        {subTab === 'chats' && (
          <>
            <div className="w-[300px] border-r border-white/5 flex flex-col overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {conversations.length === 0 ? (
                <div className="p-5 text-center text-white/20 text-xs">No active chats in the system</div>
              ) : (
                conversations.map((conv) => {
                  const student = conv.participants?.find((p) => p.role === 'student');
                  const faculty = conv.participants?.find((p) => p.role === 'faculty');
                  const isActive = selectedConv?._id === conv._id;

                  return (
                    <button
                      key={conv._id}
                      onClick={() => handleSelectConv(conv)}
                      className={`w-full p-4 border-b border-white/5 text-left transition-all ${
                        isActive ? 'bg-white/5' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="text-xs font-bold text-[#8b94e0] truncate">
                        👤 {student?.name || 'Unknown student'}
                      </div>
                      <div className="text-[10px] text-white/40 mt-1 truncate">
                        ↔️ Faculty: {faculty?.name || 'Unknown faculty'}
                      </div>
                      <div className="text-[10px] text-white/35 truncate mt-1">
                        {conv.lastMessage?.content || `[${conv.lastMessage?.messageType || 'Attachment'}]`}
                      </div>
                      <div className="text-[9px] text-white/20 mt-1.5 text-right">
                        {conv.lastMessageAt ? format(new Date(conv.lastMessageAt), 'MMM d, h:mm a') : ''}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              {selectedConv ? (
                <>
                  <div className="px-5 py-3 border-b border-white/5" style={{ background: 'rgba(255,255,255,0.01)' }}>
                    <div className="text-xs font-semibold text-white/80">
                      Private Chat Log: {selectedConv.participants?.map((p) => `${p.name} (${p.role})`).join(' ↔️ ')}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin' }}>
                    {loadingMessages ? (
                      <div className="text-center py-10 text-xs text-white/30">Loading messages…</div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-10 text-xs text-white/20">No messages in this chat</div>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg._id} className="flex items-start justify-between gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] group hover:bg-white/[0.04] transition-all">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-semibold text-[#8b94e0]">{msg.sender?.name}</span>
                              <span className="text-[9px] text-white/25 capitalize">{msg.sender?.role}</span>
                              <span className="text-[9px] text-white/20">•</span>
                              <span className="text-[9px] text-white/20">{format(new Date(msg.createdAt), 'MMM d, h:mm a')}</span>
                            </div>

                            {msg.replyTo && <ReplyPreview replyTo={msg.replyTo} />}

                            {msg.content && (
                              <p className="text-sm text-white/85 break-words leading-relaxed">{msg.content}</p>
                            )}

                            {msg.attachments?.filter((a) => a.fileType?.startsWith('image/')).map((att, i) => (
                              <div key={i} className="mt-2"><ImagePreview src={att.url} alt={att.filename} /></div>
                            ))}

                            {msg.attachments?.filter((a) => a.fileType?.startsWith('audio/')).map((att, i) => (
                              <div key={i} className="mt-2">
                                <audio controls className="max-w-full h-8"><source src={att.url} type={att.fileType} /></audio>
                              </div>
                            ))}

                            {msg.attachments?.filter((a) => !a.fileType?.startsWith('image/') && !a.fileType?.startsWith('audio/')).map((att, i) => (
                              <div key={i} className="mt-2"><FileAttachment attachment={att} /></div>
                            ))}
                          </div>
                          <button
                            onClick={() => handleDeleteMessage(msg._id)}
                            className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 border border-red-500/20 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            🗑️
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
                  Select a private chat log from the sidebar to inspect messages and files
                </div>
              )}
            </div>
          </>
        )}

        {/* Discussions Tab */}
        {subTab === 'discussions' && (
          <>
            <div className="w-[300px] border-r border-white/5 flex flex-col overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              <div className="p-4 border-b border-white/5">
                <label className="block text-[10px] text-white/40 font-semibold mb-1">AUDIT COURSE DISCUSSIONS</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/[0.08] text-white/80 outline-none focus:border-[#4f5dc8]/35 appearance-none"
                >
                  {courses.map((c) => (
                    <option key={c._id} value={c._id} className="bg-[#111318]">{c.code} — {c.title}</option>
                  ))}
                </select>
              </div>

              {loadingDiscussions ? (
                <div className="p-5 text-center text-xs text-white/20">Loading discussions…</div>
              ) : discussions.length === 0 ? (
                <div className="p-5 text-center text-xs text-white/20">No discussions for this course</div>
              ) : (
                discussions.map((disc) => {
                  const isActive = selectedDiscussion?._id === disc._id;
                  return (
                    <button
                      key={disc._id}
                      onClick={() => handleSelectDiscussion(disc)}
                      className={`w-full p-4 border-b border-white/5 text-left transition-all ${
                        isActive ? 'bg-white/5' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">{disc.category}</span>
                        {disc.isResolved && <span className="text-[9px] text-green-400">✓ Resolved</span>}
                      </div>
                      <div className="text-xs font-bold text-white/80 truncate">{disc.title}</div>
                      <div className="text-[10px] text-white/30 truncate mt-1">by {disc.author?.name} • {disc.replyCount} replies</div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              {selectedDiscussion ? (
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                  <div className="p-5 border-b border-white/5 bg-white/[0.01] flex justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] bg-[#4f5dc8]/15 text-[#8b94e0] px-2 py-0.5 rounded font-medium">{selectedDiscussion.category}</span>
                        {selectedDiscussion.isResolved && (
                          <span className="text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded font-medium">✓ Resolved</span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white/90">{selectedDiscussion.title}</h4>
                      <p className="text-xs text-white/60 mt-2 leading-relaxed">{selectedDiscussion.content}</p>
                      <div className="text-[10px] text-white/35 mt-2">
                        by {selectedDiscussion.author?.name} on {format(new Date(selectedDiscussion.createdAt), 'MM/dd/yyyy h:mm a')}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDiscussion(selectedDiscussion._id)}
                      className="h-8 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1 flex-shrink-0"
                    >
                      🗑️ Delete Post
                    </button>
                  </div>

                  <div className="p-5 flex-1 space-y-4">
                    <h5 className="text-xs font-semibold text-white/40 mb-2">Replies Audit</h5>
                    {loadingReplies ? (
                      <div className="text-center py-6 text-xs text-white/20">Loading replies…</div>
                    ) : replies.length === 0 ? (
                      <div className="text-center py-6 text-xs text-white/20">No replies on this discussion board</div>
                    ) : (
                      replies.map((reply) => (
                        <div key={reply._id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white/[0.01] border border-white/5 group hover:bg-white/[0.03]">
                          <div className="min-w-0 flex-1" style={{ marginLeft: reply.depth * 16 }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-[#8b94e0]">{reply.author?.name}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-white/40 capitalize">{reply.author?.role}</span>
                              <span className="text-[9px] text-white/20">{format(new Date(reply.createdAt), 'MMM d, h:mm a')}</span>
                            </div>
                            <p className="text-xs text-white/70 leading-relaxed">{reply.content}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteReply(reply._id)}
                            className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 border border-red-500/20 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          >
                            🗑️
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
                  Select a discussion topic from the sidebar to inspect replies and moderation status
                </div>
              )}
            </div>
          </>
        )}

        {/* AI Tutor Chat Logs Tab */}
        {subTab === 'aichats' && (
          <>
            <div className="w-[300px] border-r border-white/5 flex flex-col overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {loadingAiSessions ? (
                <div className="p-5 text-center text-xs text-white/20">Loading AI chats…</div>
              ) : aiSessions.length === 0 ? (
                <div className="p-5 text-center text-xs text-white/20">No student AI chat history available</div>
              ) : (
                aiSessions.map((session) => {
                  const isSessionActive = selectedAiSession?._id === session._id;
                  return (
                    <button
                      key={session._id}
                      onClick={() => { setSelectedAiSession(null); loadAiMessages(session._id); }}
                      className={`w-full p-4 border-b border-white/5 text-left transition-all ${
                        isSessionActive ? 'bg-white/5' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="text-xs font-bold text-[#8b94e0] truncate">👤 {session.user?.name || 'Unknown Student'}</div>
                      <div className="text-[10px] text-white/40 mt-1 truncate">📖 Course: {session.course?.code}</div>
                      <div className="text-[10px] text-white/35 mt-1 truncate">Title: "{session.title}"</div>
                      <div className="text-[9px] text-white/20 mt-1.5 text-right">{format(new Date(session.updatedAt), 'MMM d, h:mm a')}</div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              {selectedAiSession ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="px-5 py-4 border-b border-white/5 bg-white/[0.01] flex justify-between items-center gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-white/80">AI Chat Session: "{selectedAiSession.title}"</h4>
                      <div className="text-[10px] text-white/30 mt-1">Student: {selectedAiSession.user?.name} ({selectedAiSession.user?.email})</div>
                    </div>
                    <button
                      onClick={() => handleDeleteAiChat(selectedAiSession._id)}
                      className="h-8 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold"
                    >
                      🗑️ Delete Chat Log
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin' }}>
                    {selectedAiSession.messages?.map((msg: any, i: number) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div key={i} className={`flex flex-col max-w-[85%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                          <div className="text-[9px] text-white/30 mb-0.5 px-1 capitalize">{msg.role}</div>
                          <div
                            className="rounded-2xl px-4 py-2.5 text-xs leading-relaxed"
                            style={{
                              background: isUser ? 'rgba(79, 93, 200, 0.10)' : 'rgba(255, 255, 255, 0.05)',
                              border: isUser ? '1px solid rgba(79, 93, 200, 0.16)' : '1px solid rgba(255, 255, 255, 0.07)',
                            }}
                          >
                            {msg.content}

                            {/* Show trust & confidence scores inside AI responses */}
                            {!isUser && (msg.trustScore !== undefined || msg.confidenceScore !== undefined) && (
                              <div className="mt-2 pt-2 border-t border-white/5 flex gap-3 text-[9px] text-white/30 font-semibold">
                                {msg.trustScore !== undefined && <span>🛡️ Trust Score: {msg.trustScore}</span>}
                                {msg.confidenceScore !== undefined && <span>🎯 Confidence: {msg.confidenceScore}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
                  Select a student AI chat session from the sidebar to inspect tutor logs
                </div>
              )}
            </div>
          </>
        )}

        {/* Quiz Attempts Tab */}
        {subTab === 'quizzes' && (
          <>
            <div className="w-[300px] border-r border-white/5 flex flex-col overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {loadingQuizzes ? (
                <div className="p-5 text-center text-xs text-white/20">Loading quizzes…</div>
              ) : quizzes.length === 0 ? (
                <div className="p-5 text-center text-xs text-white/20">No quiz attempt logs available</div>
              ) : (
                quizzes.map((quiz) => {
                  const isQuizActive = selectedQuiz?._id === quiz._id;
                  return (
                    <button
                      key={quiz._id}
                      onClick={() => { setSelectedQuiz(null); loadQuizDetail(quiz._id); }}
                      className={`w-full p-4 border-b border-white/5 text-left transition-all ${
                        isQuizActive ? 'bg-white/5' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="text-xs font-bold text-[#8b94e0] truncate">👤 {quiz.student?.name || 'Unknown Student'}</div>
                      <div className="text-[10px] text-white/40 mt-1 truncate">📖 Course: {quiz.course?.code}</div>
                      <div className="text-[10px] text-white/35 mt-1 truncate">Topic: "{quiz.title}"</div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[9px] text-green-400 font-semibold">Score: {quiz.score}/{quiz.maxScore}</span>
                        <span className="text-[9px] text-white/20">{format(new Date(quiz.createdAt), 'MM/dd/yyyy')}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              {selectedQuiz ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="px-5 py-4 border-b border-white/5 bg-white/[0.01] flex justify-between items-center gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-white/80">Quiz Audit: "{selectedQuiz.title}"</h4>
                      <div className="text-[10px] text-white/30 mt-1">Student: {selectedQuiz.student?.name} • Score achieved: <span className="text-green-400 font-bold">{selectedQuiz.score}/{selectedQuiz.maxScore}</span></div>
                    </div>
                    <button
                      onClick={() => handleDeleteQuizAttempt(selectedQuiz._id)}
                      className="h-8 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold"
                    >
                      🗑️ Delete Quiz Log
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin' }}>
                    {selectedQuiz.questions?.map((q: any, i: number) => (
                      <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">Q{i + 1}</span>
                          <span className="text-[10px] text-white/30 capitalize">Difficulty: {q.difficulty}</span>
                          {q.isCorrect !== undefined && (
                            <span className={`text-[9px] font-bold ml-auto px-1.5 py-0.2 rounded ${q.isCorrect ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                              {q.isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-white/90">{q.question}</p>

                        {/* Options list */}
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 gap-1.5 mt-2">
                            {q.options.map((opt: any) => {
                              const isSelected = opt.label === q.studentAnswer;
                              const isCorrectOption = opt.isCorrect;
                              return (
                                <div
                                  key={opt.label}
                                  className="px-3 py-2 rounded-lg text-xs flex justify-between border"
                                  style={{
                                    background: isSelected
                                      ? isCorrectOption
                                        ? 'rgba(52,168,122,0.15)'
                                        : 'rgba(192,82,74,0.15)'
                                      : 'rgba(255,255,255,0.01)',
                                    borderColor: isSelected
                                      ? isCorrectOption
                                        ? 'rgba(52,168,122,0.3)'
                                        : 'rgba(192,82,74,0.3)'
                                      : isCorrectOption
                                        ? 'rgba(52,168,122,0.4)'
                                        : 'rgba(255,255,255,0.05)',
                                  }}
                                >
                                  <span>{opt.label}. {opt.text}</span>
                                  {isCorrectOption && <span className="text-green-400 font-bold text-[9px] uppercase">Correct Option</span>}
                                  {isSelected && !isCorrectOption && <span className="text-red-400 font-bold text-[9px] uppercase">Selected</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.explanation && (
                          <div className="mt-2 p-2.5 rounded bg-white/[0.02] border-l-2 border-[#4f5dc8] text-[10px] text-white/50 leading-relaxed">
                            <span className="font-semibold text-white/70 block mb-0.5">Explanation:</span>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
                  Select a student quiz attempt log from the sidebar to inspect questions, answers, and evaluations
                </div>
              )}
            </div>
          </>
        )}

        {/* User Permissions Tab */}
        {subTab === 'users' && (
          <div className="flex-1 flex flex-col p-5 overflow-hidden">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search users by name or email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="input-field max-w-md text-xs"
              />
            </div>

            <div className="flex-1 overflow-y-auto border border-white/5 rounded-xl" style={{ scrollbarWidth: 'thin' }}>
              {loadingUsers ? (
                <div className="p-8 text-center text-xs text-white/30">Loading user list…</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-white/20">No users found</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-white/55 border-b border-white/5">
                      <th className="p-3.5 font-semibold">User</th>
                      <th className="p-3.5 font-semibold">Email</th>
                      <th className="p-3.5 font-semibold">Role</th>
                      <th className="p-3.5 font-semibold">Department</th>
                      <th className="p-3.5 font-semibold text-center">Messaging Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u._id} className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors">
                        <td className="p-3.5 font-medium text-white/80">{u.name}</td>
                        <td className="p-3.5 text-white/50">{u.email}</td>
                        <td className="p-3.5 capitalize text-white/50">{u.role}</td>
                        <td className="p-3.5 text-white/40">{u.department || 'N/A'}</td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggleRestrict(u._id, !!u.isMessagingRestricted)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
                              u.isMessagingRestricted
                                ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                            }`}
                          >
                            {u.isMessagingRestricted ? '🔴 Restricted (Click to Grant)' : '🟢 Allowed (Click to Restrict)'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
