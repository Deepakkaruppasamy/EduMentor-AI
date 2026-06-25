import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { config } from '../config/env';

let io: SocketServer | null = null;

/**
 * Initialize Socket.io Server
 */
export function initSocketServer(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: [config.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join room for a course
    socket.on('join_course', (courseId: string) => {
      const roomName = `course_${courseId}`;
      socket.join(roomName);
      console.log(`👤 Client ${socket.id} joined course room: ${roomName}`);
    });

    // Leave room for a course
    socket.on('leave_course', (courseId: string) => {
      const roomName = `course_${courseId}`;
      socket.leave(roomName);
      console.log(`👤 Client ${socket.id} left course room: ${roomName}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Get Socket.io instance
 */
export function getIO(): SocketServer {
  if (!io) {
    throw new Error('Socket.io server has not been initialized!');
  }
  return io;
}

/**
 * Broadcast document processing status to a course room
 */
export function notifyDocumentStatus(
  courseId: string,
  docId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  data?: {
    totalChunks?: number;
    summary?: string;
    conceptMap?: string;
    processingError?: string;
    document?: any;
  }
): void {
  try {
    const socketIO = getIO();
    const roomName = `course_${courseId}`;
    socketIO.to(roomName).emit('document:status', {
      docId,
      status,
      ...data,
    });
    console.log(`📢 Broadcasted document:status (${status}) to room: ${roomName}`);
  } catch (err: any) {
    console.warn('Failed to broadcast socket event:', err.message);
  }
}
