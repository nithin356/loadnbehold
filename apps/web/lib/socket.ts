import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || 'http://localhost:5000';

let socket: Socket | null = null;

function getStoredToken(): string | null {
  try {
    const stored = localStorage.getItem('loadnbehold-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.accessToken || null;
    }
  } catch {}
  return null;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      auth: { token: getStoredToken() },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Refresh auth token on each reconnect attempt (token may have been refreshed)
    socket.on('reconnect_attempt', () => {
      if (socket) {
        socket.auth = { token: getStoredToken() };
      }
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    // Always use latest token when connecting
    s.auth = { token: getStoredToken() };
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function subscribeToOrder(orderId: string, driverId: string): void {
  const s = getSocket();
  s.emit('track:subscribe', { orderId, driverId });
}

export function unsubscribeFromOrder(orderId: string, driverId: string): void {
  const s = getSocket();
  s.emit('track:unsubscribe', { orderId, driverId });
}
