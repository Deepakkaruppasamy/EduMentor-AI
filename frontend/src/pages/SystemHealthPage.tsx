import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { healthService, SystemHealthData } from '../services/health.service';
import toast from 'react-hot-toast';

export const SystemHealthPage: React.FC = () => {
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = async () => {
    try {
      const res = await healthService.getSystemHealth();
      setData(res);
    } catch {
      toast.error('Failed to load system health telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchHealth();
    }, 10000);
    return () => clearInterval(timer);
  }, [autoRefresh]);

  if (loading && !data) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)',
        color: 'rgba(255,255,255,0.4)',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12, animation: 'spin 1.2s linear infinite' }}>⏳</div>
        <div>Loading System Health Telemetry Dashboard...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const statusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'healthy' || s === 'online' || s === 'connected') return '#22c55e'; // Green
    if (s === 'warning') return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const statusBg = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'healthy' || s === 'online' || s === 'connected') return 'rgba(34,197,94,0.1)';
    if (s === 'warning') return 'rgba(245,158,11,0.1)';
    return 'rgba(239,68,68,0.1)';
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '32px 24px',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 32, flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'linear-gradient(135deg, #22c55e, #10b981)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                boxShadow: '0 8px 24px rgba(34,197,94,0.35)',
              }}>🟢</div>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0 }}>
                  System Health Dashboard
                </h1>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
                  Real-time cluster telemetry, microservices state, and performance health
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                style={{ width: 15, height: 15, cursor: 'pointer' }}
              />
              Auto-refresh (10s)
            </label>
            <button
              onClick={fetchHealth}
              style={{
                padding: '9px 18px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 600,
                transition: 'all 0.15s',
              }}
            >
              🔄 Refresh Status
            </button>
          </div>
        </div>

        {/* Global Cluster Banner */}
        {data && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${statusColor(data.overallStatus)}30`,
            borderLeft: `5px solid ${statusColor(data.overallStatus)}`,
            borderRadius: 16,
            padding: '16px 20px',
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>🖥️</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                  Cluster Status: <span style={{ color: statusColor(data.overallStatus), textTransform: 'uppercase' }}>{data.overallStatus}</span>
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                Last Health Check: {new Date(data.timestamp).toLocaleTimeString()} · Uptime: {data.infrastructure.os.uptimeDays}d {data.infrastructure.os.uptimeHours}h
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>API LATENCY</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{data.responseTimeMs} ms</div>
              </div>
            </div>
          </div>
        )}

        {data && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {/* Core Infrastructure */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 20, padding: 22,
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Infrastructure Load
              </h3>
              
              {/* CPU Meter */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>CPU Utilization</span>
                  <span style={{ color: statusColor(data.infrastructure.cpu.status), fontWeight: 700 }}>
                    {data.infrastructure.cpu.usage}%
                  </span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${data.infrastructure.cpu.usage}%`,
                    background: statusColor(data.infrastructure.cpu.status),
                    transition: 'width 0.5s ease-in-out',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                  <span>{data.infrastructure.cpu.cores} Cores · {data.infrastructure.cpu.model}</span>
                </div>
              </div>

              {/* Memory Meter */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>System RAM</span>
                  <span style={{ color: statusColor(data.infrastructure.memory.status), fontWeight: 700 }}>
                    {data.infrastructure.memory.usedPercent}%
                  </span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${data.infrastructure.memory.usedPercent}%`,
                    background: statusColor(data.infrastructure.memory.status),
                    transition: 'width 0.5s ease-in-out',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                  <span>Used: {data.infrastructure.memory.usedMb} MB / {data.infrastructure.memory.totalMb} MB</span>
                  <span>Free: {data.infrastructure.memory.freeMb} MB</span>
                </div>
              </div>
            </div>

            {/* Performance Analytics (Approximated Live Gauges) */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 20, padding: 22,
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Application Telemetry
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, flex: 1 }}>
                <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>HEAP SIZE</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#818cf8', marginTop: 4 }}>{data.application.heapUsedMb} MB</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Allocated: {data.application.heapTotalMb} MB</div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>NODE ENVIRONMENT</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981', marginTop: 8, textTransform: 'uppercase' }}>{data.application.environment}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Version: {data.application.nodeVersion}</div>
                </div>
              </div>
            </div>

            {/* Microservices & Cloud Databases */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 20, padding: 22,
              gridColumn: 'span 2',
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Microservices &amp; Databases Cluster
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
              }}>
                {/* MongoDB */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: 14, padding: 14,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: statusColor(data.database.mongodb.status),
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>MongoDB Database</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      Size: {data.database.mongodb.dbSizeMb} MB · Collections: {data.database.mongodb.collections}
                    </div>
                  </div>
                </div>

                {/* ChromaDB */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: 14, padding: 14,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: statusColor(data.database.chromadb.status),
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Chroma Vector DB</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      RAG Vector Space Status
                    </div>
                  </div>
                </div>

                {/* Groq API */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: 14, padding: 14,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: statusColor(data.aiServices.groq.status),
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Groq Llama 3 API</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      {data.aiServices.groq.label}
                    </div>
                  </div>
                </div>

                {/* Communication services */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: 14, padding: 14,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: statusColor(data.communication.email.status),
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>SMTP Email Service</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      {data.communication.email.label}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
