import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';
import { courseService } from '../../services/course.service';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { LanguageSelector } from '../common/LanguageSelector';
import { Logo } from '../common/Logo';
import { useNotificationStore } from '../../store/notification.store';
import { useThemeStore } from '../../store/theme.store';
import { CommandPalette } from './CommandPalette';
import { AIAssistantWidget } from '../assistant/AIAssistantWidget';
import { preferenceService } from '../../services/preference.service';
import { ShortcutsHelpModal } from '../dashboard/ShortcutsHelpModal';
import { useAssistantStore } from '../../store/assistant.store';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();
  const { theme } = useThemeStore();
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);
  const { toggle: toggleAssistant, close: closeAssistant } = useAssistantStore();

  // Sync theme class on <html> and apply preferences
  useEffect(() => {
    if (!user) {
      const root = document.documentElement;
      if (theme === 'light') {
        root.classList.add('light');
      } else {
        root.classList.remove('light');
      }
      return;
    }

    preferenceService.get()
      .then(prefs => {
        const root = document.documentElement;
        
        // Theme
        const t = prefs.general.theme;
        if (t === 'light') {
          root.classList.add('light');
        } else if (t === 'dark') {
          root.classList.remove('light');
        } else if (t === 'system') {
          const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (systemIsDark) {
            root.classList.remove('light');
          } else {
            root.classList.add('light');
          }
        }

        // Font Size
        const fs = prefs.general.fontSize;
        if (fs === 'small') {
          root.style.fontSize = '14px';
        } else if (fs === 'large') {
          root.style.fontSize = '18px';
        } else {
          root.style.fontSize = '16px';
        }

        // Accessibility
        const acc = prefs.accessibility;
        if (acc.highContrastMode) root.classList.add('high-contrast');
        else root.classList.remove('high-contrast');

        if (acc.reducedMotion) root.classList.add('reduced-motion');
        else root.classList.remove('reduced-motion');

        if (acc.keyboardNavigation) root.classList.add('keyboard-navigation');
        else root.classList.remove('keyboard-navigation');

        if (acc.colorBlindFriendlyMode) root.classList.add('colorblind-friendly');
        else root.classList.remove('colorblind-friendly');

        setShortcutsEnabled(prefs.general.shortcutsEnabled !== false);
      })
      .catch(() => {});
  }, [user, theme]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    // Connect to websocket server
    const socket = io(window.location.origin, {
      withCredentials: true,
      query: { userId: user.id },
    });

    const joinRooms = async () => {
      try {
        if (user.role === 'student') {
          const courses = await courseService.getMy();
          courses.forEach(c => {
            socket.emit('join_course', c._id);
          });
        } else {
          const courses = await courseService.getAll();
          courses.forEach(c => {
            socket.emit('join_course', c._id);
          });
        }
      } catch (err) {
        console.warn('Failed to join course socket rooms:', err);
      }
    };

    joinRooms();

    // Listen to real-time in-app notifications (bell icon) — generic handler
    socket.on('notification:new', (data: {
      type: 'quiz_assigned' | 'live_battle' | 'document_status' | 'evaluation' | 'appointment' | 'ticket' | 'announcement' | 'office_hours' | 'message' | 'study_plan' | 'calendar';
      title: string;
      message: string;
      link?: string;
      courseCode?: string;
    }) => {
      addNotification(data);
      toast.success(
        <div>
          <p className="font-bold text-xs">🔔 {data.title}</p>
          <p className="text-[10px] text-white/70 mt-0.5">{data.message}</p>
        </div>,
        { duration: 8000 }
      );
    });

    // Listen to real-time live battles hosted by faculty (special toast with Join button)
    socket.on('quiz:live_announced', (data: { sessionId: string; topic: string; courseCode: string }) => {
      if (user?.role === 'student') {
        addNotification({
          type: 'live_battle',
          title: '⚔️ Live Quiz Battle!',
          message: `Join live battle in ${data.courseCode} on "${data.topic}"`,
          courseCode: data.courseCode,
          link: `/quiz?joinSession=${data.sessionId}`,
        });
        toast((t) => (
          <div className="flex flex-col gap-1 text-xs">
            <p className="font-bold text-white">⚔️ Live Quiz Battle Starting!</p>
            <p className="text-white/70">Join battle in <strong>{data.courseCode}</strong> on <strong>{data.topic}</strong></p>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                navigate(`/quiz?joinSession=${data.sessionId}`);
              }}
              className="btn-primary py-1.5 px-3.5 mt-1.5 text-[10px]"
            >
              Join Battle
            </button>
          </div>
        ), { duration: 15000, icon: '⚔️' });
      }
    });

    // Listen to document processing updates
    socket.on('document:status', (data: { docId: string; status: string; filename?: string }) => {
      const isDone = data.status === 'completed';
      const isFailed = data.status === 'failed';

      if (isDone || isFailed) {
        addNotification({
          type: 'document_status',
          title: isDone ? 'Document Processed' : 'Document Processing Failed',
          message: isDone
            ? `Your document "${data.filename || 'uploaded file'}" is ready for tutoring.`
            : `Failed to process "${data.filename || 'uploaded file'}".`,
          link: '/documents',
        });
        toast[isDone ? 'success' : 'error'](
          isDone
            ? `📄 Document "${data.filename || 'file'}" successfully indexed!`
            : `⚠️ Document processing failed for "${data.filename || 'file'}".`
        );
      }
    });

    // Listen to assignment evaluation completion updates
    socket.on('assignment:evaluated', (data: { studentId: string; courseId: string; score: number; fileName: string; evaluationId: string }) => {
      if (user?.id === data.studentId) {
        addNotification({
          type: 'evaluation',
          title: 'Assignment Graded',
          message: `Your assignment "${data.fileName}" was graded. Score: ${data.score}/100`,
          link: `/assignment-evaluator`,
        });
        toast.success(
          <div>
            <p className="font-bold text-xs">📋 Assignment Graded!</p>
            <p className="text-[10px] text-white/70 mt-0.5">"${data.fileName}" score: <strong className="text-emerald-400">{data.score}/100</strong></p>
          </div>,
          { duration: 8000 }
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    if (!user || !shortcutsEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && (
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.tagName === 'SELECT' ||
        active.hasAttribute('contenteditable') ||
        active.getAttribute('role') === 'textbox'
      )) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      if ((e.key === '?' && !isCtrl && !isShift) || (isCtrl && isShift && e.key === '/')) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
        return;
      }

      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        setShowShortcutsModal(false);
        closeAssistant();
        return;
      }

      if (isCtrl && isShift) {
        switch (e.key.toUpperCase()) {
          case 'N':
            e.preventDefault();
            navigate('/notes-generator');
            break;
          case 'Q':
            e.preventDefault();
            navigate('/quiz');
            break;
          case 'M':
            e.preventDefault();
            navigate('/meetings');
            break;
          case 'A':
            e.preventDefault();
            navigate('/chat');
            break;
          case 'R':
            e.preventDefault();
            navigate('/research-assistant');
            break;
          case 'S':
            e.preventDefault();
            navigate('/study-planner');
            break;
          case 'P':
            e.preventDefault();
            navigate('/profile');
            break;
          case 'C':
            e.preventDefault();
            navigate('/calendar');
            break;
          case 'D':
            e.preventDefault();
            navigate(user.role === 'student' ? '/dashboard' : '/admin');
            break;
          case 'B':
            e.preventDefault();
            navigate('/bookmarks');
            break;
          case 'H':
            e.preventDefault();
            navigate(user.role === 'student' ? '/dashboard' : '/admin');
            toast.success('💡 Recently viewed history is located on your dashboard.');
            break;
          case 'T':
            e.preventDefault();
            navigate('/activity');
            break;
          case 'U':
            e.preventDefault();
            navigate('/support');
            break;
          case 'G':
            e.preventDefault();
            toast.success('Analyzing context and generating AI Study Notes...');
            navigate('/notes-generator?generateContext=true');
            break;
        }
      } else if (isCtrl && e.key === '/') {
        e.preventDefault();
        toggleAssistant();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [user, navigate, shortcutsEnabled, closeAssistant, toggleAssistant]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Global Command Palette — available on all pages */}
      <CommandPalette />
      {showShortcutsModal && <ShortcutsHelpModal onClose={() => setShowShortcutsModal(false)} />}
      {/* Desktop Sidebar */}
      <aside className="hidden w-60 flex-shrink-0 lg:flex lg:flex-col"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 z-10"
            style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-red-500/20 border-b border-red-500/30 text-red-200 text-xs font-semibold py-2 px-4 text-center flex items-center justify-center gap-2 animate-pulse z-50">
            <span>⚠️</span>
            <span>You are currently offline. Viewing cached data. Chat querying and quiz creation are disabled.</span>
          </div>
        )}

        {/* Mobile Header */}
        <header className="flex items-center justify-between px-4 py-3 lg:hidden"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,11,15,0.95)' }}>
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white transition-all">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-sm font-bold text-white">EduMentor AI</span>
          </div>
          <div className="flex items-center">
            <LanguageSelector />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(26, 29, 39, 0.95)',
            color: '#f0f2f8',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#48bb78', secondary: 'transparent' } },
          error: { iconTheme: { primary: '#fc8181', secondary: 'transparent' } },
        }}
      />
      {/* Global AI Learning Assistant Widget — floats on every authenticated page */}
      <AIAssistantWidget />
    </div>
  );
};
