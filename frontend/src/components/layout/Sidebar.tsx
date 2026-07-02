import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/auth.store';
import toast from 'react-hot-toast';
import { Logo } from '../common/Logo';
import { LanguageSelector } from '../common/LanguageSelector';
import { useNotificationStore } from '../../store/notification.store';
import { NotificationDrawer } from './NotificationDrawer';
import { AvatarFrame } from '../avatar/AvatarFrame';
import { AnimatePresence } from 'framer-motion';
import { GlobalSearchBar } from './GlobalSearchBar';
import { useThemeStore } from '../../store/theme.store';

const STUDENT_LINKS = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/chat', icon: '💬', label: 'AI Chat Tutor' },
  { to: '/messages', icon: '✉️', label: 'Messages' },
  { to: '/announcements', icon: '📣', label: 'Announcements' },
  { to: '/support', icon: '🛠️', label: 'Support Center' },
  { to: '/meetings', icon: '📅', label: 'Meeting Scheduler' },
  { to: '/office-hours', icon: '🏫', label: 'Office Hours' },
  { to: '/study-planner', icon: '🗓️', label: 'AI Study Planner' },
  { to: '/calendar', icon: '📆', label: 'Academic Calendar' },
  { to: '/notes-generator', icon: '📓', label: 'Notes Generator' },
  { to: '/research-assistant', icon: '🔬', label: 'Research Assistant' },
  { to: '/quiz', icon: '📝', label: 'Quiz Generator' },
  { to: '/flashcards', icon: '🎴', label: 'Flashcards' },
  { to: '/courses', icon: '📚', label: 'My Courses' },
  { to: '/recommendations', icon: '🎯', label: 'Recommendations' },
  { to: '/reports', icon: '🖨️', label: 'AI Reports' },
  { to: '/assignment-evaluator', icon: '📋', label: 'Assignment Evaluator' },
  { to: '/plagiarism-checker', icon: '🔍', label: 'Plagiarism Checker' },
  { to: '/activity', icon: '📅', label: 'Activity Timeline' },
  { to: '/sessions', icon: '🛡️', label: 'Active Sessions' },
  { to: '/privacy-security', icon: '🔒', label: 'Privacy & Security' },
  { to: '/preferences', icon: '⚙️', label: 'Preferences' },
  { to: '/bookmarks', icon: '🔖', label: 'Bookmarks & Favorites' },
  { to: '/profile', icon: '👤', label: 'My Profile' },
  { to: '/avatar-settings', icon: '🎭', label: 'Avatar Studio' },
  { to: '/feedback', icon: '💬', label: 'Feedback Center' },
  { to: '/rate-platform', icon: '⭐', label: 'Rate Platform' },
];

const FACULTY_LINKS = [
  { to: '/admin', icon: '📈', label: 'Dashboard' },
  { to: '/messages', icon: '✉️', label: 'Messages' },
  { to: '/announcements', icon: '📣', label: 'Announcements' },
  { to: '/support', icon: '🛠️', label: 'Support Center' },
  { to: '/meetings', icon: '📅', label: 'Meeting Scheduler' },
  { to: '/office-hours', icon: '🏫', label: 'Office Hours' },
  { to: '/calendar', icon: '📆', label: 'Academic Calendar' },
  { to: '/notes-generator', icon: '📓', label: 'Notes Generator' },
  { to: '/research-assistant', icon: '🔬', label: 'Research Assistant' },
  { to: '/courses', icon: '📚', label: 'Manage Courses' },
  { to: '/documents', icon: '📁', label: 'Upload Documents' },
  { to: '/quiz', icon: '⚔️', label: 'Quiz Battle Arena' },
  { to: '/gradebook', icon: '📒', label: 'Gradebook' },
  { to: '/analytics', icon: '📊', label: 'Analytics' },
  { to: '/faculty-ai-assistant', icon: '🧙‍♂️', label: 'Faculty AI Assistant' },
  { to: '/reports', icon: '🖨️', label: 'AI Reports' },
  { to: '/assignment-evaluator', icon: '📋', label: 'Assignment Evaluator' },
  { to: '/plagiarism-checker', icon: '🔍', label: 'Plagiarism Checker' },
  { to: '/activity', icon: '📅', label: 'Activity Timeline' },
  { to: '/sessions', icon: '🛡️', label: 'Active Sessions' },
  { to: '/privacy-security', icon: '🔒', label: 'Privacy & Security' },
  { to: '/preferences', icon: '⚙️', label: 'Preferences' },
  { to: '/bookmarks', icon: '🔖', label: 'Bookmarks & Favorites' },
  { to: '/profile', icon: '👤', label: 'My Profile' },
  { to: '/avatar-settings', icon: '🎭', label: 'Avatar Studio' },
  { to: '/feedback', icon: '💬', label: 'Feedback Center' },
  { to: '/rate-platform', icon: '⭐', label: 'Rate Platform' },
];

