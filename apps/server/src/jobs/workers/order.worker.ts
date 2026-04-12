import { Job } from 'bullmq';
import mongoose from 'mongoose';
import { logger } from '../../utils/logger';
import { Order } from '../../models/Order';
import { findAndRankNearbyDrivers } from '../../services/geolocation.service';
import { queues } from '../queue';

interface AssignDriverJob {
  orderId: string;
  outletId: string;
  pickupLongitude: number;
  pickupLatitude: number;
  attempt?: number;
}

interface ExpireUnacceptedJob {
  orderId: string;
  assignedAt: number;
}

interface AutoCancelJob {
  orderId: string;
}

type OrderJobData = AssignDriverJob | ExpireUnacceptedJob | AutoCancelJob;

export async function processOrderJob(job: Job<OrderJobData>): Promise<void> {
  const { name, data } = job;

  logger.info({ jobName: name, jobId: job.id }, 'Processing order job');

  try {
    switch (name) {
      case 'assign-driver':
        await handleAssignDriver(data as AssignDriverJob);
        break;

      case 'expire-unaccepted':
        await handleExpireUnaccepted(data as ExpireUnacceptedJob);
        break;

      case 'auto-cancel':
        await handleAutoCancel(data as AutoCancelJob);
        break;

      default:
        logger.warn({ jobName: name }, 'Unknown order job type');
    }
  } catch (error) {
    logger.error({ err: error, jobName: name, jobId: job.id }, 'Order job failed');
    throw error;
  }
}

async function handleAssignDriver(data: AssignDriverJob): Promise<void> {
  const { orderId, outletId, pickupLongitude, pickupLatitude, attempt = 1 } = data;

  logger.info({ orderId, attempt }, 'Attempting to assign driver');

  // Find the order
  const order = await Order.findById(orderId);
  if (!order) {
    logger.warn({ orderId }, 'Order not found');
    return;
  }

  // Check if already assigned
  if (order.driverId) {
    logger.info({ orderId, driverId: order.driverId }, 'Order already has a driver assigned');
    return;
  }

  // Get rejected drivers to exclude from assignment
  const excludeDriverIds = order.rejectedDrivers?.map((id) => id.toString()) || [];

  // Find nearby drivers
  const rankedDrivers = await findAndRankNearbyDrivers(
    outletId,
    pickupLongitude,
    pickupLatitude,
    10, // 10 miles radius
    excludeDriverIds
  );

  if (rankedDrivers.length === 0) {
    logger.warn({ orderId, attempt }, 'No available drivers found');

    // Retry with increased radius or notify admin
    if (attempt < 3) {
      await queues.orderProcessing.add(
        'assign-driver',
        { ...data, attempt: attempt + 1 },
        { delay: 30000 } // Retry after 30 seconds
      );
    } else {
      logger.error({ orderId }, 'Failed to assign driver after 3 attempts');

      // Notify admins about failed assignment
      const { User } = await import('../../models/User');
      const admins = await User.find({ role: 'admin' }).select('_id').lean();
      for (const admin of admins) {
        await queues.notifications.add('send-push', {
          userId: admin._id.toString(),
          title: 'Driver Assignment Failed',
          body: `Order ${orderId} could not be assigned after 3 attempts. Manual intervention needed.`,
          data: { orderId, type: 'assignment_failed' },
        });
      }

      // Also notify the customer
      const order2 = await Order.findById(orderId).select('customerId orderNumber').lean();
      if (order2) {
        await queues.notifications.add('send-push', {
          userId: order2.customerId.toString(),
          title: `Order ${order2.orderNumber}`,
          body: 'We\'re having trouble finding a driver. Our team is looking into it.',
          data: { orderId, type: 'assignment_delayed' },
        });
      }
    }
    return;
  }

  // Assign the top-ranked driver
  const topDriver = rankedDrivers[0];
  order.driverId = topDriver.driver._id as mongoose.Types.ObjectId;
  order.status = 'driver_assigned';
  order.timeline.push({
    status: 'driver_assigned',
    timestamp: new Date(),
    driverId: topDriver.driver._id as mongoose.Types.ObjectId,
    note: `Assigned driver (score: ${topDriver.score.toFixed(2)}, distance: ${topDriver.distance.toFixed(2)} mi)`,
  });

  await order.save();

  logger.info(
    { orderId, driverId: topDriver.driver._id, score: topDriver.score },
    'Driver assigned successfully'
  );

  // Send notification to driver
  await queues.notifications.add('send-push', {
    userId: topDriver.driver.userId?.toString(),
    title: 'New Order Assignment',
    body: `New pickup order ${order.orderNumber} - ${topDriver.distance.toFixed(1)} mi away`,
    data: { orderId: order._id.toString(), orderNumber: order.orderNumber },
  });

  // Send notification to customer
  await queues.notifications.add('send-order-status', {
    userId: order.customerId.toString(),
    orderNumber: order.orderNumber,
    status: 'driver_assigned',
    statusLabel: 'Driver Assigned',
  });

  // Schedule expiration check (driver has 30 seconds to accept)
  await queues.orderProcessing.add(
    'expire-unaccepted',
    {
      orderId: order._id.toString(),
      assignedAt: Date.now(),
    },
    { delay: 30000 } // 30 seconds
  );
}

