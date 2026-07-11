/**
 * MobileNotificationPanel.tsx
 *
 * A full-screen bottom-sheet notification panel for mobile / PWA.
 * Opens when the bell icon in the mobile header is tapped.
 * Slides up from the bottom with a drag-to-close handle.
 */

import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore, AppNotification } from '../../store/notification.store';

interface MobileNotificationPanelProps {
  onClose: () => void;
}

const TYPE_ICONS: Record<AppNotification['type'], { icon: string; bg: string; color: string }> = {
  quiz_assigned:   { icon: '📝', bg: 'rgba(79,99,255,0.15)',    color: '#7c8fff' },
  live_battle:     { icon: '⚔️', bg: 'rgba(236,72,153,0.15)',   color: '#ec4899' },
  document_status: { icon: '📁', bg: 'rgba(59,130,246,0.15)',   color: '#3b82f6' },
  evaluation:      { icon: '📋', bg: 'rgba(16,185,129,0.15)',   color: '#10b981' },
  appointment:     { icon: '📅', bg: 'rgba(245,158,11,0.15)',   color: '#f59e0b' },
  ticket:          { icon: '🎟️', bg: 'rgba(99,102,241,0.15)',   color: '#6366f1' },
  announcement:    { icon: '📢', bg: 'rgba(239,68,68,0.15)',    color: '#ef4444' },
  office_hours:    { icon: '🏫', bg: 'rgba(20,184,166,0.15)',   color: '#14b8a6' },
  message:         { icon: '💬', bg: 'rgba(168,85,247,0.15)',   color: '#a855f7' },
  study_plan:      { icon: '🗓️', bg: 'rgba(34,197,94,0.15)',    color: '#22c55e' },
  calendar:        { icon: '📆', bg: 'rgba(251,146,60,0.15)',   color: '#fb923c' },
};

const getRelativeTime = (isoString: string) => {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(isoString).toLocaleDateString();
};

export const MobileNotificationPanel: React.FC<MobileNotificationPanelProps> = ({ onClose }) => {
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);

  // Trap body scroll while panel is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 320);
  };

  const handleNotificationClick = (notif: AppNotification) => {
    markAsRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
    }
    handleClose();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm"
        style={{
          animation: closing
            ? 'mobileNotifBdOut 0.3s ease forwards'
            : 'mobileNotifBdIn 0.25s ease forwards',
        }}
        onClick={handleClose}
      />

      {/* Bottom Sheet Panel */}
      <div
        ref={panelRef}
        className="fixed bottom-0 left-0 right-0 z-[1001] flex flex-col"
        style={{
          maxHeight: '85vh',
          background: 'linear-gradient(180deg, #13151e 0%, #0f1119 100%)',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
          animation: closing
            ? 'mobileNotifPanelOut 0.32s cubic-bezier(0.4, 0, 1, 1) forwards'
            : 'mobileNotifPanelIn 0.35s cubic-bezier(0.34, 1.2, 0.64, 1) forwards',
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(79,99,255,0.15)' }}
            >
              <span className="text-base">🔔</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-[10px] text-indigo-400 font-semibold">
                  {unreadCount} unread
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(79,99,255,0.1)' }}
                >
                  Mark all read
                </button>
                <button
                  onClick={clearAll}
                  className="text-[10px] font-bold text-white/40 hover:text-white/60 transition-colors"
                >
                  Clear
                </button>
              </>
            )}
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                💤
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-white/30 uppercase tracking-wider">All caught up!</p>
                <p className="text-[10px] text-white/20 mt-1 max-w-[200px]">
                  Real-time alerts will appear here when you receive notifications.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {notifications.map((notif, index) => {
                const cfg = TYPE_ICONS[notif.type] || { icon: '🔔', bg: 'rgba(255,255,255,0.08)', color: '#fff' };
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className="flex items-start gap-3.5 px-5 py-4 cursor-pointer active:bg-white/5 transition-colors relative"
                    style={{
                      background: !notif.isRead ? 'rgba(79,99,255,0.03)' : 'transparent',
                      animationDelay: `${index * 30}ms`,
                    }}
                  >
                    {/* Unread dot */}
                    {!notif.isRead && (
                      <span
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                        style={{ background: '#4f63ff', boxShadow: '0 0 6px rgba(79,99,255,0.8)' }}
                      />
                    )}

                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 mt-0.5"
                      style={{ background: cfg.bg }}
                    >
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className="text-xs font-bold leading-snug"
                          style={{ color: !notif.isRead ? '#f0f2f8' : 'rgba(240,242,248,0.7)' }}
                        >
                          {notif.title}
                        </span>
                        <span className="text-[9px] text-white/30 font-medium flex-shrink-0 mt-0.5">
                          {getRelativeTime(notif.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>
                      {notif.courseCode && (
                        <span
                          className="inline-block mt-1.5 text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md"
                          style={{ color: cfg.color, background: cfg.bg }}
                        >
                          {notif.courseCode}
                        </span>
                      )}
                    </div>

                    {/* Chevron */}
                    {notif.link && (
                      <svg className="w-4 h-4 text-white/20 flex-shrink-0 mt-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Safe area spacer for iPhone home bar */}
          <div className="h-6" />
        </div>
      </div>

      {/* Keyframe animations via inline style tag */}
      <style>{`
        @keyframes mobileNotifBdIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes mobileNotifBdOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes mobileNotifPanelIn {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes mobileNotifPanelOut {
          from { transform: translateY(0); }
          to   { transform: translateY(100%); }
        }
      `}</style>
    </>
  );
};
