import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { app } from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { setupTrackingSocket } from './socket/tracking';
import { pingGatewayHealth } from './config/payment';
import { logger } from './utils/logger';
import { initializeJobSystem, shutdownJobSystem } from './jobs';

const server = http.createServer(app);

// ─── Socket.IO Setup ───────────────────────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin: env.CORS_ALLOWED_ORIGINS.split(','),
    methods: ['GET', 'POST'],
  },
});

setupTrackingSocket(io);

// Make io accessible in route handlers
app.set('io', io);

// ─── Start Server ──────────────────────────────────────────
async function start() {
  await connectDatabase();
  await connectRedis();

  // Initialize BullMQ job system
  await initializeJobSystem();

  // Payment gateway health check every 60 seconds
  setInterval(async () => {
    try {
      await pingGatewayHealth();
    } catch (e) {
      logger.warn({ err: e }, 'Payment health check failed');
    }
  }, 60_000);

  server.listen(env.PORT, () => {
    logger.info(`🚀 ${env.APP_NAME} API running on port ${env.PORT}`);
    logger.info(`📡 WebSocket server ready`);
    logger.info(`🔗 http://localhost:${env.PORT}/health`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await shutdownJobSystem();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await shutdownJobSystem();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});

export { app, io };

