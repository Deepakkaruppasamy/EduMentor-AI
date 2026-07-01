import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import MaintenanceSettings from '../models/MaintenanceSettings';
import { asyncHandler } from '../middleware/errorHandler';

/* ─────────────────────────────────────────────────────────────────────────────
   Helper: get or create the singleton maintenance doc
───────────────────────────────────────────────────────────────────────────── */
async function getOrCreateSettings() {
  let settings = await MaintenanceSettings.findOne();
  if (!settings) {
    settings = await MaintenanceSettings.create({
      isEnabled: false,
      message: 'EduMentor AI is undergoing scheduled maintenance. We will be back shortly.',
    });
  }
  return settings;
}

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/maintenance/status  — PUBLIC, no auth needed
   Used by frontend on app load to decide whether to show maintenance page.
───────────────────────────────────────────────────────────────────────────── */
export const getMaintenanceStatus = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getOrCreateSettings();

  // Auto-disable if past end time
  if (settings.isEnabled && settings.endTime && settings.endTime < new Date()) {
    settings.isEnabled = false;
    await settings.save();
  }

  // Auto-enable if scheduled start time has passed
  if (!settings.isEnabled && settings.startTime && settings.startTime <= new Date()) {
    if (!settings.endTime || settings.endTime > new Date()) {
      settings.isEnabled = true;
      await settings.save();
    }
  }

  res.json({
    isEnabled: settings.isEnabled,
    message: settings.message,
    startTime: settings.startTime,
    endTime: settings.endTime,
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/maintenance  — Admin only, full settings
───────────────────────────────────────────────────────────────────────────── */
export const getMaintenanceSettings = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const settings = await getOrCreateSettings();
  res.json({ settings });
});

/* ─────────────────────────────────────────────────────────────────────────────
   PUT /api/maintenance  — Admin only
   Enable/disable maintenance, set message and schedule.
───────────────────────────────────────────────────────────────────────────── */
export const updateMaintenance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { isEnabled, message, startTime, endTime, bannerUrl } = req.body;

  const settings = await getOrCreateSettings();

  if (isEnabled !== undefined) settings.isEnabled = Boolean(isEnabled);
  if (message !== undefined) settings.message = String(message);
  if (startTime !== undefined) settings.startTime = startTime ? new Date(startTime) : undefined;
  if (endTime !== undefined) settings.endTime = endTime ? new Date(endTime) : undefined;
  if (bannerUrl !== undefined) settings.bannerUrl = bannerUrl;
  settings.scheduledBy = req.user!.email;

  await settings.save();

  res.json({
    message: isEnabled ? 'Maintenance mode enabled.' : 'Maintenance mode updated.',
    settings,
  });
});

import jwt from 'jsonwebtoken';
import User from '../models/User';
import { config } from '../config/env';

/* ─────────────────────────────────────────────────────────────────────────────
   Express Middleware: checkMaintenanceMW
   Applied BEFORE route handlers. If maintenance is active and the request is
   not from an admin, returns 503.
   This is applied selectively in server.ts — not on public routes.
───────────────────────────────────────────────────────────────────────────── */
let cachedMaintenance: { isEnabled: boolean; message: string; cachedAt: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds — avoid DB hit on every request

export const checkMaintenanceMW = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Refresh cache if needed
    if (!cachedMaintenance || Date.now() - cachedMaintenance.cachedAt > CACHE_TTL) {
      const settings = await MaintenanceSettings.findOne().lean();
      cachedMaintenance = {
        isEnabled: settings?.isEnabled ?? false,
        message: settings?.message ?? '',
        cachedAt: Date.now(),
      };
    }

    if (!cachedMaintenance.isEnabled) {
      return next();
    }

    // Public paths pass through during maintenance
    const url = req.originalUrl || '';
    if (
      url.includes('/api/auth/') ||
      url.includes('/api/maintenance/status') ||
      !url.startsWith('/api')
    ) {
      return next();
    }

    // Admin users bypass maintenance
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string };
        const user = await User.findById(decoded.id).select('role');
        if (user && user.role === 'admin') {
          return next();
        }
      } catch (tokenErr) {
        // Let it fall through to 503
      }
    }

    res.status(503).json({
      maintenance: true,
      message: cachedMaintenance.message,
    });
  } catch {
    // If DB fails, don't block traffic
    next();
  }
};

// Call this when maintenance settings change to bust the cache
export const invalidateMaintenanceCache = () => {
  cachedMaintenance = null;
};
