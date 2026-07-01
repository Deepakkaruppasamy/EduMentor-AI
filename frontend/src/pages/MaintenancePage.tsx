import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { maintenanceService } from '../services/maintenance.service';

export const MaintenancePage: React.FC = () => {
  const [message, setMessage] = useState('EduMentor AI is currently undergoing scheduled maintenance to improve system stability. We will be back shortly!');
  const [endTime, setEndTime] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  const checkStatus = async () => {
    try {
      const res = await maintenanceService.getStatus();
      if (!res.isEnabled) {
        // If maintenance turned off, reload to dashboard
        window.location.href = '/dashboard';
        return;
      }
      if (res.message) setMessage(res.message);
      if (res.endTime) setEndTime(res.endTime);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!endTime) return;

    const timer = setInterval(() => {
      const difference = new Date(endTime).getTime() - Date.now();
      if (difference <= 0) {
        clearInterval(timer);
        setTimeLeft(null);
        window.location.href = '/dashboard';
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#090a0f',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#fff', padding: 24, zIndex: 999999,
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Background radial glow */}
      <div style={{
        position: 'absolute', width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(0,0,0,0) 70%)',
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        pointerEvents: 'none', zIndex: -1,
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          maxWidth: 480, width: '100%', textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: 24, padding: '40px 32px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 20 }}>🛠️</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 12px 0' }}>
          System Under Maintenance
        </h1>
        
        <p style={{
          fontSize: 14, color: 'rgba(255,255,255,0.6)',
          lineHeight: 1.6, margin: '0 0 32px 0',
        }}>
          {message}
        </p>

        {timeLeft && (
          <div style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 16, padding: '16px 20px',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#818cf8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Estimated Time Remaining
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
              {[
                { label: 'Hours', value: timeLeft.hours },
                { label: 'Minutes', value: timeLeft.minutes },
                { label: 'Seconds', value: timeLeft.seconds },
              ].map(t => (
                <div key={t.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>
                    {String(t.value).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginTop: 2 }}>
                    {t.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
          Only authorized administrators can log in during this period.
        </div>
      </motion.div>
    </div>
  );
};