async function handleExpireUnaccepted(data: ExpireUnacceptedJob): Promise<void> {
  const { orderId, assignedAt } = data;

  const order = await Order.findById(orderId);
  if (!order) {
    logger.warn({ orderId }, 'Order not found for expiration check');
    return;
  }

  // Check if driver accepted (status changed from driver_assigned)
  if (order.status !== 'driver_assigned') {
    logger.info({ orderId, status: order.status }, 'Order status changed, driver likely accepted');
    return;
  }

  // Check if assignment is still within the time window we're checking
  const lastAssignment = order.timeline.find((t) => t.status === 'driver_assigned');
  if (lastAssignment && lastAssignment.timestamp.getTime() > assignedAt) {
    logger.info({ orderId }, 'Order was reassigned after this expiration check was scheduled');
    return;
  }

  logger.warn({ orderId, driverId: order.driverId }, 'Driver did not accept in time, reassigning');

  // Clear the driver and re-queue assignment
  order.driverId = undefined;
  order.status = 'placed';
  order.timeline.push({
    status: 'placed',
    timestamp: new Date(),
    note: 'Driver did not accept in time, reassigning',
  });

  await order.save();

  // Re-queue driver assignment
  await queues.orderProcessing.add('assign-driver', {
    orderId: order._id.toString(),
    outletId: order.outletId.toString(),
    pickupLongitude: order.pickupAddress.location.coordinates[0],
    pickupLatitude: order.pickupAddress.location.coordinates[1],
    attempt: 1,
  });
}

async function handleAutoCancel(data: AutoCancelJob): Promise<void> {
  const { orderId } = data;

  const order = await Order.findById(orderId);
  if (!order) {
    logger.warn({ orderId }, 'Order not found for auto-cancel');
    return;
  }

  // Only cancel if payment is still pending and order is in early stages
  if (
    order.payment.status === 'pending' &&
    ['placed', 'driver_assigned'].includes(order.status)
  ) {
    order.status = 'cancelled';
    order.timeline.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: 'Auto-cancelled due to unpaid order timeout (30 minutes)',
      actor: 'system',
    });

    await order.save();

    logger.info({ orderId, orderNumber: order.orderNumber }, 'Order auto-cancelled due to payment timeout');

    // Notify customer
    await queues.notifications.add('send-push', {
      userId: order.customerId.toString(),
      title: 'Order Cancelled',
      body: `Order ${order.orderNumber} was cancelled due to pending payment`,
      data: { orderId: order._id.toString(), orderNumber: order.orderNumber },
    });
  } else {
    logger.info(
      { orderId, paymentStatus: order.payment.status, orderStatus: order.status },
      'Order not eligible for auto-cancel'
    );
  }
}
