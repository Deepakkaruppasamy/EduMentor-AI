import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore, AppNotification } from '../../store/notification.store';

interface NotificationDrawerProps {
  onClose: () => void;
}

const TYPE_ICONS: Record<AppNotification['type'], { icon: string; bg: string; color: string }> = {
  quiz_assigned:   { icon: '📝', bg: 'rgba(79,99,255,0.1)', color: '#7c8fff' },
  live_battle:     { icon: '⚔️', bg: 'rgba(236,72,153,0.1)', color: '#ec4899' },
  document_status: { icon: '📁', bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  evaluation:      { icon: '📋', bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
};

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ onClose }) => {
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  const navigate = useNavigate();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  const handleNotificationClick = (notif: AppNotification) => {
    markAsRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
    }
    onClose();
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

  return (
    <motion.div
      ref={drawerRef}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.15, type: 'spring', damping: 20 }}
      className="absolute left-full top-0 ml-3 w-80 bg-[#151926]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-[999] overflow-hidden flex flex-col max-h-[450px]"
      style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 20px rgba(79,99,255,0.15)' }}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <span>🔔</span> Notifications
        </h4>
        <div className="flex gap-2">
          {notifications.length > 0 && (
            <>
              <button
                onClick={markAllAsRead}
                className="text-[9px] font-bold text-primary-400 hover:text-primary-300 transition-colors"
              >
                Mark Read
              </button>
              <span className="text-white/10 text-[9px]">|</span>
              <button
                onClick={clearAll}
                className="text-[9px] font-bold text-white/40 hover:text-white/60 transition-colors"
              >
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5 max-h-[380px]">
        {notifications.map((notif) => {
          const cfg = TYPE_ICONS[notif.type] || { icon: '🔔', bg: 'rgba(255,255,255,0.05)', color: '#fff' };
          return (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-3.5 flex gap-3 cursor-pointer transition-all hover:bg-white/[0.04] text-left relative ${
                !notif.isRead ? 'bg-primary-500/[0.02]' : ''
              }`}
            >
              {/* Unread indicator */}
              {!notif.isRead && (
                <span className="absolute top-4 right-4 h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse" />
              )}

              {/* Icon circle */}
              <div
                className="h-8 w-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: cfg.bg }}
              >
                {cfg.icon}
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[10px] font-black text-white truncate leading-snug">{notif.title}</span>
                  <span className="text-[8px] text-white/30 font-semibold flex-shrink-0">
                    {getRelativeTime(notif.timestamp)}
                  </span>
                </div>
                <p className="text-[9px] text-white/50 leading-relaxed font-medium line-clamp-2">
                  {notif.message}
                </p>
                {notif.courseCode && (
                  <span className="inline-block mt-1 text-[8px] uppercase tracking-wider font-extrabold text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded-md font-mono">
                    {notif.courseCode}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {notifications.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
            <span className="text-2xl">💤</span>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">All caught up!</p>
            <p className="text-[9px] text-white/20 max-w-[180px]">
              No new notifications. Alerts will appear here in real-time.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
