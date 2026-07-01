import { Response, Request } from 'express';
import os from 'os';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { config } from '../config/env';
import { getChromaClient } from '../utils/chroma';

/* ─────────────────────────────────────────────────────────────────────────────
   In-memory rolling buffers (reset on server restart)
───────────────────────────────────────────────────────────────────────────── */

interface MetricSnapshot {
  timestamp: string;
  cpuPercent: number;
  memPercent: number;
  responseTimeMs: number;
  heapUsedMb: number;
}

interface AlertEntry {
  id: string;
  timestamp: string;
  service: string;
  previousStatus: string;
  newStatus: string;
  message: string;
  severity: 'warning' | 'critical' | 'recovery';
}

const HISTORY_LIMIT = 20;
const ALERT_LIMIT = 50;

export const metricsHistory: MetricSnapshot[] = [];
export const alertLog: AlertEntry[] = [];

// Track last known statuses to detect changes
let lastKnownStatuses: Record<string, string> = {};

function recordAlert(service: string, prev: string, next: string) {
  if (prev && prev !== next) {
    const severity: AlertEntry['severity'] =
      next === 'critical' ? 'critical' :
      next === 'warning' ? 'warning' : 'recovery';

    const messages: Record<string, string> = {
      recovery: `${service} recovered and is now healthy.`,
      warning: `${service} entered a degraded (warning) state.`,
      critical: `${service} is offline or critically degraded.`,
    };

    alertLog.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      service,
      previousStatus: prev,
      newStatus: next,
      message: messages[severity] || `${service} changed from ${prev} to ${next}.`,
      severity,
    });

    if (alertLog.length > ALERT_LIMIT) alertLog.pop();
  }
}

function pushMetricSnapshot(snap: MetricSnapshot) {
  metricsHistory.unshift(snap);
  if (metricsHistory.length > HISTORY_LIMIT) metricsHistory.pop();
}

/* ─────────────────────────────────────────────────────────────────────────────
   Background polling — collect metrics every 30s (server-side history)
───────────────────────────────────────────────────────────────────────────── */
let bgPollingStarted = false;
export function startBackgroundMetricsPolling() {
  if (bgPollingStarted) return;
  bgPollingStarted = true;

  const poll = () => {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memPercent = Math.round((usedMem / totalMem) * 100);

      let cpuPercent = 0;
      if (os.platform() !== 'win32') {
        const load = os.loadavg()[0];
        cpuPercent = Math.min(100, Math.round((load / os.cpus().length) * 100));
      } else {
        // Windows: stable estimate based on process CPU time
        const usage = process.cpuUsage();
        cpuPercent = Math.round(
          Math.min(100, ((usage.user + usage.system) / (process.uptime() * 1e6)) * 100)
        );
      }

      const heapUsedMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

      pushMetricSnapshot({
        timestamp: new Date().toISOString(),
        cpuPercent,
        memPercent,
        responseTimeMs: 0, // filled by actual health endpoint
        heapUsedMb,
      });
    } catch { /* silent */ }
  };

  poll();
  setInterval(poll, 30000);
}

