import api from './api';

export interface SystemHealthData {
  overallStatus: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  responseTimeMs: number;
  application: {
    status: string;
    nodeVersion: string;
    processUptime: number;
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
    externalMb: number;
    environment: string;
    activeHandles: number;
    activeRequests: number;
  };
  database: {
    mongodb: {
      status: 'healthy' | 'warning' | 'critical';
      readyState: number;
      label: string;
      dbSizeMb: number;
      collections: number;
      indexes: number;
      avgOpMs: number;
    };
    chromadb: {
      status: 'healthy' | 'warning' | 'critical';
      mode: 'http' | 'embedded';
      url: string;
      collectionsCount: number;
      collectionNames: string[];
      errorMessage?: string;
    };
  };
  aiServices: {
    groq: { status: string; label: string };
    llama3: { status: string; label: string };
    hybridRag: { status: string; label: string };
    embedding: { status: string; label: string };
  };
  infrastructure: {
    cpu: {
      usage: number;
      cores: number;
      model: string;
      status: 'healthy' | 'warning' | 'critical';
    };
    memory: {
      usedPercent: number;
      usedMb: number;
      totalMb: number;
      freeMb: number;
      status: 'healthy' | 'warning' | 'critical';
    };
    disk: {
      totalGb: number;
      usedGb: number;
      freeGb: number;
      usedPercent: number;
      status: string;
    };
    os: {
      platform: string;
      arch: string;
      hostname: string;
      uptimeDays: number;
      uptimeHours: number;
      uptimeMinutes: number;
    };
  };
  communication: {
    socketIO: { status: string; label: string };
    email: { status: string; label: string };
    notifications: { status: string; label: string };
  };
  diagnostics: {
    envChecklist: Record<string, boolean>;
    processUptime: number;
    activeHandles: number;
    activeRequests: number;
    platform: string;
    arch: string;
    hostname: string;
    chromaCollections: string[];
    mongoIndexes: number;
  };
}

export interface AlertEntry {
  id: string;
  timestamp: string;
  service: string;
  previousStatus: string;
  newStatus: string;
  message: string;
  severity: 'warning' | 'critical' | 'recovery';
}

export interface MetricSnapshot {
  timestamp: string;
  cpuPercent: number;
  memPercent: number;
  responseTimeMs: number;
  heapUsedMb: number;
}

export const healthService = {
  getSystemHealth: async (): Promise<SystemHealthData> => {
    const res = await api.get('/health/system');
    return res.data;
  },

  getAlerts: async (): Promise<{ alerts: AlertEntry[]; total: number; timestamp: string }> => {
    const res = await api.get('/health/alerts');
    return res.data;
  },

  getMetricsHistory: async (): Promise<{ history: MetricSnapshot[]; total: number; timestamp: string }> => {
    const res = await api.get('/health/history');
    return res.data;
  },
};
