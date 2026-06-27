import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';

export const InactivityHandler: React.FC = () => {
  const { isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  
  const timeoutVal = 15 * 60 * 1000; // 15 minutes
  const warningVal = 14 * 60 * 1000; // 14 minutes (1 minute warning)
  
  const timerRef = useRef<any>(null);
  const warningTimerRef = useRef<any>(null);
  const warningToastIdRef = useRef<string | null>(null);

  const resetTimer = () => {
    // Clear existing timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    
    // Dismiss warning toast if it was shown
    if (warningToastIdRef.current) {
      toast.dismiss(warningToastIdRef.current);
      warningToastIdRef.current = null;
    }

    if (!isAuthenticated) return;

    // Set warning timer (warn at 14 minutes)
    warningTimerRef.current = setTimeout(() => {
      warningToastIdRef.current = toast.error(
        'Session Warning: You have been inactive. You will be logged out in 1 minute due to security policy.',
        { duration: 60000, id: 'inactivity-warning' }
      );
    }, warningVal);

    // Set logout timer (logout at 15 minutes)
    timerRef.current = setTimeout(() => {
      logout();
      toast.error('Session timed out. Please sign in again.');
      navigate('/login');
    }, timeoutVal);
  };

  useEffect(() => {
    if (isAuthenticated) {
      // Activity events to listen to
      const events = ['mousemove', 'keydown', 'mousedown', 'click', 'scroll', 'touchstart'];
      
      const handleActivity = () => resetTimer();

      // Set initial timer
      resetTimer();

      // Bind events
      events.forEach(event => {
        window.addEventListener(event, handleActivity);
      });

      return () => {
        // Cleanup timers and listeners
        if (timerRef.current) clearTimeout(timerRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        if (warningToastIdRef.current) toast.dismiss(warningToastIdRef.current);
        
        events.forEach(event => {
          window.removeEventListener(event, handleActivity);
        });
      };
    }
  }, [isAuthenticated]);

  return null;
};