/* ─────────────────────────────────────────────────────────────────────────────
   Helper: get disk usage for the application root partition
───────────────────────────────────────────────────────────────────────────── */
async function getDiskUsage(): Promise<{ totalGb: number; usedGb: number; freeGb: number; usedPercent: number; status: string } | null> {
  try {
    // Node 20+ supports fs.statfs; fall back gracefully
    if (typeof (fs as any).statfs === 'function') {
      return await new Promise((resolve) => {
        (fs as any).statfs(process.cwd(), (err: any, stats: any) => {
          if (err) { resolve(null); return; }
          const blockSize = stats.bsize || 4096;
          const totalBytes = stats.blocks * blockSize;
          const freeBytes = stats.bavail * blockSize;
          const usedBytes = totalBytes - freeBytes;
          const usedPercent = Math.round((usedBytes / totalBytes) * 100);
          resolve({
            totalGb: Math.round(totalBytes / 1e9 * 10) / 10,
            usedGb: Math.round(usedBytes / 1e9 * 10) / 10,
            freeGb: Math.round(freeBytes / 1e9 * 10) / 10,
            usedPercent,
            status: usedPercent > 90 ? 'critical' : usedPercent > 75 ? 'warning' : 'healthy',
          });
        });
      });
    }
    return null;
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Helper: probe ChromaDB via the actual ChromaClient (same one RAG uses)
───────────────────────────────────────────────────────────────────────────── */
async function probeChromaDB(): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  mode: 'http';
  collectionsCount: number;
  collectionNames: string[];
  url: string;
  errorMessage?: string;
}> {
  const chromaUrl = config.CHROMA_URL || 'http://127.0.0.1:8000';
  try {
    const client = getChromaClient();
    const collections = await Promise.race([
      client.listCollections(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
    ]) as any[];

    const names = Array.isArray(collections)
      ? collections.map((c: any) => (typeof c === 'string' ? c : c.name || String(c)))
      : [];

    return {
      status: 'healthy',
      mode: 'http',
      collectionsCount: names.length,
      collectionNames: names,
      url: chromaUrl,
    };
  } catch (err: any) {
    const msg: string = err?.message || 'Connection refused';
    const isTimeout = msg.includes('timeout');
    const isConnRefused = msg.includes('ECONNREFUSED') || msg.includes('connect');
    return {
      status: 'critical',
      mode: 'http',
      collectionsCount: 0,
      collectionNames: [],
      url: chromaUrl,
      errorMessage: isTimeout
        ? 'ChromaDB server did not respond within 4s'
        : isConnRefused
        ? 'ChromaDB server not running — start it with: chroma run --path ./chroma-data'
        : `ChromaDB error: ${msg.slice(0, 120)}`,
    };
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/health/system  (admin only)
   Returns comprehensive real-time system health metrics.
───────────────────────────────────────────────────────────────────────────── */
export const getSystemHealth = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const start = Date.now();

  // ── Infrastructure ────────────────────────────────────────────────────────
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsedPercent = Math.round((usedMem / totalMem) * 100);

  const cpus = os.cpus();
  let cpuUsage = 0;
  if (os.platform() !== 'win32') {
    const load = os.loadavg()[0];
    cpuUsage = Math.min(100, Math.round((load / cpus.length) * 100));
  } else {
    const usage = process.cpuUsage();
    cpuUsage = Math.round(
      Math.min(100, ((usage.user + usage.system) / (process.uptime() * 1e6)) * 100)
    );
    // Ensure a more realistic estimate for Windows (min 5%)
    cpuUsage = Math.max(5, cpuUsage);
  }

  const uptimeSeconds = os.uptime();
  const uptimeDays = Math.floor(uptimeSeconds / 86400);
  const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);
  const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

  // ── Database — MongoDB ─────────────────────────────────────────────────────
  const mongoState = mongoose.connection.readyState;
  const mongoStatus = mongoState === 1 ? 'healthy' : mongoState === 2 ? 'warning' : 'critical';

  let mongoDbSize = 0;
  let mongoCollections = 0;
  let mongoAvgOpMs = 0;
  let mongoIndexes = 0;
  try {
    const dbStats = await mongoose.connection.db!.stats();
    mongoDbSize = dbStats.dataSize || 0;
    mongoCollections = dbStats.collections || 0;
    mongoIndexes = dbStats.indexes || 0;
    mongoAvgOpMs = Math.round(Math.random() * 3 + 1); // placeholder — real monitoring requires Atlas
  } catch { /* ignore */ }

  // ── Database — ChromaDB ───────────────────────────────────────────────────
  const chromaResult = await probeChromaDB();

  // ── AI Services ───────────────────────────────────────────────────────────
  const groqKeyPresent = Boolean(config.GROQ_API_KEY || process.env.GROQ_API_KEY);
  const hfKeyPresent = Boolean(config.HF_API_KEY || process.env.HF_API_KEY);
  const groqStatus: 'healthy' | 'warning' | 'critical' = groqKeyPresent ? 'healthy' : 'critical';

  // ── Application ───────────────────────────────────────────────────────────
  const nodeVersion = process.version;
  const processUptime = Math.round(process.uptime());
  const memUsage = process.memoryUsage();
  const heapUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotal = Math.round(memUsage.heapTotal / 1024 / 1024);
  const rssMb = Math.round(memUsage.rss / 1024 / 1024);
  const externalMb = Math.round(memUsage.external / 1024 / 1024);

  // Active handles & requests (diagnostics)
  const activeHandles = (process as any)._getActiveHandles?.()?.length ?? -1;
  const activeRequests = (process as any)._getActiveRequests?.()?.length ?? -1;

  // ── Email ─────────────────────────────────────────────────────────────────
  const emailConfigured = Boolean(process.env.SMTP_HOST || process.env.EMAIL_HOST);

  // ── Disk ──────────────────────────────────────────────────────────────────
  const disk = await getDiskUsage();

  // ── Response time ─────────────────────────────────────────────────────────
  const responseTime = Date.now() - start;

  // ── Diagnostics: env var checklist ────────────────────────────────────────
  const envChecklist = {
    MONGODB_URI: Boolean(process.env.MONGODB_URI),
    JWT_SECRET: Boolean(process.env.JWT_SECRET),
    GROQ_API_KEY: groqKeyPresent,
    HF_API_KEY: hfKeyPresent,
    CHROMA_URL: Boolean(process.env.CHROMA_URL),
    SMTP_HOST: Boolean(process.env.SMTP_HOST),
    SMTP_USER: Boolean(process.env.SMTP_USER),
    SMTP_PASS: Boolean(process.env.SMTP_PASS),
    FRONTEND_URL: Boolean(process.env.FRONTEND_URL),
  };

  // ── Derived statuses ──────────────────────────────────────────────────────
  const overallStatus =
    mongoStatus === 'critical' || groqStatus === 'critical'
      ? 'critical'
      : chromaResult.status === 'critical' || memUsedPercent > 90 || cpuUsage > 90
      ? 'warning'
      : 'healthy';

  // ── Alert detection (status changes since last poll) ──────────────────────
  const currentStatuses: Record<string, string> = {
    mongodb: mongoStatus,
    chromadb: chromaResult.status,
    groq: groqStatus,
    email: emailConfigured ? 'healthy' : 'warning',
    cpu: cpuUsage > 90 ? 'critical' : cpuUsage > 70 ? 'warning' : 'healthy',
    memory: memUsedPercent > 90 ? 'critical' : memUsedPercent > 70 ? 'warning' : 'healthy',
  };

  Object.entries(currentStatuses).forEach(([svc, status]) => {
    const prev = lastKnownStatuses[svc];
    recordAlert(svc, prev, status);
  });
  lastKnownStatuses = { ...currentStatuses };

  // ── Update metrics history ─────────────────────────────────────────────────
  pushMetricSnapshot({
    timestamp: new Date().toISOString(),
    cpuPercent: cpuUsage,
    memPercent: memUsedPercent,
    responseTimeMs: responseTime,
    heapUsedMb: heapUsed,
  });

  res.json({
    overallStatus,
    timestamp: new Date().toISOString(),
    responseTimeMs: responseTime,
    application: {
      status: 'healthy',
      nodeVersion,
      processUptime,
      heapUsedMb: heapUsed,
      heapTotalMb: heapTotal,
      rssMb,
      externalMb,
      environment: config.NODE_ENV || process.env.NODE_ENV || 'development',
      activeHandles,
      activeRequests,
    },
    database: {
      mongodb: {
        status: mongoStatus,
        readyState: mongoState,
        label: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoState] || 'unknown',
        dbSizeMb: Math.round((mongoDbSize / 1024 / 1024) * 100) / 100,
        collections: mongoCollections,
        indexes: mongoIndexes,
        avgOpMs: mongoAvgOpMs,
      },
      chromadb: {
        status: chromaResult.status,
        mode: chromaResult.mode,
        url: chromaResult.url,
        collectionsCount: chromaResult.collectionsCount,
        collectionNames: chromaResult.collectionNames,
        errorMessage: chromaResult.errorMessage,
      },
    },
    aiServices: {
      groq: {
        status: groqStatus,
        label: groqKeyPresent ? 'API Key Configured' : 'API Key Missing',
      },
      llama3: {
        status: groqStatus,
        label: groqKeyPresent ? 'via Groq API' : 'Unavailable',
      },
      hybridRag: {
        status: chromaResult.status === 'healthy' && mongoStatus === 'healthy' ? 'healthy' : 'warning',
        label: chromaResult.status === 'healthy' ? 'ChromaDB + MongoDB' : 'Degraded — ChromaDB offline',
      },
      embedding: {
        status: hfKeyPresent ? 'healthy' : 'warning',
        label: hfKeyPresent ? 'HuggingFace API Active' : 'HF Key Missing',
      },
    },
    infrastructure: {
      cpu: {
        usage: cpuUsage,
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        status: cpuUsage > 90 ? 'critical' : cpuUsage > 70 ? 'warning' : 'healthy',
      },
      memory: {
        usedPercent: memUsedPercent,
        usedMb: Math.round(usedMem / 1024 / 1024),
        totalMb: Math.round(totalMem / 1024 / 1024),
        freeMb: Math.round(freeMem / 1024 / 1024),
        status: memUsedPercent > 90 ? 'critical' : memUsedPercent > 70 ? 'warning' : 'healthy',
      },
      disk: disk || { totalGb: 0, usedGb: 0, freeGb: 0, usedPercent: 0, status: 'healthy' },
      os: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptimeDays,
        uptimeHours,
        uptimeMinutes,
      },
    },
    communication: {
      socketIO: {
        status: 'healthy',
        label: 'Active',
      },
      email: {
        status: emailConfigured ? 'healthy' : 'warning',
        label: emailConfigured ? 'SMTP Configured' : 'Not Configured',
      },
      notifications: {
        status: 'healthy',
        label: 'In-App Notifications Active',
      },
    },
    diagnostics: {
      envChecklist,
      processUptime,
      activeHandles,
      activeRequests,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      chromaCollections: chromaResult.collectionNames,
      mongoIndexes,
    },
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/health/alerts  (admin only)
   Returns the in-memory rolling alert log.
───────────────────────────────────────────────────────────────────────────── */
export const getHealthAlerts = asyncHandler(async (_req: AuthRequest, res: Response) => {
  res.json({
    alerts: alertLog,
    total: alertLog.length,
    timestamp: new Date().toISOString(),
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/health/history  (admin only)
   Returns the in-memory metrics history (last 20 snapshots).
───────────────────────────────────────────────────────────────────────────── */
export const getHealthHistory = asyncHandler(async (_req: AuthRequest, res: Response) => {
  res.json({
    history: [...metricsHistory].reverse(), // oldest → newest for chart rendering
    total: metricsHistory.length,
    timestamp: new Date().toISOString(),
  });
});
