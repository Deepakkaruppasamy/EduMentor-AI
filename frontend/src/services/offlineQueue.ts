/**
 * offlineQueue.ts
 * IndexedDB-based mutation queue for offline-first PWA sync.
 *
 * SAFETY RULES (never queue these):
 *  - /auth/* endpoints (login, logout, register, password change)
 *  - /reset-password, /forgot-password
 *  - Any DELETE that requires server-side cascade (document deletion)
 *  - Payment or sensitive PII endpoints
 *
 * Only these operations are safe to queue:
 *  - PUT /preferences
 *  - POST /bookmarks, DELETE /bookmarks/[id]
 *  - POST /flashcards/[id]/review
 *  - POST /announcements/[id]/read
 *  - PUT /chat/sessions/[id] (rename)
 */

import { useSyncStore } from '../store/sync.store';

const DB_NAME = 'edumentor-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'mutations';

export interface QueuedMutation {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  tag: string;
  userId: string;
  retries: number;
  maxRetries: number;
  timestamp: string;
}

/** Endpoints safe to queue offline */
const SAFE_PATTERNS = [
  /^\/api\/preferences$/,
  /^\/api\/bookmarks(\/[a-z0-9]+)?$/,
  /^\/api\/flashcards\/[a-z0-9]+\/review$/,
  /^\/api\/announcements\/[a-z0-9]+\/read$/,
  /^\/api\/chat\/sessions\/[a-z0-9]+$/,
];

export function isQueueable(url: string, method: string): boolean {
  const path = url.replace(window.location.origin, '');
  return SAFE_PATTERNS.some((pattern) => pattern.test(path)) &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

// ─── IndexedDB helpers ──────────────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by_userId', 'userId');
        store.createIndex('by_timestamp', 'timestamp');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function txn(
  db: IDBDatabase,
  mode: IDBTransactionMode
): { store: IDBObjectStore; tx: IDBTransaction } {
  const tx = db.transaction(STORE_NAME, mode);
  return { store: tx.objectStore(STORE_NAME), tx };
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function enqueue(
  mutation: Omit<QueuedMutation, 'id' | 'retries' | 'timestamp'>
): Promise<string> {
  const db = await openDB();
  const { store } = txn(db, 'readwrite');
  const id = `mut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const item: QueuedMutation = {
    ...mutation,
    id,
    retries: 0,
    timestamp: new Date().toISOString(),
  };
  await idbRequest(store.add(item));
  await refreshPendingCount();
  return id;
}

export async function dequeue(id: string): Promise<void> {
  const db = await openDB();
  const { store } = txn(db, 'readwrite');
  await idbRequest(store.delete(id));
  await refreshPendingCount();
}

export async function getAllPending(userId: string): Promise<QueuedMutation[]> {
  const db = await openDB();
  const { store } = txn(db, 'readonly');
  const all = await idbRequest<QueuedMutation[]>(store.getAll());
  return all.filter((m) => m.userId === userId).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export async function getPendingCount(): Promise<number> {
  const db = await openDB();
  const { store } = txn(db, 'readonly');
  return idbRequest<number>(store.count());
}

async function refreshPendingCount(): Promise<void> {
  const count = await getPendingCount();
  useSyncStore.getState().setPendingCount(count);
}

export async function incrementRetry(id: string): Promise<void> {
  const db = await openDB();
  const { store } = txn(db, 'readwrite');
  const item = await idbRequest<QueuedMutation>(store.get(id));
  if (item) {
    await idbRequest(store.put({ ...item, retries: item.retries + 1 }));
  }
}

export async function clearAll(): Promise<void> {
  const db = await openDB();
  const { store } = txn(db, 'readwrite');
  await idbRequest(store.clear());
  useSyncStore.getState().setPendingCount(0);
}

// ─── Sync replay ─────────────────────────────────────────────────────────────

/**
 * Replay all queued mutations for a user.
 * Called when coming back online or by the SW Background Sync event.
 */
export async function replayQueue(userId: string, token: string): Promise<void> {
  const syncStore = useSyncStore.getState();
  const pending = await getAllPending(userId);
  if (pending.length === 0) return;

  syncStore.setStatus('syncing');

  let failedCount = 0;

  for (const mutation of pending) {
    try {
      const response = await fetch(mutation.url, {
        method: mutation.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Offline-Replay': 'true',
          ...(mutation.headers || {}),
        },
        body: mutation.body ? JSON.stringify(mutation.body) : undefined,
      });

      if (response.ok || response.status === 409) {
        // 409 = conflict — server has newer data, treat as resolved
        await dequeue(mutation.id);
      } else if (response.status === 404) {
        // Resource no longer exists — silently discard
        await dequeue(mutation.id);
      } else if (mutation.retries >= mutation.maxRetries) {
        // Give up after max retries
        await dequeue(mutation.id);
        syncStore.addError({
          tag: mutation.tag,
          message: `Failed to sync "${mutation.tag}" after ${mutation.maxRetries} retries`,
          timestamp: new Date().toISOString(),
        });
        failedCount++;
      } else {
        await incrementRetry(mutation.id);
        failedCount++;
      }
    } catch {
      // Network still down
      failedCount++;
      if (mutation.retries < mutation.maxRetries) {
        await incrementRetry(mutation.id);
      } else {
        await dequeue(mutation.id);
        failedCount++;
      }
    }
  }

  await refreshPendingCount();
  const remaining = await getPendingCount();
  syncStore.setLastSynced(new Date().toISOString());
  syncStore.setStatus(failedCount > 0 && remaining > 0 ? 'error' : 'online');
}
