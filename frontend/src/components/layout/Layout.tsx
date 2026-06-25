import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';
import { courseService } from '../../services/course.service';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    // Connect to websocket server
    const socket = io(window.location.origin, {
      withCredentials: true,
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

    // Listen to real-time assigned quizzes
    socket.on('quiz:assigned', (data: { courseId: string; topic: string; dueDate?: string }) => {
      toast.success(
        <div>
          <p className="font-bold text-xs">🔔 New Quiz Assigned!</p>
          <p className="text-[10px] text-white/70 mt-0.5">Topic: <strong>{data.topic}</strong></p>
          {data.dueDate && (
            <p className="text-[9px] text-amber-400 mt-0.5">
              Due: {new Date(data.dueDate).toLocaleDateString()}
            </p>
          )}
        </div>,
        { duration: 8000 }
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0b0f]">
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
        {/* Mobile Header */}
        <header className="flex items-center justify-between px-4 py-3 lg:hidden"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,11,15,0.95)' }}>
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white transition-all">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-base">🎓</span>
            <span className="text-sm font-bold text-white">EduMentor AI</span>
          </div>
          <div className="w-9" />
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
    </div>
  );
};
