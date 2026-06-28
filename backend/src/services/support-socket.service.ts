import { Server as SocketServer, Namespace, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import User from '../models/User';

let supportNamespace: Namespace | null = null;

/**
 * Initialize Socket.IO namespace for platform support center.
 */
export function initSupportSocketServer(io: SocketServer): void {
  supportNamespace = io.of('/support');

  // JWT Authorization middleware
  supportNamespace.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string };
      const user = await User.findById(decoded.id).select('-password');
      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      (socket as any).userId = user._id.toString();
      (socket as any).userName = user.name;
      (socket as any).userRole = user.role;
      next();
    } catch (err) {
      next(new Error('Invalid authorization token'));
    }
  });

  supportNamespace.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;
    const userName = (socket as any).userName as string;
    const userRole = (socket as any).userRole as string;

    console.log(`🛠️ Support: ${userName} connected (${socket.id})`);

    // Join personal notification channel
    socket.join(`user_${userId}`);

    // Admins join the global administrative support log room
    if (userRole === 'admin') {
      socket.join('admin_room');
      console.log(`🛠️ Admin ${userName} joined admin_room channel`);
    }

    // Join ticket conversation channel
    socket.on('ticket:join', (ticketId: string) => {
      socket.join(`ticket_${ticketId}`);
      console.log(`🛠️ User joined ticket_${ticketId}`);
    });

    socket.on('ticket:leave', (ticketId: string) => {
      socket.leave(`ticket_${ticketId}`);
      console.log(`🛠️ User left ticket_${ticketId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🛠️ Support: ${userName} disconnected`);
    });
  });

  console.log('🛠️ Support Socket.IO namespace (/support) initialized');
}

/**
 * Retrieve current Socket.IO support namespace
 */
export function getSupportIO(): Namespace {
  if (!supportNamespace) {
    throw new Error('Support socket namespace has not been initialized!');
  }
  return supportNamespace;
}
