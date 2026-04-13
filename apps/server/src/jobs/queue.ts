import { Queue, Worker, QueueOptions, WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { redisAvailable } from '../config/redis';

// Queue names used throughout the application
export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  PAYMENTS: 'payments',
  DRIVER_ASSIGNMENT: 'driver-assignment',
  REPORTS: 'reports',
  MAINTENANCE: 'maintenance',
  ORDER_PROCESSING: 'order-processing',
} as const;

// Create a Redis connection for BullMQ
// BullMQ requires a separate connection instance
function createRedisConnection(): IORedis {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

// Default queue options (connection created lazily)
function getDefaultQueueOptions(): QueueOptions {
  return {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        count: 100,
        age: 24 * 3600, // 24 hours
      },
      removeOnFail: {
        count: 500,
        age: 7 * 24 * 3600, // 7 days
      },
    },
  };
}

// Default worker options
const defaultWorkerOptions: Omit<WorkerOptions, 'connection'> = {
  autorun: true,
  concurrency: 5,
};

/**
 * Create a new BullMQ queue instance
 */
export function createQueue<T = any>(
  queueName: string,
  options?: Partial<QueueOptions>
): Queue<T> {
  const queue = new Queue<T>(queueName, {
    ...getDefaultQueueOptions(),
    ...options,
    connection: createRedisConnection(),
  });

  queue.on('error', (error) => {
    logger.error({ err: error, queue: queueName }, 'Queue error');
  });

  logger.info(`Queue '${queueName}' created`);

  return queue;
}

/**
 * Create a new BullMQ worker instance
 */
export function createWorker<T = any>(
  queueName: string,
  processor: (job: any) => Promise<any>,
  options?: Partial<WorkerOptions>
): Worker<T> {
  const worker = new Worker<T>(
    queueName,
    processor,
    {
      ...defaultWorkerOptions,
      ...options,
      connection: createRedisConnection(),
    }
  );

  worker.on('completed', (job) => {
    logger.info(
      { jobId: job.id, jobName: job.name, queue: queueName },
      'Job completed'
    );
  });

  worker.on('failed', (job, error) => {
    logger.error(
      { err: error, jobId: job?.id, jobName: job?.name, queue: queueName },
      'Job failed'
    );
  });

  worker.on('error', (error) => {
    logger.error({ err: error, queue: queueName }, 'Worker error');
  });

  logger.info(`Worker for '${queueName}' started`);

  return worker;
}

// Lazy queue instances — only created when Redis is available
let _queues: Record<string, Queue> | null = null;

export function getQueues() {
  if (!redisAvailable) return null;
  if (!_queues) {
    _queues = {
      notifications: createQueue(QUEUE_NAMES.NOTIFICATIONS),
      payments: createQueue(QUEUE_NAMES.PAYMENTS),
      driverAssignment: createQueue(QUEUE_NAMES.DRIVER_ASSIGNMENT),
      reports: createQueue(QUEUE_NAMES.REPORTS),
      maintenance: createQueue(QUEUE_NAMES.MAINTENANCE),
      orderProcessing: createQueue(QUEUE_NAMES.ORDER_PROCESSING),
    };
  }
  return _queues;
}

// Backwards-compatible export — returns null if Redis is unavailable
export const queues = new Proxy({} as any, {
  get(_target, prop: string) {
    const q = getQueues();
    return q ? q[prop] : null;
  },
});
