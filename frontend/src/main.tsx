import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import toast from 'react-hot-toast';

if ('serviceWorker' in navigator && (import.meta as any).env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registered:', reg.scope);

        // 1. Check for updates periodically (every 5 minutes)
        setInterval(() => {
          reg.update().catch((err) => console.log('Failed background SW update check:', err));
        }, 5 * 60 * 1000);

        // 2. Check for updates when user returns to/focuses the app
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            reg.update().catch((err) => console.log('Failed SW update check on visibility change:', err));
          }
        });

        // 3. Listen for updates to the service worker
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              // Trigger update prompt when the new worker becomes active
              if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                toast((t) => (
                  <div className="flex flex-col gap-2 p-1">
                    <p className="text-sm font-semibold text-white">A new update is available!</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          toast.dismiss(t.id);
                          window.location.reload();
                        }}
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
                  style: {
                    background: '#1a1d27',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    borderRadius: '16px',
                    padding: '12px'
                  }
                });
              }
            });
          }
        });
      })
      .catch((err) => console.error('Service Worker registration failed:', err));
  });
}

// 4. Online/Offline Network Status Monitoring
window.addEventListener('online', () => {
  toast.success('Back online! Syncing files.', {
    id: 'network-status',
    position: 'bottom-left',
    duration: 3000,
    style: {
      background: '#1e293b',
      border: '1px solid rgba(72, 187, 120, 0.2)',
      color: '#fff',
      fontSize: '13px'
    }
  });
});

window.addEventListener('offline', () => {
  toast.error('You are offline. Running in offline/cached mode.', {
    id: 'network-status',
    position: 'bottom-left',
    duration: Infinity,
    style: {
      background: '#1e293b',
      border: '1px solid rgba(252, 129, 129, 0.2)',
      color: '#fff',
      fontSize: '13px'
    }
  });
});

// 5. Store deferred install prompt for custom in-app install buttons
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredPrompt = e;
  window.dispatchEvent(new CustomEvent('app-installable'));
});



ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
