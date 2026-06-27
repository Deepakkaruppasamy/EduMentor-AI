import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/auth.store';
import toast from 'react-hot-toast';
import { Logo } from '../common/Logo';
import { LanguageSelector } from '../common/LanguageSelector';

const STUDENT_LINKS = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/chat', icon: '💬', label: 'AI Chat Tutor' },
  { to: '/quiz', icon: '📝', label: 'Quiz Generator' },
  { to: '/flashcards', icon: '🎴', label: 'Flashcards' },
  { to: '/courses', icon: '📚', label: 'My Courses' },
  { to: '/recommendations', icon: '🎯', label: 'Recommendations' },
  { to: '/assignment-evaluator', icon: '📋', label: 'Assignment Evaluator' },
  { to: '/profile', icon: '👤', label: 'My Profile' },
];

const FACULTY_LINKS = [
  { to: '/admin', icon: '📈', label: 'Dashboard' },
  { to: '/courses', icon: '📚', label: 'Manage Courses' },
  { to: '/documents', icon: '📁', label: 'Upload Documents' },
  { to: '/quiz', icon: '⚔️', label: 'Quiz Battle Arena' },
  { to: '/gradebook', icon: '📒', label: 'Gradebook' },
  { to: '/analytics', icon: '📊', label: 'Analytics' },
  { to: '/assignment-evaluator', icon: '📋', label: 'Assignment Evaluator' },
  { to: '/profile', icon: '👤', label: 'My Profile' },
];

const ADMIN_LINKS = [
  { to: '/admin', icon: '📈', label: 'Dashboard' },
  { to: '/admin/users', icon: '👥', label: 'User Directory' },
  { to: '/courses', icon: '📚', label: 'Manage Courses' },
  { to: '/documents', icon: '📁', label: 'Upload Documents' },
  { to: '/gradebook', icon: '📒', label: 'Gradebook' },
  { to: '/analytics', icon: '📊', label: 'Analytics' },
  { to: '/profile', icon: '👤', label: 'My Profile' },
];

export const Sidebar: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

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
    <div className="flex h-full flex-col" style={{ background: 'rgba(10,11,15,0.95)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6">
        <Logo size="sm" />
        <div>
          <div className="text-sm font-bold text-white">EduMentor AI</div>
          <div className="text-[10px] text-white/40 font-mono">Powered by Llama 3</div>
        </div>
      </div>

      {/* User info */}
      <div className="mx-4 mb-4 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="h-9 w-9 rounded-xl object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #4f63ff 0%, #9f7aea 100%)' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{user?.name}</div>
            <div className="truncate text-[11px] capitalize text-white/50">{user?.role}</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-[10px] text-white/40 font-bold uppercase">Language</span>
          <LanguageSelector />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
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
