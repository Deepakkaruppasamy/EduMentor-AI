import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/auth.store';
import { privacyService, PrivacySettings, SecurityOverview, AdminSecurityStats } from '../services/privacy.service';
import api from '../services/api';
import toast from 'react-hot-toast';

export const PrivacySecurityPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'security' | 'privacy' | 'download' | 'admin'>('security');
  const [loading, setLoading] = useState(true);

  // Data States
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [adminStats, setAdminStats] = useState<AdminSecurityStats | null>(null);

  // Form Preferences States
  const [cookieAnalytics, setCookieAnalytics] = useState(true);
  const [cookieMarketing, setCookieMarketing] = useState(false);
  const [cookieFunctional, setCookieFunctional] = useState(true);

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifBrowser, setNotifBrowser] = useState(true);
  const [notifLogin, setNotifLogin] = useState(true);
  const [notifMaintenance, setNotifMaintenance] = useState(true);
  const [notifSecurity, setNotifSecurity] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overRes, settRes] = await Promise.all([
        privacyService.getSecurityOverview(),
        privacyService.getPrivacySettings(),
      ]);
      setOverview(overRes);
      setSettings(settRes.settings);

      // Map preferences to local form state
      setCookieAnalytics(settRes.settings.cookiePreferences.analytics);
      setCookieMarketing(settRes.settings.cookiePreferences.marketing);
      setCookieFunctional(settRes.settings.cookiePreferences.functional);

      setNotifEmail(settRes.settings.notificationPreferences.emailNotifications);
      setNotifBrowser(settRes.settings.notificationPreferences.browserNotifications);
      setNotifLogin(settRes.settings.notificationPreferences.loginAlerts);
      setNotifMaintenance(settRes.settings.notificationPreferences.maintenanceAlerts);
      setNotifSecurity(settRes.settings.notificationPreferences.securityAlerts);

      if (isAdmin) {
        const adminRes = await privacyService.getAdminSecurityStats();
        setAdminStats(adminRes);
      }
    } catch {
      toast.error('Failed to retrieve security and privacy stats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdatePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await privacyService.updatePrivacySettings({
        cookiePreferences: {
          analytics: cookieAnalytics,
          marketing: cookieMarketing,
          functional: cookieFunctional,
        },
        notificationPreferences: {
          emailNotifications: notifEmail,
          browserNotifications: notifBrowser,
          loginAlerts: notifLogin,
          maintenanceAlerts: notifMaintenance,
          securityAlerts: notifSecurity,
        },
      });
      setSettings(res.settings);
      toast.success(res.message || 'Preferences updated.');
    } catch {
      toast.error('Failed to update privacy settings.');
    }
  };

  const handleDownloadRequest = async () => {
    if (!window.confirm('Request a copy of your personal data? We will email you instructions.')) return;
    try {
      const res = await privacyService.requestDataDownload();
      toast.success(res.message);
      fetchData();
    } catch {
      toast.error('Data request failed.');
    }
  };

  const handleDeleteRequest = async () => {
    const confirmText = 'DELETE';
    const input = window.prompt(`WARNING: You are requesting full account deletion. To confirm, type "${confirmText}":`);
    if (input !== confirmText) {
      toast.error('Invalid confirmation string. Request cancelled.');
      return;
    }
    try {
      const res = await privacyService.requestAccountDeletion();
      toast.success(res.message);
      fetchData();
    } catch {
      toast.error('Deletion request failed.');
    }
  };

  if (loading && !overview) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)', color: 'rgba(255,255,255,0.4)',
      }}>
        <div>Loading Privacy &amp; Security Dashboard...</div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '32px 24px',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
            }}>🛡️</div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0 }}>
                Data Privacy &amp; Security Center
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
                Review login metrics, manage preference scopes, configure notification alerts, and check safety telemetry
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 28,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, padding: 5,
          width: 'fit-content',
        }}>
          {[
            { id: 'security', label: '🛡️ Security Overview' },
            { id: 'privacy', label: '🔒 Privacy Preferences' },
            { id: 'download', label: '💾 Personal Data' },
            ...(isAdmin ? [{ id: 'admin', label: '🧙 Global Security Stats' }] : []),
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '8px 18px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === tab.id
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.5)',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: 13,
                transition: 'all 0.2s',
                boxShadow: activeTab === tab.id ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
              }}
            >{tab.label}</button>
          ))}
        </div>

        {/* TAB Panel: Security Overview */}
        <AnimatePresence mode="wait">
          {activeTab === 'security' && overview && (
            <motion.div
              key="security"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
            >
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 20,
              }}>
                {/* Score gauge */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 20, padding: 24,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  textAlign: 'center',
                }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                    Account Security Score
                  </span>
                  <div style={{
                    width: 100, height: 100, borderRadius: '50%',
                    border: `8px solid ${getScoreColor(overview.securityScore)}20`,
                    borderTop: `8px solid ${getScoreColor(overview.securityScore)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, fontWeight: 800, color: '#fff',
                    marginBottom: 12,
                  }}>
                    {overview.securityScore}%
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: getScoreColor(overview.securityScore) }}>
                    {overview.securityScore >= 80 ? 'Excellent Status' : overview.securityScore >= 50 ? 'Warning: Review Devices' : 'Critical Security Risk'}
                  </div>
                </div>

                {/* Login statistics */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 20, padding: 24,
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Security Statistics
                  </span>
                  {[
                    { label: 'Failed Logins (30d)', value: overview.failedLogins30d },
                    { label: 'Active Sessions Count', value: overview.activeSessionsCount },
                    { label: 'Password Age', value: `${overview.passwordAgeDays === Infinity ? 'Never Changed' : `${overview.passwordAgeDays} days`}` },
                    { label: 'Last Login Time', value: overview.lastLogin ? new Date(overview.lastLogin).toLocaleDateString() : 'N/A' },
                  ].map(stat => (
                    <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 8 }}>
                      <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)' }}>{stat.label}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Login history timeline */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20, padding: 24,
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 16px 0' }}>
                  🕒 Recent Login Activity Logs
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {['Date/Time', 'Action', 'Device', 'IP Address', 'Location'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {overview.loginHistory.map((log, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 12 }}>
                            <span style={{
                              fontWeight: 700,
                              color: log.action.includes('SUCCESS') ? '#22c55e' : '#ef4444',
                            }}>{log.action.replace('LOGIN_', '')}</span>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.device}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                            {log.ipAddress || 'Unknown'}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                            {log.location || 'Local Net'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB Panel: Privacy Preferences */}
          {activeTab === 'privacy' && settings && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <form onSubmit={handleUpdatePreferences} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20, padding: 24,
                display: 'flex', flexDirection: 'column', gap: 20,
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
                  🔒 Cookie &amp; Notification Consent Settings
                </h3>

                {/* Cookie toggles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Cookie Preferences
                  </span>
                  {[
                    { title: 'Functional Cookies (Mandatory)', desc: 'Store session states and local storage caching', val: cookieFunctional, set: setCookieFunctional, disabled: true },
                    { title: 'Performance Analytics Cookies', desc: 'Anonymized clicks and telemetry to track page performance', val: cookieAnalytics, set: setCookieAnalytics },
                    { title: 'Targeted Marketing Cookies', desc: 'Promotional content alerts and newsletters', val: cookieMarketing, set: setCookieMarketing },
                  ].map(c => (
                    <label key={c.title} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'rgba(0,0,0,0.12)', padding: '12px 16px', borderRadius: 12,
                      cursor: c.disabled ? 'not-allowed' : 'pointer',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{c.title}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{c.desc}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={c.val}
                        disabled={c.disabled}
                        onChange={e => c.set(e.target.checked)}
                        style={{ width: 32, height: 18, cursor: c.disabled ? 'not-allowed' : 'pointer' }}
                      />
                    </label>
                  ))}
                </div>

                {/* Notification toggles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Notification Subscriptions
                  </span>
                  {[
                    { title: 'Email Notifications', val: notifEmail, set: setNotifEmail },
                    { title: 'Browser In-App Banner Alerts', val: notifBrowser, set: setNotifBrowser },
                    { title: 'New Device Sign-in Security Alerts', val: notifLogin, set: setNotifLogin },
                    { title: 'System Maintenance Notices', val: notifMaintenance, set: setNotifMaintenance },
                    { title: 'Crucial Security & Policy Alerts', val: notifSecurity, set: setNotifSecurity },
                  ].map(n => (
                    <label key={n.title} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'rgba(0,0,0,0.12)', padding: '10px 16px', borderRadius: 12,
                      cursor: 'pointer',
                    }}>
                      <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{n.title}</span>
                      <input
                        type="checkbox"
                        checked={n.val}
                        onChange={e => n.set(e.target.checked)}
                        style={{ width: 32, height: 18, cursor: 'pointer' }}
                      />
                    </label>
                  ))}
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '12px 24px', borderRadius: 12,
                    border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
                    alignSelf: 'flex-end',
                  }}
                >
                  💾 Save Preferences
                </button>
              </form>
            </motion.div>
          )}

          {/* TAB Panel: Personal Data downloads / Deletion */}
          {activeTab === 'download' && settings && (
            <motion.div
              key="download"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20, padding: 24,
                display: 'flex', flexDirection: 'column', gap: 20,
              }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
                📁 Export or Erase Account Credentials
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                {/* Download Card */}
                <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>📥 Download Account Data Archive</h4>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>
                    Request a download of all courses linked, quiz scores, evaluations, chat history, and timeline.
                  </p>

                  {settings.dataDownloadRequested && settings.dataDownloadRequestedAt ? (
                    <div style={{
                      background: 'rgba(99,102,241,0.08)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      borderRadius: 10, padding: '10px 14px',
                      display: 'flex', flexDirection: 'column', gap: 6,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13 }}>⏳</span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#818cf8' }}>Request Processing</span>
                      </div>
                      <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.4 }}>
                        Submitted {(() => {
                          const hrs = Math.floor((Date.now() - new Date(settings.dataDownloadRequestedAt!).getTime()) / 3600000);
                          return hrs < 1 ? 'just now' : `${hrs}h ago`;
                        })()} · You'll receive an email within 48 hours.
                      </p>
                      <button
                        onClick={async () => {
                          if (!window.confirm('Cancel your data download request?')) return;
                          try {
                            await api.put('/privacy/settings', { dataDownloadRequested: false });
                            toast.success('Download request cancelled.');
                            fetchData();
                          } catch {
                            toast.error('Failed to cancel request.');
                          }
                        }}
                        style={{
                          marginTop: 4, padding: '6px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                          border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                          color: 'rgba(255,255,255,0.5)', cursor: 'pointer', alignSelf: 'flex-start',
                        }}
                      >
                        ✕ Cancel Request
                      </button>
                    </div>
                  ) : settings.dataDownloadRequested ? (
                    <button
                      disabled
                      style={{
                        padding: '10px 18px', borderRadius: 10,
                        border: '1px solid rgba(99,102,241,0.2)',
                        background: 'rgba(255,255,255,0.04)',
                        color: 'rgba(255,255,255,0.3)',
                        cursor: 'not-allowed', fontSize: 12.5, fontWeight: 600,
                        marginTop: 'auto',
                      }}
                    >
                      ⏳ Request Pending
                    </button>
                  ) : (
                    <button
                      onClick={handleDownloadRequest}
                      style={{
                        padding: '10px 18px', borderRadius: 10,
                        border: '1px solid rgba(99,102,241,0.3)',
                        background: 'rgba(99,102,241,0.1)',
                        color: '#818cf8',
                        cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                        marginTop: 'auto', transition: 'all 0.2s',
                      }}
                    >
                      📥 Request Download
                    </button>
                  )}
                </div>

                {/* Deletion Card */}
                <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', margin: 0 }}>⚠️ Request Account Deletion</h4>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>
                    Request full purge of your database objects. This deletes student/faculty profiles and is irreversible.
                  </p>

                  {settings.deletionRequested && settings.deletionRequestedAt ? (
                    <div style={{
                      background: 'rgba(239,68,68,0.07)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: 10, padding: '10px 14px',
                      display: 'flex', flexDirection: 'column', gap: 6,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13 }}>⏳</span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#f87171' }}>Deletion Pending Review</span>
                      </div>
                      <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.4 }}>
                        Submitted {(() => {
                          const days = Math.floor((Date.now() - new Date(settings.deletionRequestedAt!).getTime()) / 86400000);
                          return days < 1 ? 'today' : `${days} day${days > 1 ? 's' : ''} ago`;
                        })()} · Admin review within 7 business days.
                      </p>
                      <button
                        onClick={async () => {
                          if (!window.confirm('Cancel your account deletion request?')) return;
                          try {
                            await api.put('/privacy/settings', { deletionRequested: false });
                            toast.success('Deletion request cancelled. Your account is safe.');
                            fetchData();
                          } catch {
                            toast.error('Failed to cancel deletion request.');
                          }
                        }}
                        style={{
                          marginTop: 4, padding: '6px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                          border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)',
                          color: '#f87171', cursor: 'pointer', alignSelf: 'flex-start',
                        }}
                      >
                        ✕ Cancel Deletion Request
                      </button>
                    </div>
                  ) : settings.deletionRequested ? (
                    <button
                      disabled
                      style={{
                        padding: '10px 18px', borderRadius: 10,
                        border: '1px solid rgba(239,68,68,0.2)',
                        background: 'rgba(255,255,255,0.04)',
                        color: 'rgba(255,255,255,0.3)',
                        cursor: 'not-allowed', fontSize: 12.5, fontWeight: 600,
                        marginTop: 'auto',
                      }}
                    >
                      ⏳ Purge Pending
                    </button>
                  ) : (
                    <button
                      onClick={handleDeleteRequest}
                      style={{
                        padding: '10px 18px', borderRadius: 10,
                        border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.1)',
                        color: '#ef4444',
                        cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                        marginTop: 'auto', transition: 'all 0.2s',
                      }}
                    >
                      ⚠️ Erase Account
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}


          {/* TAB Panel: Admin Audit Logs (Admin Only) */}
          {activeTab === 'admin' && isAdmin && adminStats && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
            >
              {/* Stat grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 12,
              }}>
                {[
                  { label: 'Total Users', val: adminStats.overview.totalUsers, c: '#818cf8' },
                  { label: 'Active Sessions', val: adminStats.overview.activeSessions, c: '#10b981' },
                  { label: 'Locked Users', val: adminStats.overview.lockedUsers, c: '#ef4444' },
                  { label: 'Failed Logins (30d)', val: adminStats.loginStats30d.failed, c: '#f59e0b' },
                  { label: 'Purge Requests', val: adminStats.overview.deletionRequests, c: '#ef4444' },
                  { label: 'Data Requests', val: adminStats.overview.downloadRequests, c: '#06b6d4' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.val}</div>
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Locked accounts / suspicious activity logs */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20, padding: 24,
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 16px 0' }}>
                  🚨 Recent Security Failures &amp; Login Audits
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {['Time', 'Target User', 'Action', 'IP Address', 'Device UA'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {adminStats.recentLoginLogs.map((log, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: '#fff' }}>
                            {log.performedBy || 'System'}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 12 }}>
                            <span style={{
                              fontWeight: 700,
                              color: log.action.includes('SUCCESS') ? '#22c55e' : log.action.includes('BLOCKED') ? '#d97706' : '#ef4444',
                              background: `${log.action.includes('SUCCESS') ? '#22c55e' : log.action.includes('BLOCKED') ? '#d97706' : '#ef4444'}15`,
                              padding: '2px 8px', borderRadius: 6,
                            }}>{log.action}</span>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                            {log.ipAddress || 'Unknown'}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 11, color: 'rgba(255,255,255,0.4)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.device}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
