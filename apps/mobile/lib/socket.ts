import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './store';

const WS_URL = process.env.EXPO_PUBLIC_WS_BASE_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = useAuthStore.getState().accessToken;
    socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function subscribeToOrder(orderId: string, driverId?: string): void {
  const s = getSocket();
  s.emit('track:subscribe', { orderId, driverId: driverId || '' });
}

export function unsubscribeFromOrder(orderId: string, driverId?: string): void {
  const s = getSocket();
  s.emit('track:unsubscribe', { orderId, driverId: driverId || '' });
}
