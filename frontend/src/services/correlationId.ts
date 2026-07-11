/**
 * correlationId.ts
 * Helper to generate correlation IDs without circular imports.
 */
import { useAuthStore } from '../store/auth.store';

export function generateCorrelationId(): string {
  const userId = useAuthStore.getState().user?.id ?? 'anon';
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${userId}-${ts}-${rand}`;
}
