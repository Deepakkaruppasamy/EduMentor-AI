/**
 * MobileNotifBanner.tsx
 *
 * A native-app-style "heads-up" notification banner for mobile / PWA.
 * Drops down from below the header when a new notification arrives.
 * Auto-dismisses after 5 seconds. Tapping navigates to the linked page.
 *
 * Usage: Mount once in Layout.tsx.
 * The banner listens to the notification store and shows the latest unread notification.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore, AppNotification } from '../../store/notification.store';

const TYPE_META: Record<AppNotification['type'], { icon: string; accent: string }> = {
  quiz_assigned:   { icon: '📝', accent: '#7c8fff' },
  live_battle:     { icon: '⚔️', accent: '#ec4899' },
  document_status: { icon: '📁', accent: '#3b82f6' },
  evaluation:      { icon: '📋', accent: '#10b981' },
  appointment:     { icon: '📅', accent: '#f59e0b' },
  ticket:          { icon: '🎟️', accent: '#6366f1' },
  announcement:    { icon: '📢', accent: '#ef4444' },
  office_hours:    { icon: '🏫', accent: '#14b8a6' },
  message:         { icon: '💬', accent: '#a855f7' },
  study_plan:      { icon: '🗓️', accent: '#22c55e' },
  calendar:        { icon: '📆', accent: '#fb923c' },
};

const AUTO_DISMISS_MS = 5000;
const ANIM_OUT_MS     = 350;

export const MobileNotifBanner: React.FC = () => {
  const { notifications, markAsRead } = useNotificationStore();
  const navigate = useNavigate();

  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [current, setCurrent] = useState<AppNotification | null>(null);

  // Track the last notification id we showed to avoid re-showing
  const lastShownId = useRef<string | null>(null);

  // Auto-dismiss timer ref
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    if (!visible) return;
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      setCurrent(null);
    }, ANIM_OUT_MS);
  };

  // Watch for new unread notifications
  useEffect(() => {
    const newest = notifications.find(n => !n.isRead);
    if (!newest) return;
    if (newest.id === lastShownId.current) return;

    lastShownId.current = newest.id;

    // Clear any running dismiss timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // If a banner is already showing, dismiss it first then show the new one
    if (visible) {
      setExiting(true);
      setTimeout(() => {
        setExiting(false);
        setCurrent(newest);
        setVisible(true);
        timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
      }, ANIM_OUT_MS + 50);
    } else {
      setCurrent(newest);
      setVisible(true);
      timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

  if (!visible || !current) return null;

  const meta = TYPE_META[current.type] || { icon: '🔔', accent: '#4f63ff' };

  const handleTap = () => {
    markAsRead(current.id);
    dismiss();
    if (current.link) navigate(current.link);
  };

  return (
    <div
      id="mobile-notif-banner"
      role="alert"
      aria-live="assertive"
      onClick={handleTap}
      style={{
        position: 'fixed',
        top: '64px',           /* sits just below the 56px mobile header */
        left: '12px',
        right: '12px',
        zIndex: 9999,
        cursor: current.link ? 'pointer' : 'default',
        animation: exiting
          ? `mbnSlideOut ${ANIM_OUT_MS}ms cubic-bezier(0.4, 0, 1, 1) forwards`
          : 'mbnSlideIn 0.38s cubic-bezier(0.34, 1.3, 0.64, 1) forwards',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 14px',
          borderRadius: '18px',
          background: 'rgba(15, 17, 28, 0.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: `1px solid ${meta.accent}30`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05), 0 2px 12px ${meta.accent}22`,
        }}
      >
        {/* App icon area */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: `${meta.accent}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            flexShrink: 0,
            border: `1px solid ${meta.accent}30`,
          }}
        >
          {meta.icon}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* App name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1px' }}>
            <img
              src="/icon-192.png"
              alt=""
              style={{ width: '12px', height: '12px', borderRadius: '3px' }}
            />
            <span style={{
              fontSize: '9px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}>
              EduMentor AI
            </span>
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontFamily: 'Inter, system-ui, sans-serif' }}>
              · now
            </span>
          </div>

          {/* Title */}
          <p style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#f0f2f8',
            margin: 0,
            lineHeight: 1.3,
            fontFamily: 'Inter, system-ui, sans-serif',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {current.title}
          </p>

          {/* Body */}
          <p style={{
            fontSize: '11px',
            color: 'rgba(240,242,248,0.55)',
            margin: '1px 0 0',
            lineHeight: 1.4,
            fontFamily: 'Inter, system-ui, sans-serif',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {current.message}
          </p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={(e) => { e.stopPropagation(); dismiss(); }}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            color: 'rgba(255,255,255,0.4)',
          }}
          aria-label="Dismiss notification"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: '16px',
        right: '16px',
        height: '2px',
        background: 'rgba(255,255,255,0.06)',
        borderRadius: '0 0 18px 18px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          background: `linear-gradient(90deg, ${meta.accent}, ${meta.accent}88)`,
          borderRadius: 'inherit',
          animation: `mbnProgress ${AUTO_DISMISS_MS}ms linear forwards`,
        }} />
      </div>

      <style>{`
        @keyframes mbnSlideIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
        @keyframes mbnSlideOut {
          from { opacity: 1; transform: translateY(0)      scale(1);    }
          to   { opacity: 0; transform: translateY(-16px)  scale(0.96); }
        }
        @keyframes mbnProgress {
          from { width: 100%; }
          to   { width: 0%;   }
        }
      `}</style>
    </div>
  );
};
