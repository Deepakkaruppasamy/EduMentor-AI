/**
 * SplashScreen.tsx
 *
 * Coordinates the PWA launch splash screen injected in index.html.
 * - Reads window.__IS_PWA__ to know if running as installed PWA
 * - Calls window.__dismissSplash__(delay) once the React app is mounted
 * - Shows a subtle "app open" transition for the first render in PWA mode
 */

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    __IS_PWA__: boolean;
    __SPLASH_SHOWN__: boolean;
    __dismissSplash__: (delay?: number) => void;
  }
}

interface SplashScreenProps {
  /** Minimum time (ms) to show the splash in PWA mode. Default: 1800ms */
  minDisplayMs?: number;
}

export function SplashScreen({ minDisplayMs = 1800 }: SplashScreenProps) {
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;

    const isPWA = window.__IS_PWA__ === true;
    const dismiss = window.__dismissSplash__;

    if (typeof dismiss !== 'function') return;

    if (isPWA) {
      // PWA mode — show splash for minDisplayMs then fade out
      dismiss(minDisplayMs);

      // Add the CSS entrance animation class to #root
      const root = document.getElementById('root');
      if (root) {
        // Small delay so the class takes effect after splash fades
        setTimeout(() => {
          root.classList.add('pwa-launch-enter');
          // Remove class after animation completes
          setTimeout(() => root.classList.remove('pwa-launch-enter'), 700);
        }, minDisplayMs + 50);
      }
    } else {
      // Browser mode — splash already dismissed quickly by inline script
      dismiss(0);
    }
  }, [minDisplayMs]);

  // This component renders nothing — it only has side effects
  return null;
}
