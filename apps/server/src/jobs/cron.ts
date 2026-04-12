import { queues } from './queue';
import { logger } from '../utils/logger';

/**
 * Setup all cron jobs using BullMQ's repeatable jobs feature
 */
export async function setupCronJobs(): Promise<void> {
  logger.info('Setting up cron jobs');

  try {
    // Cleanup expired OTPs every 5 minutes
    await queues.maintenance.add(
      'cleanup-expired-otps',
      { pattern: 'otp:*' },
      {
        repeat: {
          pattern: '*/5 * * * *', // Every 5 minutes
        },
        jobId: 'cron:cleanup-expired-otps',
      }
    );

    // Expire offers daily at 3 AM
    await queues.maintenance.add(
      'expire-offers',
      { dryRun: false },
      {
        repeat: {
          pattern: '0 3 * * *', // Every day at 3:00 AM
        },
        jobId: 'cron:expire-offers',
      }
    );

    // Check driver documents daily at 6 AM
    await queues.maintenance.add(
      'check-driver-docs',
      { notifyDrivers: true },
      {
        repeat: {
          pattern: '0 6 * * *', // Every day at 6:00 AM
        },
        jobId: 'cron:check-driver-docs',
      }
    );

    // Generate daily report at 2 AM
    await queues.maintenance.add(
      'daily-report',
      {},
      {
        repeat: {
          pattern: '0 2 * * *', // Every day at 2:00 AM
        },
        jobId: 'cron:daily-report',
      }
    );

    logger.info('Cron jobs setup completed');
  } catch (error) {
    logger.error({ err: error }, 'Failed to setup cron jobs');
    throw error;
  }
}

/**
 * Remove all repeatable jobs (useful for cleanup or testing)
 */
export async function removeAllCronJobs(): Promise<void> {
  logger.info('Removing all cron jobs');

  try {
    const repeatableJobs = await queues.maintenance.getRepeatableJobs();

    for (const job of repeatableJobs) {
      await queues.maintenance.removeRepeatableByKey(job.key);
      logger.info({ jobKey: job.key }, 'Removed repeatable job');
    }

    logger.info('All cron jobs removed');
  } catch (error) {
    logger.error({ err: error }, 'Failed to remove cron jobs');
    throw error;
  }
}

/**
 * List all active cron jobs
 */
export async function listCronJobs(): Promise<void> {
  try {
    const repeatableJobs = await queues.maintenance.getRepeatableJobs();

    logger.info({ count: repeatableJobs.length }, 'Active cron jobs:');

    for (const job of repeatableJobs) {
      logger.info(
        {
          name: job.name,
          pattern: job.pattern,
          next: job.next,
        },
        'Cron job'
      );
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to list cron jobs');
    throw error;
  }
}
