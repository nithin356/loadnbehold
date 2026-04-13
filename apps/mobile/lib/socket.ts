import { Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './store';

const ENV_WS = process.env.EXPO_PUBLIC_WS_BASE_URL || 'http://localhost:5000';
const WS_URL = Platform.OS === 'web' ? 'http://localhost:5001' : ENV_WS;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      auth: { token: useAuthStore.getState().accessToken },
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    // Refresh auth token on each reconnect attempt
    socket.on('reconnect_attempt', () => {
      if (socket) {
        socket.auth = { token: useAuthStore.getState().accessToken };
      }
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    // Always use latest token when connecting
    s.auth = { token: useAuthStore.getState().accessToken };
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
