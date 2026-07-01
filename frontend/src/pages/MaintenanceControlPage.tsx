import React, { useState, useEffect } from 'react';
import { maintenanceService, MaintenanceSettings } from '../services/maintenance.service';
import toast from 'react-hot-toast';

export const MaintenanceControlPage: React.FC = () => {
  const [settings, setSettings] = useState<MaintenanceSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [isEnabled, setIsEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  const fetchSettings = async () => {
    try {
      const res = await maintenanceService.getSettings();
      setSettings(res.settings);
      setIsEnabled(res.settings.isEnabled);
      setMessage(res.settings.message || '');
      setStartTime(res.settings.startTime ? new Date(res.settings.startTime).toISOString().slice(0, 16) : '');
      setEndTime(res.settings.endTime ? new Date(res.settings.endTime).toISOString().slice(0, 16) : '');
      setBannerUrl(res.settings.bannerUrl || '');
    } catch {
      toast.error('Failed to load maintenance settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await maintenanceService.updateSettings({
        isEnabled,
        message,
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
        bannerUrl: bannerUrl || undefined,
      });
      setSettings(res.settings);
      toast.success(res.message || 'Maintenance settings updated.');
    } catch {
      toast.error('Failed to update maintenance settings.');
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)', color: 'rgba(255,255,255,0.4)',
      }}>
        <div>Loading maintenance control deck...</div>
      </div>
    );
  }

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
            }}>🛠️</div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0 }}>
                Maintenance Manager
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
                Toggle global system offline mode, schedule maintenance window, and post message alerts
              </p>
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 24,
        }}>
          {/* Form configuration */}
          <form onSubmit={handleSubmit} style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
              🔧 Maintenance Mode Configuration
            </h3>

            {/* Toggle switch */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: '14px 16px',
            }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>Maintenance Status</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  {isEnabled ? '🔴 System is currently OFFLINE to non-admins' : '🟢 System is ONLINE'}
                </div>
              </div>
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={e => setIsEnabled(e.target.checked)}
                style={{ width: 44, height: 22, cursor: 'pointer' }}
              />
            </div>

            {/* Message alert */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>MAINTENANCE MESSAGE</span>
              <textarea
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type your system offline notice here..."
                style={{
                  padding: '10px 12px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.2)', color: '#fff',
                  fontSize: 12.5, outline: 'none', resize: 'none',
                  lineHeight: 1.5,
                }}
              />
            </div>

            {/* Start Time */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>SCHEDULE START TIME (OPTIONAL)</span>
              <input
                type="datetime-local"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                style={{
                  padding: '9px 12px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.2)', color: '#fff',
                  fontSize: 12.5, outline: 'none',
                }}
              />
            </div>

            {/* End Time */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>ESTIMATED END TIME (OPTIONAL)</span>
              <input
                type="datetime-local"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                style={{
                  padding: '9px 12px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.2)', color: '#fff',
                  fontSize: 12.5, outline: 'none',
                }}
              />
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
                marginTop: 8,
              }}
            >
              💾 Save Settings
            </button>
          </form>

          {/* Real-time preview */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              👁️ Student/Faculty Preview
            </h3>

            <div style={{
              background: '#090a0f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 280,
            }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🛠️</div>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 8px 0' }}>
                System Under Maintenance
              </h4>
              <p style={{
                fontSize: 12.5, color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.5, margin: '0 0 16px 0',
                maxWidth: 280,
              }}>
                {message || 'No notice message set.'}
              </p>
              {endTime && (
                <div style={{
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 10, padding: '8px 14px',
                  fontSize: 11, color: '#818cf8', fontWeight: 600,
                }}>
                  ⏱️ Estimated End: {new Date(endTime).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
