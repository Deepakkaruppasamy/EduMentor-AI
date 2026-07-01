import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sessionsService, UserSession } from '../services/sessions.service';
import toast from 'react-hot-toast';

export const SessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const res = await sessionsService.getMySessions();
      setSessions(res.sessions);
    } catch {
      toast.error('Failed to retrieve active sessions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (id: string) => {
    try {
      await sessionsService.revokeSession(id);
      toast.success('Session terminated successfully.');
      fetchSessions();
    } catch {
      toast.error('Failed to terminate session.');
    }
  };

  const handleRevokeAllOther = async () => {
    if (!window.confirm('Are you sure you want to log out of all other devices?')) return;
    try {
      const res = await sessionsService.revokeAllOtherSessions();
      toast.success(res.message || 'Other devices logged out successfully.');
      fetchSessions();
    } catch {
      toast.error('Failed to log out other devices.');
    }
  };

  // Helper to determine if device is unrecognized/suspicious
  const isSuspicious = (sess: UserSession) => {
    const ua = (sess.deviceName + ' ' + sess.browser + ' ' + sess.os).toLowerCase();
    return ua.includes('unknown') || sess.ipAddress === '127.0.0.1' || sess.ipAddress === '::1';
  };

  const getDeviceIcon = (os: string) => {
    const o = os.toLowerCase();
    if (o.includes('win')) return '💻';
    if (o.includes('mac') || o.includes('ios') || o.includes('ipad') || o.includes('iphone')) return '🍎';
    if (o.includes('android')) return '📱';
    if (o.includes('linux')) return '🐧';
    return '🖥️';
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '32px 24px',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
              }}>🛡️</div>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0 }}>
                  Active Sessions Manager
                </h1>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
                  Manage active connections and devices currently logged into your account
                </p>
              </div>
            </div>
          </div>

          {sessions.length > 1 && (
            <button
              onClick={handleRevokeAllOther}
              style={{
                padding: '10px 20px', borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#fff', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 700,
                boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                transition: 'all 0.2s',
              }}
            >
              🚪 Logout Other Devices
            </button>
          )}
        </div>

        {/* Sessions List */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1.2s linear infinite' }}>⏳</div>
            <div>Retrieving active sessions...</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AnimatePresence mode="popLayout">
              {sessions.map(sess => (
                <motion.div
                  key={sess._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    background: sess.isCurrent 
                      ? 'rgba(99,102,241,0.04)' 
                      : isSuspicious(sess) 
                      ? 'rgba(245,158,11,0.03)' 
                      : 'rgba(255,255,255,0.02)',
                    border: sess.isCurrent
                      ? '1px solid rgba(99,102,241,0.3)'
                      : isSuspicious(sess)
                      ? '1px solid rgba(245,158,11,0.3)'
                      : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 18,
                    padding: 20,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22,
                    }}>
                      {getDeviceIcon(sess.os)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>
                          {sess.deviceName}
                        </span>
                        {sess.isCurrent && (
                          <span style={{
                            fontSize: 10, fontWeight: 800,
                            background: 'rgba(34,197,94,0.15)', color: '#22c55e',
                            padding: '2px 8px', borderRadius: 6,
                          }}>
                            CURRENT SESSION
                          </span>
                        )}
                        {isSuspicious(sess) && (
                          <span style={{
                            fontSize: 10, fontWeight: 800,
                            background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                            padding: '2px 8px', borderRadius: 6,
                          }} title="This device matches unverified or local loopback connection details">
                            ⚠️ UNKNOWN DEVICE
                          </span>
                        )}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.4)',
                        marginTop: 4,
                        flexWrap: 'wrap',
                      }}>
                        <span>🌐 {sess.browser} / {sess.os}</span>
                        <span>📍 IP: {sess.ipAddress || 'Not recorded'}</span>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.3)',
                        marginTop: 4,
                      }}>
                        <span>🔑 Login: {new Date(sess.loginTime).toLocaleString()}</span>
                        <span>⏱️ Active: {new Date(sess.lastActive).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {!sess.isCurrent && (
                    <button
                      onClick={() => handleRevoke(sess._id)}
                      style={{
                        padding: '8px 14px', borderRadius: 8,
                        border: '1px solid rgba(239,68,68,0.2)',
                        background: 'rgba(239,68,68,0.06)',
                        color: '#ef4444', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.06)';
                      }}
                    >
                      Revoke
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