const ADMIN_LINKS = [
  { to: '/admin', icon: '📈', label: 'Dashboard' },
  { to: '/messages', icon: '✉️', label: 'Messages' },
  { to: '/announcements', icon: '📣', label: 'Announcements' },
  { to: '/support', icon: '🛠️', label: 'Support Center' },
  { to: '/meetings', icon: '📅', label: 'Meeting Scheduler' },
  { to: '/office-hours', icon: '🏫', label: 'Office Hours' },
  { to: '/calendar', icon: '📆', label: 'Academic Calendar' },
  { to: '/chat', icon: '💬', label: 'AI Chat Tutor' },
  { to: '/quiz', icon: '📝', label: 'Quiz Generator' },
  { to: '/flashcards', icon: '🎴', label: 'Flashcards' },
  { to: '/recommendations', icon: '🎯', label: 'Recommendations' },
  { to: '/assignment-evaluator', icon: '📋', label: 'Assignment Evaluator' },
  { to: '/admin/users', icon: '👥', label: 'User Directory' },
  { to: '/courses', icon: '📚', label: 'Manage Courses' },
  { to: '/documents', icon: '📁', label: 'Upload Documents' },
  { to: '/gradebook', icon: '📒', label: 'Gradebook' },
  { to: '/analytics', icon: '📊', label: 'Analytics' },
  { to: '/faculty-ai-assistant', icon: '🧙‍♂️', label: 'Faculty AI Assistant' },
  { to: '/reports', icon: '🖨️', label: 'AI Reports' },
  { to: '/plagiarism-checker', icon: '🔍', label: 'Plagiarism Checker' },
  { to: '/profile', icon: '👤', label: 'My Profile' },
  { to: '/avatar-settings', icon: '🎭', label: 'Avatar Studio' },
  { to: '/feedback', icon: '💬', label: 'Feedback Center' },
  { to: '/ai-evaluation', icon: '🧪', label: 'AI Evaluation' },
  { to: '/activity', icon: '📅', label: 'Activity Timeline' },
  { to: '/sessions', icon: '🛡️', label: 'Active Sessions' },
  { to: '/privacy-security', icon: '🔒', label: 'Privacy & Security' },
  { to: '/preferences', icon: '⚙️', label: 'Preferences' },
  { to: '/bookmarks', icon: '🔖', label: 'Bookmarks & Favorites' },
  { to: '/system-health', icon: '🟢', label: 'System Health' },
  { to: '/maintenance', icon: '🛠️', label: 'Maintenance Manager' },
];

export const Sidebar: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const { notifications } = useNotificationStore();
  const { theme, toggleTheme } = useThemeStore();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const links = user?.role === 'admin' 
    ? ADMIN_LINKS 
    : user?.role === 'faculty' 
      ? FACULTY_LINKS 
      : STUDENT_LINKS;

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--bg-sidebar)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6">
        <Logo size="sm" />
        <div>
          <div className="text-sm font-bold text-white">EduMentor AI</div>
          <div className="text-[10px] text-white/40 font-mono">Powered by Llama 3</div>
        </div>
      </div>

      {/* User info */}
      <div className="mx-4 mb-4 rounded-xl p-3 relative" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          {user?.useCustomPhoto && (user.profileImage || user.avatar) ? (
            <img src={user.profileImage || user.avatar} alt={user.name} className="h-9 w-9 rounded-xl object-cover border border-white/10" />
          ) : (
            <div className="relative h-9 w-9 flex items-center justify-center rounded-xl overflow-visible">
              <AvatarFrame size={36} className="rounded-xl overflow-hidden" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-white leading-snug">{user?.name}</div>
            <div className="truncate text-[10px] capitalize text-white/40 font-medium mt-0.5">{user?.role}</div>
          </div>

          {/* Theme Toggle + Notification Bell */}
          <div className="flex items-center gap-1.5">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="h-8 w-8 rounded-xl border flex items-center justify-center transition-all"
              style={{
                background: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span className="text-sm leading-none">{theme === 'dark' ? '☀️' : '🌙'}</span>
            </button>

            {/* Notification Bell with Badge */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="h-8 w-8 rounded-xl border flex items-center justify-center relative focus:outline-none transition-all"
                style={{
                  background: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
                title="Notifications"
              >
                <span className="text-sm leading-none">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary-500 border-2 border-[#0a0b0f] text-[8px] font-black text-white flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <NotificationDrawer onClose={() => setNotifOpen(false)} />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-[10px] text-white/40 font-bold uppercase">Language</span>
          <LanguageSelector />
        </div>
      </div>

      {/* Navigation — scrollable */}
      <nav
        className="flex-1 px-3 py-1 overflow-y-auto"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.1) transparent',
        }}
      >
        {/* Global Search */}
        <div className="mb-2">
          <GlobalSearchBar />
        </div>
        <div className="space-y-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={`sidebar-link ${location.pathname === link.to ? 'active' : ''}`}
            >
              <span className="text-base">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-4">
        <button
          onClick={handleLogout}
          className="sidebar-link w-full justify-center"
          style={{ background: 'rgba(252,129,129,0.08)', color: 'rgba(252,129,129,0.8)', border: '1px solid rgba(252,129,129,0.15)' }}
        >
          <span>🚪</span>
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  );
};
