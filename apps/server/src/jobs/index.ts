import { createWorker, QUEUE_NAMES } from './queue';
import { processNotificationJob } from './workers/notification.worker';
import { processOrderJob } from './workers/order.worker';
import { processMaintenanceJob } from './workers/maintenance.worker';
import { setupCronJobs } from './cron';
import { logger } from '../utils/logger';

let workers: any[] = [];

/**
 * Initialize the entire job system:
 * - Create all workers
 * - Setup cron jobs
 * - Start processing
 */
export async function initializeJobSystem(): Promise<void> {
  logger.info('Initializing job system...');

  try {
    // Create workers for each queue
    const notificationWorker = createWorker(
      QUEUE_NAMES.NOTIFICATIONS,
      processNotificationJob,
      { concurrency: 10 } // Higher concurrency for notifications
    );

    const orderWorker = createWorker(
      QUEUE_NAMES.ORDER_PROCESSING,
      processOrderJob,
      { concurrency: 5 }
    );

    const maintenanceWorker = createWorker(
      QUEUE_NAMES.MAINTENANCE,
      processMaintenanceJob,
      { concurrency: 2 } // Lower concurrency for maintenance tasks
    );

    // Store worker references for cleanup
    workers = [notificationWorker, orderWorker, maintenanceWorker];

    // Setup cron jobs
    await setupCronJobs();

    logger.info('Job system initialized successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize job system');
    throw error;
  }
}

/**
 * Gracefully shutdown all workers
 */
export async function shutdownJobSystem(): Promise<void> {
  logger.info('Shutting down job system...');

  try {
    await Promise.all(workers.map((worker) => worker.close()));
    workers = [];
    logger.info('Job system shutdown completed');
  } catch (error) {
    logger.error({ err: error }, 'Error during job system shutdown');
    throw error;
  }
}

// Export queues for use in other parts of the application
export { queues } from './queue';
export { QUEUE_NAMES } from './queue';
