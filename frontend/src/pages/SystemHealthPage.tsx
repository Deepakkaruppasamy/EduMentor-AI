import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { healthService, SystemHealthData, AlertEntry, MetricSnapshot } from '../services/health.service';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   Utility helpers
───────────────────────────────────────────────────────────────────────────── */
const statusColor = (s: string) => {
  const v = s?.toLowerCase();
  if (v === 'healthy' || v === 'online' || v === 'connected') return '#22c55e';
  if (v === 'warning') return '#f59e0b';
  return '#ef4444';
};

const statusBg = (s: string) => {
  const v = s?.toLowerCase();
  if (v === 'healthy' || v === 'online' || v === 'connected') return 'rgba(34,197,94,0.12)';
  if (v === 'warning') return 'rgba(245,158,11,0.12)';
  return 'rgba(239,68,68,0.12)';
};

const statusLabel = (s: string) => {
  const v = s?.toLowerCase();
  if (v === 'healthy' || v === 'online' || v === 'connected') return 'HEALTHY';
  if (v === 'warning') return 'DEGRADED';
  return 'CRITICAL';
};

const statusIcon = (s: string) => {
  const v = s?.toLowerCase();
  if (v === 'healthy' || v === 'online' || v === 'connected') return '●';
  if (v === 'warning') return '◐';
  return '○';
};

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   SVG Ring Gauge
───────────────────────────────────────────────────────────────────────────── */
const RingGauge: React.FC<{
  value: number;
  max?: number;
  color: string;
  label: string;
  sublabel: string;
  size?: number;
}> = ({ value, max = 100, color, label, sublabel, size = 120 }) => {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  const dash = pct * circ;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
          {/* Fill */}
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={color} strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: 'stroke-dasharray 0.7s ease-in-out' }}
          />
        </svg>
        {/* Center value */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            {Math.round(value)}
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
            {max === 100 ? '%' : ''}
          </span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{sublabel}</div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Horizontal bar meter
───────────────────────────────────────────────────────────────────────────── */
const BarMeter: React.FC<{
  value: number; max?: number; color: string; label: string; sublabel?: string;
}> = ({ value, max = 100, color, label, sublabel }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
      <span style={{ fontWeight: 600, color: '#fff' }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{Math.round(value)}{max === 100 ? '%' : ''}</span>
    </div>
    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.min(100, (value / max) * 100)}%`,
        background: `linear-gradient(90deg, ${color}aa, ${color})`,
        borderRadius: 4, transition: 'width 0.6s ease-in-out',
      }} />
    </div>
    {sublabel && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{sublabel}</div>}
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   Service card
───────────────────────────────────────────────────────────────────────────── */
const ServiceCard: React.FC<{
  name: string;
  status: string;
  detail: string;
  detail2?: string;
  icon: string;
  hint?: string;
}> = ({ name, status, detail, detail2, icon, hint }) => {
  const [expanded, setExpanded] = useState(false);
  const col = statusColor(status);
  const bg = statusBg(status);
  const degraded = status !== 'healthy';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${degraded ? col + '40' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 14, padding: '14px 16px',
        cursor: hint ? 'pointer' : 'default',
        transition: 'border-color 0.2s',
      }}
      onClick={() => hint && setExpanded(e => !e)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Pulse dot */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: col, boxShadow: `0 0 8px ${col}`,
          }} />
          {degraded && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: col, opacity: 0.4,
              animation: 'pulse-ring 1.8s ease-out infinite',
            }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
            {icon} {name}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {detail}
          </div>
          {detail2 && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{detail2}</div>
          )}
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
          background: bg, color: col, letterSpacing: 0.5, flexShrink: 0,
        }}>
          {statusLabel(status)}
        </div>
      </div>
      <AnimatePresence>
        {expanded && hint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              marginTop: 12, padding: '10px 12px',
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 10,
              fontSize: 11.5, color: 'rgba(255,220,100,0.9)',
              lineHeight: 1.6,
            }}>
              💡 {hint}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Alert badge
───────────────────────────────────────────────────────────────────────────── */
const AlertBadge: React.FC<{ entry: AlertEntry }> = ({ entry }) => {
  const col = entry.severity === 'recovery' ? '#22c55e' : entry.severity === 'critical' ? '#ef4444' : '#f59e0b';
  const icon = entry.severity === 'recovery' ? '✅' : entry.severity === 'critical' ? '🔴' : '⚠️';
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '10px 14px',
      background: `${col}0d`, borderLeft: `3px solid ${col}`,
      borderRadius: '0 10px 10px 0', marginBottom: 8,
    }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
          {entry.service.toUpperCase()} — {entry.message}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
          {new Date(entry.timestamp).toLocaleTimeString()} · {timeAgo(entry.timestamp)}
          {entry.previousStatus && ` · ${entry.previousStatus} → ${entry.newStatus}`}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Custom sparkline tooltip
───────────────────────────────────────────────────────────────────────────── */
const SparkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '8px 12px', fontSize: 11,
    }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
        {label ? new Date(label).toLocaleTimeString() : ''}
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {p.value}{p.unit || ''}
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Card wrapper
───────────────────────────────────────────────────────────────────────────── */
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 20, padding: 22,
    backdropFilter: 'blur(8px)',
    ...style,
  }}>
    {children}
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 style={{
    fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 18px 0',
  }}>
    {children}
  </h3>
);

/* ─────────────────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────────────────── */
const REFRESH_INTERVAL = 10; // seconds

export const SystemHealthPage: React.FC = () => {
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [history, setHistory] = useState<MetricSnapshot[]>([]);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);
  const prevDataRef = useRef<SystemHealthData | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [healthRes, historyRes, alertsRes] = await Promise.all([
        healthService.getSystemHealth(),
        healthService.getMetricsHistory().catch(() => ({ history: [], total: 0, timestamp: '' })),
        healthService.getAlerts().catch(() => ({ alerts: [], total: 0, timestamp: '' })),
      ]);

      // Detect status changes and show toasts
      if (prevDataRef.current) {
        const prev = prevDataRef.current;
        const checks = [
          { name: 'MongoDB', prev: prev.database.mongodb.status, next: healthRes.database.mongodb.status },
          { name: 'ChromaDB', prev: prev.database.chromadb.status, next: healthRes.database.chromadb.status },
          { name: 'Groq API', prev: prev.aiServices.groq.status, next: healthRes.aiServices.groq.status },
        ];
        checks.forEach(({ name, prev: p, next: n }) => {
          if (p && n && p !== n) {
            if (n === 'healthy') toast.success(`✅ ${name} recovered!`);
            else if (n === 'critical') toast.error(`🔴 ${name} is now CRITICAL!`);
            else toast(`⚠️ ${name} is degraded`, { icon: '⚠️' });
          }
        });
      }
      prevDataRef.current = healthRes;

      setData(healthRes);
      setHistory(historyRes.history || []);
      setAlerts(alertsRes.alerts || []);
    } catch {
      toast.error('Failed to load system health telemetry.');
    } finally {
      setLoading(false);
      setCountdown(REFRESH_INTERVAL);
    }
  }, []);

  // Initial fetch
  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh with countdown
  useEffect(() => {
    if (!autoRefresh) { setCountdown(REFRESH_INTERVAL); return; }
    const fetchTimer = setInterval(fetchAll, REFRESH_INTERVAL * 1000);
    countdownRef.current = setInterval(() => setCountdown(c => c > 0 ? c - 1 : REFRESH_INTERVAL), 1000);
    return () => { clearInterval(fetchTimer); if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [autoRefresh, fetchAll]);

  // Export handler
  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ data, history, alerts, exportedAt: new Date().toISOString() }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-health-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Health report exported!');
  };

  if (loading && !data) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)', color: 'rgba(255,255,255,0.4)',
      }}>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            border: '3px solid rgba(79,99,255,0.2)',
            borderTop: '3px solid #4f63ff',
            animation: 'spin 0.9s linear infinite',
          }} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Loading System Health Telemetry…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const services = data ? [
    {
      id: 'mongodb', name: 'MongoDB Database', icon: '🍃',
      status: data.database.mongodb.status,
      detail: `${data.database.mongodb.label} · ${data.database.mongodb.dbSizeMb} MB · ${data.database.mongodb.collections} collections`,
      detail2: `Indexes: ${data.database.mongodb.indexes}`,
      hint: data.database.mongodb.status !== 'healthy'
        ? 'Ensure MongoDB is running and MONGODB_URI is correctly set in .env'
        : undefined,
    },
    {
      id: 'chromadb', name: 'Chroma Vector DB', icon: '🔮',
      status: data.database.chromadb.status,
      detail: data.database.chromadb.status === 'healthy'
        ? `${data.database.chromadb.collectionsCount} collection(s) · HTTP mode`
        : (data.database.chromadb.errorMessage || 'Offline'),
      detail2: `${data.database.chromadb.url}`,
      hint: data.database.chromadb.status !== 'healthy'
        ? 'Start ChromaDB with: chroma run --path ./chroma-data --port 8000 (requires pip install chromadb)'
        : undefined,
    },
    {
      id: 'groq', name: 'Groq Llama 3 API', icon: '🤖',
      status: data.aiServices.groq.status,
      detail: data.aiServices.groq.label,
      hint: data.aiServices.groq.status !== 'healthy' ? 'Set GROQ_API_KEY in your .env file. Get a key at console.groq.com' : undefined,
    },
    {
      id: 'embedding', name: 'HuggingFace Embeddings', icon: '🧠',
      status: data.aiServices.embedding.status,
      detail: data.aiServices.embedding.label,
      hint: data.aiServices.embedding.status !== 'healthy' ? 'Set HF_API_KEY in your .env. Get a token at huggingface.co/settings/tokens' : undefined,
    },
    {
      id: 'hybridrag', name: 'Hybrid RAG Engine', icon: '⚡',
      status: data.aiServices.hybridRag.status,
      detail: data.aiServices.hybridRag.label,
    },
    {
      id: 'smtp', name: 'SMTP Email Service', icon: '📧',
      status: data.communication.email.status,
      detail: data.communication.email.label,
      hint: data.communication.email.status !== 'healthy' ? 'Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env (Brevo, SendGrid, etc.)' : undefined,
    },
    {
      id: 'socket', name: 'Socket.IO Real-time', icon: '🔌',
      status: data.communication.socketIO.status,
      detail: data.communication.socketIO.label,
    },
  ] : [];

  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const degradedServices = alerts.filter(a => a.severity !== 'recovery').slice(0, 3);

  return (
    <div style={{
      minHeight: '100vh', padding: '28px 20px',
      background: 'var(--bg-primary)', color: 'var(--text-primary)',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes status-glow {
          0%, 100% { box-shadow: 0 0 12px currentColor; }
          50% { box-shadow: 0 0 24px currentColor; }
        }
      `}</style>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
              boxShadow: '0 8px 28px rgba(34,197,94,0.3)',
            }}>🖥️</div>
            <div>
              <h1 id="system-health-indicator" style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>
                System Health Dashboard
              </h1>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
                Real-time cluster telemetry · microservices · performance health
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Countdown */}
            {autoRefresh && (
              <div style={{
                fontSize: 12, color: 'rgba(255,255,255,0.4)',
                background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 12px',
                border: '1px solid rgba(255,255,255,0.07)', fontVariantNumeric: 'tabular-nums',
              }}>
                ⏱ {countdown}s
              </div>
            )}
            {/* Auto-refresh toggle */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5,
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '7px 14px',
            }}>
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)}
                style={{ width: 14, height: 14 }} />
              Auto-refresh (10s)
            </label>
            {/* Refresh now */}
            <button id="health-refresh-btn" onClick={fetchAll} style={{
              padding: '8px 16px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: '#fff',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
            }}>🔄 Refresh</button>
            {/* Export */}
            <button id="health-export-btn" onClick={handleExport} style={{
              padding: '8px 16px', borderRadius: 10,
              border: '1px solid rgba(79,99,255,0.3)',
              background: 'rgba(79,99,255,0.1)', color: '#818cf8',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
            }}>📥 Export</button>
          </div>
        </div>

        {/* ── Overall Status Banner ───────────────────────────────────────── */}
        {data && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: `${statusColor(data.overallStatus)}08`,
              border: `1px solid ${statusColor(data.overallStatus)}35`,
              borderLeft: `5px solid ${statusColor(data.overallStatus)}`,
              borderRadius: 18, padding: '18px 24px',
              marginBottom: 24,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: 16,
              backdropFilter: 'blur(6px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Animated pulse */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: statusColor(data.overallStatus),
                  boxShadow: `0 0 12px ${statusColor(data.overallStatus)}`,
                }} />
                {data.overallStatus !== 'healthy' && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: statusColor(data.overallStatus),
                    animation: 'pulse-ring 1.5s ease-out infinite',
                  }} />
                )}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
                  Cluster Status:&nbsp;
                  <span style={{ color: statusColor(data.overallStatus) }}>
                    {data.overallStatus.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                  Last check: {new Date(data.timestamp).toLocaleTimeString()} ·
                  Uptime: {data.infrastructure.os.uptimeDays}d {data.infrastructure.os.uptimeHours}h ·
                  Process: {formatUptime(data.application.processUptime)}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {/* Services up count */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>SERVICES</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginTop: 2 }}>
                  <span style={{ color: '#22c55e' }}>{healthyCount}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>/{services.length}</span>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>API LATENCY</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginTop: 2 }}>{data.responseTimeMs}ms</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>HEAP</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#818cf8', marginTop: 2 }}>{data.application.heapUsedMb}MB</div>
              </div>
            </div>
          </motion.div>
        )}

        {data && (
          <>
            {/* ── Row 1: Ring Gauges + App Telemetry ────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 20 }}>

              {/* Infrastructure Load */}
              <Card>
                <SectionTitle>Infrastructure Load</SectionTitle>
                <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 20, marginBottom: 20 }}>
                  <RingGauge
                    value={data.infrastructure.cpu.usage} color={statusColor(data.infrastructure.cpu.status)}
                    label="CPU" sublabel={`${data.infrastructure.cpu.cores} Cores`}
                  />
                  <RingGauge
                    value={data.infrastructure.memory.usedPercent} color={statusColor(data.infrastructure.memory.status)}
                    label="Memory" sublabel={`${data.infrastructure.memory.usedMb}/${data.infrastructure.memory.totalMb} MB`}
                  />
                  {data.infrastructure.disk.totalGb > 0 && (
                    <RingGauge
                      value={data.infrastructure.disk.usedPercent} color={statusColor(data.infrastructure.disk.status)}
                      label="Disk" sublabel={`${data.infrastructure.disk.usedGb}/${data.infrastructure.disk.totalGb} GB`}
                    />
                  )}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                  {data.infrastructure.cpu.model}
                </div>
              </Card>

              {/* Application Telemetry */}
              <Card>
                <SectionTitle>Application Telemetry</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {[
                    { label: 'HEAP USED', value: `${data.application.heapUsedMb} MB`, sub: `Allocated: ${data.application.heapTotalMb} MB`, color: '#818cf8' },
                    { label: 'NODE ENV', value: data.application.environment.toUpperCase(), sub: `v${data.application.nodeVersion.slice(1)}`, color: '#22c55e' },
                    { label: 'RSS MEMORY', value: `${data.application.rssMb} MB`, sub: `External: ${data.application.externalMb} MB`, color: '#06b6d4' },
                    { label: 'PROCESS UPTIME', value: formatUptime(data.application.processUptime), sub: `Handles: ${data.application.activeHandles}`, color: '#f59e0b' },
                  ].map(({ label, value, sub, color }) => (
                    <div key={label} style={{
                      background: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: '14px 12px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 0.5 }}>{label}</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color, marginTop: 6, lineHeight: 1 }}>{value}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* ── Row 2: Metrics History Sparklines ─────────────────────── */}
            {history.length > 1 && (
              <Card style={{ marginBottom: 20 }}>
                <SectionTitle>📈 Metrics History (Last {history.length} Polls)</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                  {/* CPU chart */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                      CPU Utilization %
                    </div>
                    <ResponsiveContainer width="100%" height={100}>
                      <AreaChart data={history} margin={{ top: 4, right: 0, left: -30, bottom: 0 }}>
                        <defs>
                          <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="timestamp" hide />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)' }} />
                        <Tooltip content={<SparkTooltip />} />
                        <Area type="monotone" dataKey="cpuPercent" name="CPU" unit="%" stroke="#22c55e" fill="url(#cpuGrad)" strokeWidth={1.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Memory chart */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                      Memory Utilization %
                    </div>
                    <ResponsiveContainer width="100%" height={100}>
                      <AreaChart data={history} margin={{ top: 4, right: 0, left: -30, bottom: 0 }}>
                        <defs>
                          <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="timestamp" hide />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)' }} />
                        <Tooltip content={<SparkTooltip />} />
                        <Area type="monotone" dataKey="memPercent" name="Memory" unit="%" stroke="#818cf8" fill="url(#memGrad)" strokeWidth={1.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Response time chart */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                      API Response Time (ms)
                    </div>
                    <ResponsiveContainer width="100%" height={100}>
                      <AreaChart data={history} margin={{ top: 4, right: 0, left: -30, bottom: 0 }}>
                        <defs>
                          <linearGradient id="rtGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="timestamp" hide />
                        <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)' }} />
                        <Tooltip content={<SparkTooltip />} />
                        <Area type="monotone" dataKey="responseTimeMs" name="Latency" unit="ms" stroke="#f59e0b" fill="url(#rtGrad)" strokeWidth={1.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            )}

            {/* ── Row 3: Microservices + AI Services ────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 20 }}>
              {/* Microservices & Databases */}
              <Card style={{ gridColumn: 'span 2' } as any}>
                <SectionTitle>🔧 Microservices & Databases Cluster</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                  {services.map(s => (
                    <ServiceCard key={s.id} name={s.name} status={s.status} icon={s.icon}
                      detail={s.detail} detail2={s.detail2} hint={s.hint} />
                  ))}
                </div>
              </Card>
            </div>

            {/* ── Row 4: Alert Log ──────────────────────────────────────── */}
            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <SectionTitle>🚨 Alert Log ({alerts.length})</SectionTitle>
                <button onClick={() => setShowAlerts(v => !v)} style={{
                  background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.5)', borderRadius: 8,
                  padding: '4px 10px', fontSize: 11, cursor: 'pointer',
                }}>
                  {showAlerts ? '▲ Collapse' : '▼ Expand'}
                </button>
              </div>
              <AnimatePresence>
                {showAlerts && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    {alerts.length === 0 ? (
                      <div style={{
                        textAlign: 'center', padding: '24px 0',
                        color: 'rgba(255,255,255,0.25)', fontSize: 13,
                      }}>
                        🟢 No alerts detected since last restart
                      </div>
                    ) : (
                      <div style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
                        {alerts.slice(0, 15).map(a => <AlertBadge key={a.id} entry={a} />)}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            {/* ── Row 5: Diagnostics Panel ──────────────────────────────── */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showDiagnostics ? 16 : 0 }}>
                <SectionTitle>🔍 Diagnostics Panel</SectionTitle>
                <button id="health-diagnostics-toggle" onClick={() => setShowDiagnostics(v => !v)} style={{
                  background: showDiagnostics ? 'rgba(79,99,255,0.15)' : 'none',
                  border: '1px solid rgba(79,99,255,0.3)',
                  color: '#818cf8', borderRadius: 8,
                  padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600,
                }}>
                  {showDiagnostics ? '▲ Hide' : '▼ Show Details'}
                </button>
              </div>
              <AnimatePresence>
                {showDiagnostics && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>

                      {/* Env Checklist */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                          Environment Variables
                        </div>
                        {Object.entries(data.diagnostics.envChecklist).map(([key, val]) => (
                          <div key={key} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                            fontSize: 12,
                          }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>{key}</span>
                            <span style={{ color: val ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 11 }}>
                              {val ? '✓ SET' : '✗ MISSING'}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* System Info */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                          System Info
                        </div>
                        {[
                          ['Platform', data.diagnostics.platform],
                          ['Architecture', data.diagnostics.arch],
                          ['Hostname', data.diagnostics.hostname],
                          ['Active Handles', String(data.diagnostics.activeHandles)],
                          ['Active Requests', String(data.diagnostics.activeRequests)],
                          ['MongoDB Indexes', String(data.diagnostics.mongoIndexes)],
                          ['Node Version', data.application.nodeVersion],
                        ].map(([k, v]) => (
                          <div key={k} style={{
                            display: 'flex', justifyContent: 'space-between',
                            padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12,
                          }}>
                            <span style={{ color: 'rgba(255,255,255,0.45)' }}>{k}</span>
                            <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: 11 }}>{v}</span>
                          </div>
                        ))}
                      </div>

                      {/* ChromaDB Collections */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                          ChromaDB Collections ({data.diagnostics.chromaCollections.length})
                        </div>
                        {data.diagnostics.chromaCollections.length === 0 ? (
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', padding: '8px 0' }}>
                            {data.database.chromadb.status === 'critical'
                              ? '⚠️ ChromaDB offline — cannot list collections'
                              : 'No collections yet. Upload documents to create collections.'}
                          </div>
                        ) : (
                          data.diagnostics.chromaCollections.map((col, i) => (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                            }}>
                              <span style={{ color: '#22c55e', fontSize: 10 }}>●</span>
                              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{col}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Raw JSON terminal */}
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        Raw Snapshot
                      </div>
                      <pre style={{
                        background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: '14px 16px',
                        fontSize: 10.5, color: 'rgba(255,255,255,0.5)',
                        overflowX: 'auto', maxHeight: 200, overflowY: 'auto',
                        fontFamily: '"Fira Code", "Cascadia Code", monospace',
                        border: '1px solid rgba(255,255,255,0.06)',
                        lineHeight: 1.6, margin: 0,
                      }}>
                        {JSON.stringify(data.diagnostics, null, 2)}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

          </>
        )}
      </div>
    </div>
  );
};
