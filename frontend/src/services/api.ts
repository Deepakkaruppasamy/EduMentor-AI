/**
 * api.ts — Axios instance with:
 * - JWT auth header injection
 * - Correlation ID on every request
 * - Retry interceptor with exponential backoff (safe errors only)
 * - 401 → auto logout
 * - Error logging
 */
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';
import { logError } from './errorLogger';
import { generateCorrelationId } from './correlationId';

// ─── Retry configuration ────────────────────────────────────────────────────

/** HTTP status codes safe to retry (server-side transient failures) */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

/** Never retry these — they indicate a deterministic client/auth error */
const NEVER_RETRY_STATUSES = new Set([400, 401, 403, 404, 409, 410, 422]);

/** Never retry these methods (non-idempotent and potentially dangerous) */
const SAFE_RETRY_METHODS = new Set(['GET', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']);

/** Exponential backoff delays in ms (retry 1, 2, 3) */
const BACKOFF_DELAYS = [1000, 2000, 4000];

const MAX_RETRIES = 3;

interface RetryConfig {
  _retryCount?: number;
  _skipRetry?: boolean;
}

// ─── Axios instance ─────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor ─────────────────────────────────────────────────────

api.interceptors.request.use(
  (config) => {
    // Attach JWT token
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach correlation ID for tracing
    config.headers['X-Correlation-ID'] = generateCorrelationId();

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor ────────────────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const config = error.config as AxiosRequestConfig & RetryConfig;
    const status = error.response?.status;
    const method = config?.method?.toUpperCase() ?? 'GET';

    // ── 401: Force logout ────────────────────────────────────────────────────
    if (status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // ── Log the error ────────────────────────────────────────────────────────
    logError(error, config?.url, status);

    // ── Should we retry? ─────────────────────────────────────────────────────
    if (
      config &&
      !config._skipRetry &&
      SAFE_RETRY_METHODS.has(method) &&
      !NEVER_RETRY_STATUSES.has(status ?? 0) &&
      (RETRYABLE_STATUSES.has(status ?? 0) || !error.response) // network error = no response
    ) {
      config._retryCount = config._retryCount ?? 0;

      if (config._retryCount < MAX_RETRIES) {
        config._retryCount++;

        // Handle Retry-After header for 429
        let delay = BACKOFF_DELAYS[config._retryCount - 1] ?? 4000;
        const retryAfter = error.response?.headers?.['retry-after'];
        if (retryAfter) {
          const parsed = parseInt(retryAfter, 10);
          if (!isNaN(parsed)) delay = Math.min(parsed * 1000, 30_000);
        }

        await sleep(delay);
        return api(config);
      }
    }

    return Promise.reject(error);
  }
);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default api;
