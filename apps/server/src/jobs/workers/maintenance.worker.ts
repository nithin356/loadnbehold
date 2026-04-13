import { Job } from 'bullmq';
import { logger } from '../../utils/logger';
import { redis, redisAvailable } from '../../config/redis';
import { Offer } from '../../models/Offer';
import { Driver } from '../../models/Driver';
import { Order } from '../../models/Order';
import { User } from '../../models/User';
import { queues } from '../queue';

interface CleanupExpiredOtpsJob {
  pattern?: string;
}

interface ExpireOffersJob {
  dryRun?: boolean;
}

interface ExpireDriverDocsJob {
  notifyDrivers?: boolean;
}

type MaintenanceJobData = CleanupExpiredOtpsJob | ExpireOffersJob | ExpireDriverDocsJob;

export async function processMaintenanceJob(job: Job<MaintenanceJobData>): Promise<void> {
  const { name, data } = job;

  logger.info({ jobName: name, jobId: job.id }, 'Processing maintenance job');

  try {
    switch (name) {
      case 'cleanup-expired-otps':
        await handleCleanupExpiredOtps(data as CleanupExpiredOtpsJob);
        break;

      case 'expire-offers':
        await handleExpireOffers(data as ExpireOffersJob);
        break;

      case 'check-driver-docs':
        await handleExpireDriverDocs(data as ExpireDriverDocsJob);
        break;

      case 'daily-report':
        await handleDailyReport();
        break;

      default:
        logger.warn({ jobName: name }, 'Unknown maintenance job type');
    }
  } catch (error) {
    logger.error({ err: error, jobName: name, jobId: job.id }, 'Maintenance job failed');
    throw error;
  }
}

async function handleCleanupExpiredOtps(data: CleanupExpiredOtpsJob): Promise<void> {
  const pattern = data.pattern || 'otp:*';

  logger.info({ pattern }, 'Cleaning up expired OTP keys');

  try {
    if (!redisAvailable || !redis) {
      logger.warn('Redis unavailable, skipping OTP cleanup');
      return;
    }
    // Use SCAN to find all OTP keys
    const r = redis!;
    let cursor = '0';
    let deletedCount = 0;
    const batchSize = 100;

    do {
      const [nextCursor, keys] = await r.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        batchSize
      );

      cursor = nextCursor;

      if (keys.length > 0) {
        for (const key of keys) {
          const ttl = await r.ttl(key);
          if (ttl === -1) {
            await r.del(key);
            deletedCount++;
          }
        }
      }
    } while (cursor !== '0');

    logger.info({ deletedCount, pattern }, 'OTP cleanup completed');
  } catch (error) {
    logger.error({ err: error }, 'Failed to cleanup expired OTPs');
    throw error;
  }
}

