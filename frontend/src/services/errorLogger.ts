/**
 * errorLogger.ts
 * Centralised error logging with correlation IDs.
 * Captures errors in-memory (max 20), classifies them,
 * and dispatches a CustomEvent so GlobalErrorListener can react.
 */
import { generateCorrelationId } from './correlationId';

export type ErrorCategory =
  | 'network'
  | 'auth'
  | 'validation'
  | 'server'
  | 'client'
  | 'unknown';

export interface AppError {
  correlationId: string;
  category: ErrorCategory;
  message: string;
  status?: number;
  url?: string;
  context?: string;
  timestamp: string;
  stack?: string;
}

const MAX_LOG = 20;
let errorLog: AppError[] = [];

function classifyError(error: unknown, status?: number): ErrorCategory {
  if (status === 401 || status === 403) return 'auth';
  if (status === 400 || status === 422) return 'validation';
  if (status && status >= 500) return 'server';
  if (status && status >= 400) return 'client';
  if (
    error instanceof TypeError &&
    (error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch'))
  )
    return 'network';
  if (error instanceof Error) return 'client';
  return 'unknown';
}

export function logError(
  error: unknown,
  context?: string,
  status?: number
): AppError {
  const axiosError = error as any;
  const resolvedStatus = status ?? axiosError?.response?.status;
  const message =
    axiosError?.response?.data?.message ??
    (error instanceof Error ? error.message : String(error));
  const url = axiosError?.config?.url;

  const entry: AppError = {
    correlationId: generateCorrelationId(),
    category: classifyError(error, resolvedStatus),
    message,
    status: resolvedStatus,
    url,
    context,
    timestamp: new Date().toISOString(),
    stack: error instanceof Error ? error.stack : undefined,
  };

  errorLog = [entry, ...errorLog].slice(0, MAX_LOG);

  // Dispatch custom event for GlobalErrorListener
  window.dispatchEvent(
    new CustomEvent('app:error', { detail: entry })
  );

  return entry;
}

export function getErrorLog(): AppError[] {
  return [...errorLog];
}

export function clearErrorLog(): void {
  errorLog = [];
}

export function getLatestCorrelationId(): string | null {
  return errorLog[0]?.correlationId ?? null;
}

/** Returns a short user-friendly message based on category */
export function getUserMessage(category: ErrorCategory): string {
  switch (category) {
    case 'network':
      return 'Network error. Please check your connection.';
    case 'auth':
      return 'Your session may have expired. Please log in again.';
    case 'validation':
      return 'Invalid data submitted. Please check your input.';
    case 'server':
      return 'Server error. Our team has been notified.';
    case 'client':
      return 'Something went wrong. Please try again.';
    default:
      return 'An unexpected error occurred.';
  }
}
