import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useChatStore } from '../store/chat.store';
import { courseService } from '../services/course.service';
import { chatService } from '../services/chat.service';
import { ChatWindow } from '../components/chat/ChatWindow';
import { Course, ChatSession } from '../types';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/uuid';
import { Loader } from '../components/common/Loader';
import { AnimatePresence } from 'framer-motion';
import { CitationViewer } from '../components/chat/CitationViewer';
import { useAuthStore } from '../store/auth.store';
import { StudyLobbyScreen } from '../components/chat/StudyLobbyScreen';

export const ChatPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const { selectedCourse, setSelectedCourse, clearChat, currentChatId, setCurrentChatId, loadMessages, activeCitation, setActiveCitation } = useChatStore();
  const { user } = useAuthStore();
  const [activeChatTab, setActiveChatTab] = useState<'tutor' | 'lobby'>('tutor');
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const [allCourses, history] = await Promise.all([
          courseService.getAll(),
          chatService.getHistory(),
        ]);
        setCourses(allCourses);
        setChatHistory(history);
        if (allCourses.length > 0 && !selectedCourse) {
          setSelectedCourse(allCourses[0]);
        }
      } catch (err) {
        toast.error('Failed to load courses');
      } finally {
        setIsLoadingCourses(false);
      }
    };
    loadCourses();
  }, []);

  // Synchronize currentChatId to URL search params
  useEffect(() => {
    if (currentChatId) {
      const activeId = searchParams.get('chatId');
      if (activeId !== currentChatId) {
        setSearchParams({ chatId: currentChatId });
        refreshHistory();
      }
    }
  }, [currentChatId, searchParams, setSearchParams]);

  // Load specific chat if chatId param present
  useEffect(() => {
    const chatId = searchParams.get('chatId');
    if (chatId) {
      loadChat(chatId);
    }
  }, [searchParams]);

  const loadChat = async (chatId: string) => {
    try {
      const chat = await chatService.getById(chatId);
      setCurrentChatId(chatId);
      if (chat.course) {
        const course = courses.find(c => c._id === (typeof chat.course === 'string' ? chat.course : chat.course._id));
        if (course) setSelectedCourse(course);
      }
      const messages = chat.messages.map((m: any, i: number) => ({
        id: `msg_${i}`,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
        trustScore: m.trustScore,
        confidenceScore: m.confidenceScore,
        explainability: m.sources && m.sources.length > 0 ? {
          sources: m.sources.map((s: any, idx: number) => ({
            rank: idx + 1,
            documentName: s.documentName,
            pageNumber: s.pageNumber,
            excerpt: s.chunkText,
            relevanceScore: s.score,
            confidencePercent: Math.round(s.score * 100),
          })),
          overallConfidence: m.confidenceScore || 0,
          retrievalMethod: 'Hybrid (Vector + BM25)',
          explanationSummary: 'Source passages cited from course documents.',
        } : undefined,
        hallucination: m.trustScore !== undefined ? {
          trustScore: m.trustScore,
          status: m.trustScore >= 75 ? 'verified' : m.trustScore >= 45 ? 'partially_verified' : 'hallucinated',
          verdict: m.trustScore >= 75 
            ? 'Response is highly consistent with course materials.' 
            : m.trustScore >= 45 
            ? 'Response is partially consistent but may contain unverified statements.' 
            : 'Response contains major inconsistencies with course materials.',
          flags: m.hallucinationFlags || [],
        } : undefined,
      }));
      loadMessages(messages);
    } catch (err) {
      toast.error('Failed to load chat');
    }
  };

  const handleNewChat = () => {
    clearChat();
    setSearchParams({});
  };

  const refreshHistory = async () => {
    try {
      const history = await chatService.getHistory();
      setChatHistory(history);
    } catch (err) {}
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat session?')) return;
    try {
      await chatService.delete(chatId);
      setChatHistory(prev => prev.filter(c => c._id !== chatId));
      const activeChatId = searchParams.get('chatId');
      if (activeChatId === chatId) {
        handleNewChat();
      }
      toast.success('Chat deleted');
    } catch (err) {
      toast.error('Failed to delete chat');
    }
  };

  if (isLoadingCourses) {
    return <Loader message="Initializing AI Chat Tutor..." />;
  }

  const renderLeftPanel = () => (
    <div className="flex h-full flex-col">
      {/* Toggle Mode */}
      <div className="p-3 border-b border-white/5 grid grid-cols-2 gap-1.5">
        <button
          onClick={() => { setActiveChatTab('tutor'); setLeftPanelOpen(false); }}
          className="py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: activeChatTab === 'tutor' ? 'rgba(255,255,255,0.05)' : 'transparent',
            color: activeChatTab === 'tutor' ? '#fff' : 'rgba(255,255,255,0.4)',
          }}
        >
          💬 Tutor
        </button>
        <button
          onClick={() => { setActiveChatTab('lobby'); setLeftPanelOpen(false); }}
          className="py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: activeChatTab === 'lobby' ? 'rgba(255,255,255,0.05)' : 'transparent',
            color: activeChatTab === 'lobby' ? '#fff' : 'rgba(255,255,255,0.4)',
          }}
        >
          👥 Lobbies
        </button>
      </div>

      {/* Course Selector */}
      <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">Course</p>
        <select
          value={selectedCourse?._id || ''}
          onChange={e => {
            const course = courses.find(c => c._id === e.target.value);
            if (course) { setSelectedCourse(course); clearChat(); }
            setLeftPanelOpen(false);
          }}
          className="input-field text-xs py-2">
          {courses.map(c => <option key={c._id} value={c._id} className="bg-[#1a1d27]">{c.title}</option>)}
        </select>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button onClick={() => { handleNewChat(); setLeftPanelOpen(false); }} className="btn-primary w-full py-2 text-xs">
          + New Chat
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">Recent</p>
        {chatHistory.slice(0, 20).map(chat => (
          <div key={chat._id} onClick={() => { loadChat(chat._id); setLeftPanelOpen(false); }}
            className="w-full rounded-xl p-3 text-left text-xs transition-all cursor-pointer flex items-center justify-between group"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,99,255,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-white/70">{chat.title}</p>
              <p className="text-[10px] text-white/30">{formatDate(chat.updatedAt)}</p>
            </div>
            <button
              onClick={(e) => handleDeleteChat(chat._id, e)}
              className="text-white/20 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-0px)] lg:h-screen">
      {/* Left Panel: Course Selector + Chat History */}
      {/* Desktop Panel */}
      <div className="hidden w-64 flex-shrink-0 flex-col lg:flex"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)', background: '#0a0b0f' }}>
        {renderLeftPanel()}
      </div>

      {/* Mobile Panel Overlay Drawer */}
      {leftPanelOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setLeftPanelOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 z-10 bg-[#111318]"
            style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            {renderLeftPanel()}
          </aside>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex flex-1 overflow-hidden min-w-0">
        <div className="flex flex-col flex-1">
          {activeChatTab === 'lobby' ? (
            <div className="p-6 overflow-y-auto w-full">
              <StudyLobbyScreen
                courses={courses}
                studentName={user?.name || 'Student'}
                onClose={() => setActiveChatTab('tutor')}
              />
            </div>
          ) : selectedCourse ? (
            <ChatWindow course={selectedCourse} onRefreshHistory={refreshHistory} onToggleLeftPanel={() => setLeftPanelOpen(!leftPanelOpen)} />
          ) : (
            <div className="flex h-full items-center justify-center text-center p-8">
              <div>
                <div className="mb-4 text-4xl">📚</div>
                <h3 className="text-lg font-semibold text-white">No courses found</h3>
                <p className="mt-2 text-sm text-white/40">Ask your faculty to create and upload course materials.</p>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Citation Split Panel */}
        <AnimatePresence>
          {activeCitation && (
            <CitationViewer citation={activeCitation} onClose={() => setActiveCitation(null)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
