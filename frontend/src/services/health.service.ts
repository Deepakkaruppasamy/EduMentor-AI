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
    environment: string;
  };
  database: {
    mongodb: {
      status: 'healthy' | 'warning' | 'critical';
      readyState: number;
      label: string;
      dbSizeMb: number;
      collections: number;
    };
    chromadb: {
      status: 'healthy' | 'warning' | 'critical';
      url: string;
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
}

export const healthService = {
  getSystemHealth: async (): Promise<SystemHealthData> => {
    const res = await api.get('/health/system');
    return res.data;
  },
};
