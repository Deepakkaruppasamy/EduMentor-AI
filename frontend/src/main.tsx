import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import toast from 'react-hot-toast';
import { useSyncStore } from './store/sync.store';
import { replayQueue } from './services/offlineQueue';
import { useAuthStore } from './store/auth.store';

// ── Service Worker Registration ───────────────────────────────────────────────
if ('serviceWorker' in navigator && (import.meta as any).env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[SW] Registered:', reg.scope);

        // 1. Periodic update check (every 5 minutes)
        setInterval(() => {
          reg.update().catch(() => {});
        }, 5 * 60 * 1000);

        // 2. Update on tab focus
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            reg.update().catch(() => {});
          }
        });

        // 3. New version toast
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                toast((t) => (
                  <div className="flex flex-col gap-2 p-1">
                    <p className="text-sm font-semibold text-white">A new update is available!</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { toast.dismiss(t.id); window.location.reload(); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1 px-3 rounded-lg transition-all"
                      >
                        Update Now
                      </button>
                      <button
                        onClick={() => toast.dismiss(t.id)}
                        className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-1 px-3 rounded-lg transition-all"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ), {
                  duration: Infinity,
                  position: 'bottom-right',
                  style: { background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '16px', padding: '12px' }
                });
              }
            });
          }
        });

        // 4. Listen for SW_SYNC_TRIGGER message (from Background Sync event)
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'SW_SYNC_TRIGGER') {
            const { token, user } = useAuthStore.getState();
            if (token && user) {
              replayQueue(user.id, token).catch(console.warn);
            }
          }
          if (event.data?.type === 'NAVIGATE') {
            window.location.href = event.data.link;
          }
        });
      })
      .catch((err) => console.error('[SW] Registration failed:', err));
  });
}

// ── Online / Offline Network Monitoring (wired to sync store) ────────────────
window.addEventListener('online', async () => {
  useSyncStore.getState().setStatus('online');
  toast.dismiss('network-offline');
  toast.success('Back online! Syncing queued actions…', {
    id: 'network-status',
    position: 'bottom-left',
    duration: 3000,
    style: { background: '#1e293b', border: '1px solid rgba(52,168,122,0.2)', color: '#fff', fontSize: '13px' }
  });

  // Trigger queue replay (fallback if SW Background Sync not available)
  const { token, user } = useAuthStore.getState();
  if (token && user) {
    // Try Background Sync API first
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await (reg as any).sync.register('edumentor-mutation-sync');
      } catch {
        // Background Sync not available — fall back to direct replay
        replayQueue(user.id, token).catch(console.warn);
      }
    } else {
      replayQueue(user.id, token).catch(console.warn);
    }
  }
});

window.addEventListener('offline', () => {
  useSyncStore.getState().setStatus('offline');
  toast.dismiss('network-status');
  toast.error('You are offline. Changes will sync when reconnected.', {
    id: 'network-offline',
    position: 'bottom-left',
    duration: Infinity,
    style: { background: '#1e293b', border: '1px solid rgba(192,82,74,0.2)', color: '#fff', fontSize: '13px' }
  });
});

// ── PWA Install Prompt ────────────────────────────────────────────────────────
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredPrompt = e;
  window.dispatchEvent(new CustomEvent('app-installable'));
});

// ── Render ────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
