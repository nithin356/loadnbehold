import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

export let redis: Redis | null = null;
export let redisAvailable = false;

export async function connectRedis(): Promise<void> {
  try {
    const client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null; // Stop retrying after 3 attempts
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      connectTimeout: 5000,
    });

    client.on('connect', () => logger.info('✅ Redis connected'));
    client.on('error', () => {}); // Suppress repeated error logs

    await client.connect();
    redis = client;
    redisAvailable = true;
  } catch (error) {
    logger.warn('⚠️ Redis unavailable — job queues and caching disabled. App will still work.');
    redisAvailable = false;
  }
}
