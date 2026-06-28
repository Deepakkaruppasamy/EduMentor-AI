import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

let socket: Socket | null = null;

/**
 * Connect to /support namespace with JWT token.
 */
export function connectSupportSocket(): Socket {
  if (socket?.connected) return socket;

  const token = useAuthStore.getState().token;
  if (!token) {
    throw new Error('Authorization token not found');
  }

  const baseUrl = window.location.origin;

  socket = io(`${baseUrl}/support`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
  });

  socket.on('connect', () => {
    console.log('🛠️ Support socket connected');
  });

  return socket;
}

/**
 * Disconnect from support socket namespace.
 */
export function disconnectSupportSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Emit helpers for rooms subscription.
 */
export function joinTicketRoom(ticketId: string): void {
  socket?.emit('ticket:join', ticketId);
}

export function leaveTicketRoom(ticketId: string): void {
  socket?.emit('ticket:leave', ticketId);
}
