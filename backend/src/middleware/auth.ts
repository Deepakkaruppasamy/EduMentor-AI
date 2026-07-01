import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import UserSession from '../models/UserSession';
import { config } from '../config/env';
import { hashToken } from '../utils/activity-logger';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Not authorized, no token' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string };

    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'User not found or inactive' });
      return;
    }

    // Validate active session
    const tokenHash = hashToken(token);
    const session = await UserSession.findOne({ tokenHash, userId: user._id, isActive: true });
    if (!session) {
      res.status(401).json({ success: false, message: 'Session expired or revoked' });
      return;
    }

    // Non-blocking update of lastActive (throttled to once per minute to avoid write storms)
    const now = new Date();
    if (now.getTime() - session.lastActive.getTime() > 60 * 1000) {
      session.lastActive = now;
      session.save().catch(err => console.error('Failed to update session lastActive:', err));
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Role '${req.user?.role}' is not authorized to access this route`,
      });
      return;
    }
    next();
  };
};