async function handleExpireOffers(data: ExpireOffersJob): Promise<void> {
  const dryRun = data.dryRun || false;

  logger.info({ dryRun }, 'Checking for expired offers');

  const now = new Date();

  try {
    // Find all active offers that have passed their validUntil date
    const expiredOffers = await Offer.find({
      isActive: true,
      validUntil: { $lt: now },
    });

    if (expiredOffers.length === 0) {
      logger.info('No expired offers found');
      return;
    }

    logger.info({ count: expiredOffers.length }, 'Found expired offers');

    if (!dryRun) {
      // Update all expired offers
      const result = await Offer.updateMany(
        {
          isActive: true,
          validUntil: { $lt: now },
        },
        {
          $set: { isActive: false },
        }
      );

      logger.info(
        { modifiedCount: result.modifiedCount },
        'Expired offers deactivated'
      );
    } else {
      logger.info(
        { offerIds: expiredOffers.map((o) => o._id) },
        'Dry run - would expire these offers'
      );
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to expire offers');
    throw error;
  }
}

async function handleExpireDriverDocs(data: ExpireDriverDocsJob): Promise<void> {
  const notifyDrivers = data.notifyDrivers !== false; // Default to true

  logger.info({ notifyDrivers }, 'Checking for drivers with expired documents');

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  try {
    // Find drivers with expired or soon-to-expire documents
    const driversWithExpiredDocs = await Driver.find({
      status: { $in: ['approved', 'active'] },
      $or: [
        { 'documents.license.expiryDate': { $lt: now } },
        { 'documents.insurance.expiryDate': { $lt: now } },
        { 'documents.vehicleRegistration.expiryDate': { $lt: now } },
        { 'documents.backgroundCheck.expiryDate': { $lt: now } },
      ],
    }).populate('userId', 'phone email firstName lastName');

    const driversWithExpiringSoon = await Driver.find({
      status: { $in: ['approved', 'active'] },
      $or: [
        {
          'documents.license.expiryDate': {
            $gte: now,
            $lte: thirtyDaysFromNow,
          },
        },
        {
          'documents.insurance.expiryDate': {
            $gte: now,
            $lte: thirtyDaysFromNow,
          },
        },
        {
          'documents.vehicleRegistration.expiryDate': {
            $gte: now,
            $lte: thirtyDaysFromNow,
          },
        },
        {
          'documents.backgroundCheck.expiryDate': {
            $gte: now,
            $lte: thirtyDaysFromNow,
          },
        },
      ],
    }).populate('userId', 'phone email firstName lastName');

    logger.info(
      {
        expired: driversWithExpiredDocs.length,
        expiringSoon: driversWithExpiringSoon.length,
      },
      'Driver document check completed'
    );

    if (notifyDrivers) {
      // Notify drivers with expired documents and suspend them
      for (const driver of driversWithExpiredDocs) {
        logger.warn(
          { driverId: driver._id, userId: driver.userId },
          'Driver has expired documents'
        );

        // Suspend driver until documents are updated
        await Driver.findByIdAndUpdate(driver._id, { isOnline: false, isVerified: false });

        await queues.notifications?.add('send-push', {
          userId: driver.userId.toString(),
          title: 'Documents Expired',
          body: 'Your driver documents have expired. Please update them to continue accepting orders.',
          data: { type: 'document_expired' },
        });
      }

      // Send reminder to drivers with expiring documents
      for (const driver of driversWithExpiringSoon) {
        logger.info(
          { driverId: driver._id, userId: driver.userId },
          'Driver has documents expiring soon'
        );

        await queues.notifications?.add('send-push', {
          userId: driver.userId.toString(),
          title: 'Documents Expiring Soon',
          body: 'Your driver documents are expiring soon. Please update them to avoid service interruption.',
          data: { type: 'document_expiring_soon' },
        });
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to check driver documents');
    throw error;
  }
}

async function handleDailyReport(): Promise<void> {
  logger.info('Generating daily report');

  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dateStr = yesterday.toISOString().split('T')[0];

    // Aggregate order statistics for yesterday
    const [orderStats] = await Order.aggregate([
      { $match: { createdAt: { $gte: yesterday, $lt: now } } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          totalRevenue: { $sum: '$pricing.total' },
          avgOrderValue: { $avg: '$pricing.total' },
        },
      },
    ]);

    // Driver performance
    const [driverStats] = await Driver.aggregate([
      {
        $group: {
          _id: null,
          totalDrivers: { $sum: 1 },
          onlineDrivers: { $sum: { $cond: ['$isOnline', 1, 0] } },
          totalCashBalance: { $sum: '$cashBalance' },
        },
      },
    ]);

    // New user signups
    const newUsers = await User.countDocuments({ createdAt: { $gte: yesterday, $lt: now } });

    const report = {
      date: dateStr,
      orders: {
        total: orderStats?.totalOrders || 0,
        completed: orderStats?.completedOrders || 0,
        cancelled: orderStats?.cancelledOrders || 0,
        revenue: Math.round((orderStats?.totalRevenue || 0) * 100) / 100,
        avgValue: Math.round((orderStats?.avgOrderValue || 0) * 100) / 100,
      },
      drivers: {
        total: driverStats?.totalDrivers || 0,
        online: driverStats?.onlineDrivers || 0,
        pendingCash: Math.round((driverStats?.totalCashBalance || 0) * 100) / 100,
      },
      newUsers,
    };

    logger.info({ report }, `Daily report for ${dateStr}`);

    // Notify admins with the summary
    const admins = await User.find({ role: 'admin' }).select('_id').lean();
    for (const admin of admins) {
      await queues.notifications.add('send-push', {
        userId: admin._id.toString(),
        title: `Daily Report — ${dateStr}`,
        body: `Orders: ${report.orders.total} (${report.orders.completed} completed) | Revenue: $${report.orders.revenue} | New users: ${report.newUsers}`,
        data: { type: 'daily_report', report },
      });
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to generate daily report');
    throw error;
  }
}
