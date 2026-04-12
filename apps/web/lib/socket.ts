import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) s.connect();
}

export function disconnectSocket(): void {
  if (socket?.connected) socket.disconnect();
}

export function subscribeToOrder(orderId: string, driverId: string): void {
  const s = getSocket();
  s.emit('track:subscribe', { orderId, driverId });
}

export function unsubscribeFromOrder(orderId: string, driverId: string): void {
  const s = getSocket();
  s.emit('track:unsubscribe', { orderId, driverId });
}
