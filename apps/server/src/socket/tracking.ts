import { Server, Socket } from 'socket.io';
import { redis } from '../config/redis';
import { WS_EVENTS } from '@loadnbehold/constants';
import { logger } from '../utils/logger';

export function setupTrackingSocket(io: Server): void {
  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Driver sends location updates
    socket.on(WS_EVENTS.DRIVER_LOCATION, async (data: {
      driverId: string;
      location: { type: 'Point'; coordinates: [number, number] };
      speed?: number;
      heading?: number;
    }) => {
      const { driverId, location, speed, heading } = data;

      // Cache in Redis
      await redis.set(
        `driver:location:${driverId}`,
        JSON.stringify({
          coordinates: location.coordinates,
          speed,
          heading,
          updatedAt: new Date().toISOString(),
        }),
        'EX',
        30
      );

      // Broadcast to all clients tracking this driver's orders
      socket.to(`driver:${driverId}`).emit(WS_EVENTS.ORDER_TRACKING, {
        driverId,
        location,
        speed,
        heading,
        updatedAt: new Date().toISOString(),
      });
    });

    // Customer subscribes to order tracking
    socket.on('track:subscribe', (data: { orderId: string; driverId: string }) => {
      socket.join(`driver:${data.driverId}`);
      socket.join(`order:${data.orderId}`);
      logger.info(`Client ${socket.id} tracking order ${data.orderId}`);
    });

    socket.on('track:unsubscribe', (data: { orderId: string; driverId: string }) => {
      socket.leave(`driver:${data.driverId}`);
      socket.leave(`order:${data.orderId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
}

// Helper to emit order status updates from HTTP handlers
export function emitOrderStatusUpdate(
  io: Server,
  orderId: string,
  status: string,
  data?: Record<string, unknown>
): void {
  io.to(`order:${orderId}`).emit(WS_EVENTS.ORDER_STATUS, {
    orderId,
    status,
    timestamp: new Date().toISOString(),
    ...data,
  });
}
