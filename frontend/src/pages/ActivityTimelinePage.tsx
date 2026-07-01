import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/auth.store';
import { activityService, ActivityLog } from '../services/activity.service';
import toast from 'react-hot-toast';

const getModuleIcon = (mod: string) => {
  const m = mod.toLowerCase();
  if (m.includes('auth')) return '🔑';
  if (m.includes('quiz')) return '📝';
  if (m.includes('note')) return '📓';
  if (m.includes('assignment')) return '📋';
  if (m.includes('meeting') || m.includes('schedule')) return '📅';
  if (m.includes('message')) return '✉️';
  if (m.includes('profile')) return '👤';
  if (m.includes('research')) return '🔬';
  if (m.includes('plagiarism')) return '🔍';
  if (m.includes('health') || m.includes('system')) return '📊';
  return '⚙️';
};

export const ActivityTimelinePage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchAction, setSearchAction] = useState('');
  const [selectedRole, setSelectedRole] = useState(''); // Admin only

  const fetchLogs = async (pageNum = 1) => {
    setIsLoading(true);
    try {
      const params = {
        page: pageNum,
        limit: 15,
        module: selectedModule || undefined,
        status: selectedStatus || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        action: searchAction || undefined,
        ...(isAdmin && { role: selectedRole || undefined }),
      };

      const res = isAdmin 
        ? await activityService.getAllTimeline(params)
        : await activityService.getMyTimeline(params);

      setLogs(res.logs);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setPage(pageNum);
    } catch (err) {
      toast.error('Failed to load activity logs.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadModules = async () => {
    try {
      const res = await activityService.getModules();
      setModules(res.modules);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchLogs(1);
    loadModules();
  }, [selectedModule, selectedStatus, fromDate, toDate, selectedRole]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleReset = () => {
    setSelectedModule('');
    setSelectedStatus('');
    setFromDate('');
    setToDate('');
    setSearchAction('');
    setSelectedRole('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '32px 24px',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    }}>
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
            }}>📅</div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0 }}>
                {isAdmin ? 'System Activity Timeline' : 'My Activity Timeline'}
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
                {isAdmin ? 'Audit log stream of all platform-wide events' : 'Real-time record of your actions and events'}
              </p>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <form onSubmit={handleSearchSubmit} style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 18,
          padding: 20,
          marginBottom: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}>
            {/* Search Action */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>SEARCH ACTION</span>
              <input
                type="text"
                placeholder="e.g. LOGIN, QUIZ..."
                value={searchAction}
                onChange={e => setSearchAction(e.target.value)}
                style={{
                  padding: '9px 12px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.2)', color: '#fff',
                  fontSize: 12.5, outline: 'none',
                }}
              />
            </div>

            {/* Module Filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>MODULE</span>
              <select
                value={selectedModule}
                onChange={e => setSelectedModule(e.target.value)}
                style={{
                  padding: '9px 12px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.2)', color: '#fff',
                  fontSize: 12.5, outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="">All Modules</option>
                {modules.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>STATUS</span>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                style={{
                  padding: '9px 12px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.2)', color: '#fff',
                  fontSize: 12.5, outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="">All Statuses</option>
                <option value="success">🟢 Success</option>
                <option value="warning">🟡 Warning</option>
                <option value="error">🔴 Error</option>
              </select>
            </div>

            {/* Role Filter (Admin Only) */}
            {isAdmin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>USER ROLE</span>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  style={{
                    padding: '9px 12px', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(0,0,0,0.2)', color: '#fff',
                    fontSize: 12.5, outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">All Roles</option>
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            alignItems: 'flex-end',
          }}>
            {/* From Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>FROM DATE</span>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                style={{
                  padding: '9px 12px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.2)', color: '#fff',
                  fontSize: 12.5, outline: 'none',
                }}
              />
            </div>

            {/* To Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>TO DATE</span>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                style={{
                  padding: '9px 12px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.2)', color: '#fff',
                  fontSize: 12.5, outline: 'none',
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8, gridColumn: 'span 2', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: '10px 18px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 600,
                }}
              >
                Reset Filters
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 24px', borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                }}
              >
                Apply Search
              </button>
            </div>
          </div>
        </form>

        {/* Timeline List */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1.2s linear infinite' }}>⏳</div>
            <div>Loading timeline logs...</div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 18,
            color: 'rgba(255,255,255,0.35)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>No activities found</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Try clearing some filters or searching another keyword.</div>
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 20 }}>
            {/* Timeline center line */}
            <div style={{
              position: 'absolute', left: 4, top: 12, bottom: 12,
              width: 2, background: 'rgba(255,255,255,0.06)',
            }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {logs.map((log, index) => (
                <motion.div
                  key={log._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  style={{
                    position: 'relative',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 16,
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute', left: -21, top: 22,
                    width: 10, height: 10, borderRadius: '50%',
                    background: log.status === 'success' ? '#22c55e' : log.status === 'warning' ? '#f59e0b' : '#ef4444',
                    border: '3px solid var(--bg-primary)',
                    boxShadow: `0 0 6px ${log.status === 'success' ? '#22c55e' : log.status === 'warning' ? '#f59e0b' : '#ef4444'}40`,
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{getModuleIcon(log.module)}</span>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <span style={{
                          fontSize: 10.5, fontWeight: 600,
                          color: '#818cf8', background: 'rgba(99,102,241,0.1)',
                          padding: '2px 8px', borderRadius: 6, marginLeft: 10,
                        }}>
                          {log.module}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>
                    {log.details}
                  </p>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.35)',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    paddingTop: 8,
                    marginTop: 4,
                    flexWrap: 'wrap',
                  }}>
                    {isAdmin && (
                      <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
                        👤 {log.userEmail} ({log.userRole})
                      </span>
                    )}
                    <span>🖥️ {log.device}</span>
                    <span>🌐 {log.browser} / {log.os}</span>
                    {log.ipAddress && <span>📍 IP: {log.ipAddress}</span>}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                <button
                  disabled={page <= 1}
                  onClick={() => fetchLogs(page - 1)}
                  style={{
                    padding: '8px 16px', borderRadius: 9,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent', color: 'rgba(255,255,255,0.6)',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    fontSize: 12, opacity: page <= 1 ? 0.4 : 1,
                  }}
                >← Prev</button>
                <span style={{ padding: '8px 12px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => fetchLogs(page + 1)}
                  style={{
                    padding: '8px 16px', borderRadius: 9,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent', color: 'rgba(255,255,255,0.6)',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    fontSize: 12, opacity: page >= totalPages ? 0.4 : 1,
                  }}
                >Next →</button>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
