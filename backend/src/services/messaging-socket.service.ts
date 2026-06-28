import { Server as SocketServer, Namespace, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import User from '../models/User';
import Message from '../models/messaging/Message';

// Online users tracking: userId -> Set of socketIds
const onlineUsers = new Map<string, Set<string>>();

let messagingNamespace: Namespace | null = null;

/**
 * Initialize the /messaging Socket.IO namespace on the existing HTTP server.
 * This is completely independent from the main socket.service.ts.
 */
export function initMessagingSocketServer(io: SocketServer): void {
  messagingNamespace = io.of('/messaging');

  // JWT Authentication middleware for the namespace
  messagingNamespace.use(async (socket: Socket, next) => {
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

      // Attach user data to socket
      (socket as any).userId = user._id.toString();
      (socket as any).userName = user.name;
      (socket as any).userRole = user.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  messagingNamespace.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;
    const userName = (socket as any).userName as string;

    console.log(`📨 Messaging: ${userName} connected (${socket.id})`);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Join personal room for notifications
    socket.join(`user_${userId}`);

    // Broadcast online status
    messagingNamespace!.emit('msg:online_status', {
      userId,
      isOnline: true,
    });

    // Send current online users to the newly connected client
    const onlineList = Array.from(onlineUsers.keys());
    socket.emit('msg:online_users', onlineList);

    // ── Join conversation room ────────────────────────────
    socket.on('msg:join', (conversationId: string) => {
      socket.join(`conv_${conversationId}`);
      console.log(`📨 ${userName} joined conv_${conversationId}`);
    });

    // ── Leave conversation room ───────────────────────────
    socket.on('msg:leave', (conversationId: string) => {
      socket.leave(`conv_${conversationId}`);
    });

    // ── Join discussion room ──────────────────────────────
    socket.on('disc:join', (discussionId: string) => {
      socket.join(`disc_${discussionId}`);
    });

    socket.on('disc:leave', (discussionId: string) => {
      socket.leave(`disc_${discussionId}`);
    });

    // ── Join course discussion feed ───────────────────────
    socket.on('disc:join_course', (courseId: string) => {
      socket.join(`course_disc_${courseId}`);
    });

    socket.on('disc:leave_course', (courseId: string) => {
      socket.leave(`course_disc_${courseId}`);
    });

    // ── Typing indicators ─────────────────────────────────
    socket.on('msg:typing', (data: { conversationId: string }) => {
      socket.to(`conv_${data.conversationId}`).emit('msg:typing', {
        userId,
        userName,
        conversationId: data.conversationId,
      });
    });

    socket.on('msg:stop_typing', (data: { conversationId: string }) => {
      socket.to(`conv_${data.conversationId}`).emit('msg:stop_typing', {
        userId,
        conversationId: data.conversationId,
      });
    });

    // ── Read receipts ─────────────────────────────────────
    socket.on('msg:read', async (data: { conversationId: string; messageIds: string[] }) => {
      try {
        const { conversationId, messageIds } = data;

        // Update read status in database
        await Message.updateMany(
          {
            _id: { $in: messageIds },
            conversation: conversationId,
            sender: { $ne: userId },
            'readBy.user': { $ne: userId },
          },
          {
            $push: { readBy: { user: userId, at: new Date() } },
          }
        );

        // Broadcast read receipt to conversation
        socket.to(`conv_${conversationId}`).emit('msg:read_receipt', {
          userId,
          messageIds,
          conversationId,
          readAt: new Date(),
        });
      } catch (err) {
        console.error('Error processing read receipt:', err);
      }
    });

    // ── Mark delivered ────────────────────────────────────
    socket.on('msg:delivered', async (data: { messageIds: string[] }) => {
      try {
        const { messageIds } = data;
        await Message.updateMany(
          {
            _id: { $in: messageIds },
            sender: { $ne: userId },
            'deliveredTo.user': { $ne: userId },
          },
          {
            $push: { deliveredTo: { user: userId, at: new Date() } },
          }
        );

        // Find conversations and broadcast
        const messages = await Message.find({ _id: { $in: messageIds } }).select('conversation');
        const convIds = [...new Set(messages.map((m) => m.conversation.toString()))];
        convIds.forEach((convId) => {
          socket.to(`conv_${convId}`).emit('msg:delivered', {
            userId,
            messageIds,
            deliveredAt: new Date(),
          });
        });
      } catch (err) {
        console.error('Error processing delivery receipt:', err);
      }
    });

    // ── Disconnect ────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`📨 Messaging: ${userName} disconnected (${socket.id})`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // User is fully offline
          messagingNamespace!.emit('msg:online_status', {
            userId,
            isOnline: false,
          });
        }
      }
    });
  });

  console.log('📨 Messaging Socket.IO namespace (/messaging) initialized');
}

/**
 * Get the messaging namespace for emitting events from controllers
 */
export function getMessagingIO(): Namespace {
  if (!messagingNamespace) {
    throw new Error('Messaging Socket.IO namespace has not been initialized!');
  }
  return messagingNamespace;
}

/**
 * Check if a user is currently online
 */
export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

/**
 * Get all online user IDs
 */
export function getOnlineUserIds(): string[] {
  return Array.from(onlineUsers.keys());
}
