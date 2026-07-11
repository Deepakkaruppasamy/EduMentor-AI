import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import { AppError, getUserMessage } from '../../services/errorLogger';

export const GlobalErrorListener: React.FC = () => {
  useEffect(() => {
    // 1. Handle unhandled promise rejections globally
    const handleRejection = (event: PromiseRejectionEvent) => {
      // Don't show noise for cancellation exceptions or network timeouts
      if (event.reason?.name === 'CanceledError' || event.reason?.message === 'canceled') {
        return;
      }
      console.warn('[Global Rejection Handler]', event.reason);
    };

    // 2. Handle Custom app:error events logged by Axios/Services
    const handleAppError = (event: Event) => {
      const appErr = (event as CustomEvent<AppError>).detail;

      // Handle network errors with non-blocking offline/recovery toast
      if (appErr.category === 'network') {
        toast.error(
          <div>
            <p className="font-bold text-xs">🌐 Network Timeout</p>
            <p className="text-[10px] text-white/70 mt-0.5">Please check your connection. Actions will sync when online.</p>
          </div>,
          { id: 'network-err-toast', duration: 4000 }
        );
        return;
      }

      // Handle critical server errors (500s) with support details
      if (appErr.category === 'server') {
        toast.error(
          <div>
            <p className="font-bold text-xs">⚠️ Server degraded</p>
            <p className="text-[10px] text-white/70 mt-0.5">{appErr.message}</p>
            <p className="text-[9px] text-white/30 mt-1 font-mono">ID: {appErr.correlationId}</p>
          </div>,
          { id: `server-err-${appErr.correlationId}`, duration: 8000 }
        );
        return;
      }

      // Handle general API client errors
      if (appErr.category === 'client') {
        toast.error(getUserMessage(appErr.category), { duration: 3000 });
      }
    };

    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('app:error', handleAppError);

    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('app:error', handleAppError);
    };
  }, []);

  return null;
};
