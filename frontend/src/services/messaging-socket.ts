import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

let socket: Socket | null = null;

/**
 * Connect to the /messaging Socket.IO namespace with JWT auth.
 */
export function connectMessagingSocket(): Socket {
  if (socket?.connected) return socket;

  const token = useAuthStore.getState().token;
  if (!token) {
    throw new Error('No auth token available');
  }

  // Determine base URL — in dev with Vite proxy, use relative; in prod use window.location.origin
  const baseUrl = window.location.origin;

  socket = io(`${baseUrl}/messaging`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('📨 Messaging socket connected');
  });

  socket.on('connect_error', (err) => {
    console.error('📨 Messaging socket connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('📨 Messaging socket disconnected:', reason);
  });

  return socket;
}

/**
 * Disconnect from the messaging socket.
 */
export function disconnectMessagingSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get the current socket instance.
 */
export function getMessagingSocket(): Socket | null {
  return socket;
}

// ── Emit Helpers ──────────────────────────────────────────────────────

export function joinConversation(conversationId: string): void {
  socket?.emit('msg:join', conversationId);
}

export function leaveConversation(conversationId: string): void {
  socket?.emit('msg:leave', conversationId);
}

export function joinDiscussion(discussionId: string): void {
  socket?.emit('disc:join', discussionId);
}

export function leaveDiscussion(discussionId: string): void {
  socket?.emit('disc:leave', discussionId);
}

export function joinCourseDiscussions(courseId: string): void {
  socket?.emit('disc:join_course', courseId);
}

export function leaveCourseDiscussions(courseId: string): void {
  socket?.emit('disc:leave_course', courseId);
}

export function emitTyping(conversationId: string): void {
  socket?.emit('msg:typing', { conversationId });
}

export function emitStopTyping(conversationId: string): void {
  socket?.emit('msg:stop_typing', { conversationId });
}

export function emitReadReceipt(conversationId: string, messageIds: string[]): void {
  socket?.emit('msg:read', { conversationId, messageIds });
}

export function emitDelivered(messageIds: string[]): void {
  socket?.emit('msg:delivered', { messageIds });
}
