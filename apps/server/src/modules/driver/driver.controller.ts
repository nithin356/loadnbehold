import { Request, Response } from 'express';
import { Driver } from '../../models/Driver';
import { Order } from '../../models/Order';
import { User } from '../../models/User';
import { Transaction } from '../../models/Transaction';
import { redis } from '../../config/redis';
import { sendOrderStatusNotification } from '../../services/notification.service';
import { sendOrderStatusUpdate } from '../../services/email.service';
import { uploadFile } from '../../services/storage.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';
import { ORDER_STATUS_LABELS } from '@loadnbehold/constants';

export async function registerDriver(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const existing = await Driver.findOne({ userId });
  if (existing) {
    sendError(res, 'ALREADY_REGISTERED', 'Driver profile already exists', 400);
    return;
  }

  // Update user role
  await User.findByIdAndUpdate(userId, { role: 'driver', name: req.body.name });

  const driver = await Driver.create({
    userId,
    vehicle: req.body.vehicle,
    status: 'pending',
  });

  sendSuccess(res, driver, 'Driver registration submitted. Pending approval.', 201);
}

export async function getDriverProfile(req: Request, res: Response): Promise<void> {
  const driver = await Driver.findOne({ userId: req.user!.userId })
    .populate('userId', 'name phone email')
    .populate('assignedOutlet', 'name address')
    .lean();

  if (!driver) {
    sendError(res, 'DRIVER_NOT_FOUND', 'Driver profile not found', 404);
    return;
  }

  sendSuccess(res, driver);
}

export async function toggleOnlineStatus(req: Request, res: Response): Promise<void> {
  const driver = await Driver.findOne({ userId: req.user!.userId });
  if (!driver) {
    sendError(res, 'DRIVER_NOT_FOUND', 'Driver not found', 404);
    return;
  }

  driver.isOnline = !driver.isOnline;
  if (driver.isOnline) driver.lastOnlineAt = new Date();
  await driver.save();

  sendSuccess(res, { isOnline: driver.isOnline }, `You are now ${driver.isOnline ? 'online' : 'offline'}`);
}

export async function updateLocation(req: Request, res: Response): Promise<void> {
  const driver = await Driver.findOneAndUpdate(
    { userId: req.user!.userId },
    { currentLocation: req.body.location },
    { new: true }
  );

  if (!driver) {
    sendError(res, 'DRIVER_NOT_FOUND', 'Driver not found', 404);
    return;
  }

  // Cache in Redis for fast tracking reads
  await redis.set(
    `driver:location:${driver._id}`,
    JSON.stringify({
      coordinates: req.body.location.coordinates,
      speed: req.body.speed,
      heading: req.body.heading,
      updatedAt: new Date().toISOString(),
    }),
    'EX',
    30 // 30 second TTL
  );

  sendSuccess(res, null, 'Location updated');
}

export async function getAssignedOrders(req: Request, res: Response): Promise<void> {
  const driver = await Driver.findOne({ userId: req.user!.userId });
  if (!driver) {
    sendError(res, 'DRIVER_NOT_FOUND', 'Driver not found', 404);
    return;
  }

  const orders = await Order.find({
    driverId: driver._id,
    status: { $nin: ['delivered', 'cancelled'] },
  })
    .populate('customerId', 'name phone')
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(res, orders);
}

export async function getCompletedOrders(req: Request, res: Response): Promise<void> {
  const driver = await Driver.findOne({ userId: req.user!.userId });
  if (!driver) {
    sendError(res, 'DRIVER_NOT_FOUND', 'Driver not found', 404);
    return;
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const orders = await Order.find({
    driverId: driver._id,
    status: { $in: ['delivered', 'cancelled'] },
  })
    .populate('customerId', 'name phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  sendSuccess(res, orders);
}

export async function acceptOrder(req: Request, res: Response): Promise<void> {
  const driver = await Driver.findOne({ userId: req.user!.userId });
  if (!driver) {
    sendError(res, 'DRIVER_NOT_FOUND', 'Driver not found', 404);
    return;
  }

  const order = await Order.findById(req.params.id);
  if (!order || order.status !== 'placed') {
    sendError(res, 'ORDER_NOT_AVAILABLE', 'Order is no longer available', 400);
    return;
  }

  order.driverId = driver._id as any;
  order.status = 'driver_assigned';
  order.timeline.push({
    status: 'driver_assigned',
    timestamp: new Date(),
    driverId: driver._id as any,
  });
  await order.save();

  driver.activeOrders.push(order._id as any);
  await driver.save();

  await sendOrderStatusNotification(
    order.customerId.toString(),
    order.orderNumber,
    'driver_assigned',
    'Driver Assigned'
  );

  sendSuccess(res, order, 'Order accepted');
}

export async function rejectOrder(req: Request, res: Response): Promise<void> {
  const driver = await Driver.findOne({ userId: req.user!.userId });
  if (!driver) {
    sendError(res, 'NOT_FOUND', 'Driver not found', 404);
    return;
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    sendError(res, 'NOT_FOUND', 'Order not found', 404);
    return;
  }

  // Verify this driver is assigned
  if (order.driverId?.toString() !== driver._id.toString()) {
    sendError(res, 'FORBIDDEN', 'Order not assigned to you', 403);
    return;
  }

  // Clear driver, reset status, track rejection
  order.driverId = undefined;
  order.status = 'placed';
  order.rejectedDrivers = [...(order.rejectedDrivers || []), driver._id as any];
  order.timeline.push({
    status: 'placed',
    timestamp: new Date(),
    note: 'Driver rejected, reassigning',
  });
  await order.save();

  // Remove from driver's active orders
  driver.activeOrders = driver.activeOrders.filter(
    (id) => id.toString() !== order._id.toString()
  );
  await driver.save();

  // Re-queue driver assignment via BullMQ
  const { createQueue } = await import('../../jobs/queue');
  const queue = createQueue('order-processing');
  await queue.add('assign-driver', {
    orderId: order._id.toString(),
    outletId: order.outletId?.toString(),
    pickupLongitude: order.pickupAddress?.location?.coordinates?.[0] || -83.0458,
    pickupLatitude: order.pickupAddress?.location?.coordinates?.[1] || 42.3314,
    attempt: (order.rejectedDrivers?.length || 0),
  });

  sendSuccess(res, null, 'Order rejected, reassigning to another driver');
}

export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  const driver = await Driver.findOne({ userId: req.user!.userId });
  if (!driver) {
    sendError(res, 'DRIVER_NOT_FOUND', 'Driver not found', 404);
    return;
  }

  const order = await Order.findOne({ _id: req.params.id, driverId: driver._id });
  if (!order) {
    sendError(res, 'ORDER_NOT_FOUND', 'Order not found', 404);
    return;
  }

  const { status, note, weight, deliveryOtp } = req.body;

  // Verify delivery OTP if required
  if (status === 'delivered' && order.deliveryOtp && deliveryOtp !== order.deliveryOtp) {
    sendError(res, 'INVALID_OTP', 'Delivery OTP does not match', 400);
    return;
  }

  order.status = status;
  order.timeline.push({
    status,
    timestamp: new Date(),
    note,
    driverId: driver._id as any,
  });

  // Update weight if provided (at pickup)
  if (weight && status === 'picked_up') {
    for (const item of order.items) {
      if (item.unit === 'lbs' || item.unit === 'kg') {
        item.weight = weight;
      }
    }
  }

  // Mark order delivered — update driver metrics
  if (status === 'delivered') {
    driver.metrics.totalDeliveries++;
    driver.activeOrders = driver.activeOrders.filter(
      (id) => id.toString() !== order._id.toString()
    );

    // Update payment status if COD
    if (order.paymentMethod === 'cod') {
      order.payment.status = 'cod_collected';
      order.payment.codCollectedByDriver = true;
      driver.cashBalance += order.payment.codAmount;
      driver.cashCollected += order.payment.codAmount;
    } else {
      order.payment.status = 'paid';
    }

    await driver.save();
  }

  await order.save();

  await sendOrderStatusNotification(
    order.customerId.toString(),
    order.orderNumber,
    status,
    ORDER_STATUS_LABELS[status] || status
  );

  // Send email notification for key status changes
  const customer = await User.findById(order.customerId).select('email').lean();
  if (customer?.email) {
    sendOrderStatusUpdate(customer.email, order.orderNumber, status).catch(() => {});
  }

  sendSuccess(res, order, `Order status updated to ${ORDER_STATUS_LABELS[status]}`);
}

export async function uploadProof(req: Request, res: Response): Promise<void> {
  const driver = await Driver.findOne({ userId: req.user!.userId });
  if (!driver) {
    sendError(res, 'DRIVER_NOT_FOUND', 'Driver not found', 404);
    return;
  }

  const order = await Order.findOne({ _id: req.params.id, driverId: driver._id });
  if (!order) {
    sendError(res, 'ORDER_NOT_FOUND', 'Order not found', 404);
    return;
  }

  if (!req.file) {
    sendError(res, 'NO_FILE', 'No proof image uploaded', 400);
    return;
  }

  try {
    const url = await uploadFile(req.file, 'proof-images');
    const proofType = req.body.type === 'delivery' ? 'delivery' : 'pickup';
    order.proofImages[proofType] = url;
    await order.save();

    logger.info({ orderId: order._id, proofType, url }, 'Proof image uploaded');
    sendSuccess(res, { url, type: proofType }, 'Proof uploaded');
  } catch (err: any) {
    logger.error({ err, orderId: req.params.id }, 'Failed to upload proof image');
    sendError(res, 'UPLOAD_FAILED', err.message || 'Failed to upload proof image', 500);
  }
}

export async function verifyDeliveryOtp(req: Request, res: Response): Promise<void> {
  const driver = await Driver.findOne({ userId: req.user!.userId });
  if (!driver) {
    sendError(res, 'DRIVER_NOT_FOUND', 'Driver not found', 404);
    return;
  }

  const order = await Order.findOne({ _id: req.params.id, driverId: driver._id });
  if (!order) {
    sendError(res, 'ORDER_NOT_FOUND', 'Order not found', 404);
    return;
  }

  const { otp } = req.body;
  if (!order.deliveryOtp || order.deliveryOtp !== otp) {
    sendError(res, 'INVALID_OTP', 'Delivery OTP does not match', 400);
    return;
  }

  sendSuccess(res, null, 'Delivery OTP verified');
}

export async function getEarnings(req: Request, res: Response): Promise<void> {
  const driver = await Driver.findOne({ userId: req.user!.userId });
  if (!driver) {
    sendError(res, 'DRIVER_NOT_FOUND', 'Driver not found', 404);
    return;
  }

  const transactions = await Transaction.find({ driverId: driver._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  sendSuccess(res, {
    metrics: driver.metrics,
    cashBalance: driver.cashBalance,
    cashCollected: driver.cashCollected,
    cashDeposited: driver.cashDeposited,
    recentTransactions: transactions,
  });
}

export async function getTaxSummary(req: Request, res: Response): Promise<void> {
  const driver = await Driver.findOne({ userId: req.user!.userId });
  if (!driver) {
    sendError(res, 'DRIVER_NOT_FOUND', 'Driver not found', 404);
    return;
  }

  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  const earnings = await Transaction.aggregate([
    {
      $match: {
        driverId: driver._id,
        createdAt: { $gte: startDate, $lt: endDate },
        type: { $in: ['earning', 'tip', 'cod_collection'] },
      },
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const totalEarnings = earnings.reduce((sum: number, e: any) => sum + e.total, 0);

  sendSuccess(res, {
    year,
    driverId: driver._id,
    breakdown: earnings,
    totalEarnings,
    totalDeliveries: driver.metrics.totalDeliveries,
    note: 'This is an estimated summary. Consult a tax professional for filing.',
  });
}

export async function collectCod(req: Request, res: Response): Promise<void> {
  const driver = await Driver.findOne({ userId: req.user!.userId });
  if (!driver) {
    sendError(res, 'DRIVER_NOT_FOUND', 'Driver not found', 404);
    return;
  }

  const { orderId, amount } = req.body;
  const order = await Order.findOne({ _id: orderId, driverId: driver._id });

  if (!order || order.paymentMethod !== 'cod') {
    sendError(res, 'INVALID_ORDER', 'Invalid COD order', 400);
    return;
  }

  order.payment.codCollectedByDriver = true;
  order.payment.status = 'cod_collected';
  await order.save();

  driver.cashBalance += amount;
  driver.cashCollected += amount;
  await driver.save();

  await Transaction.create({
    orderId: order._id,
    driverId: driver._id,
    customerId: order.customerId,
    type: 'cod_collection',
    amount,
    status: 'completed',
    description: `COD collected for order ${order.orderNumber}`,
  });

  sendSuccess(res, null, 'Cash collection recorded');
}

export async function depositCash(req: Request, res: Response): Promise<void> {
  const driver = await Driver.findOne({ userId: req.user!.userId });
  if (!driver) {
    sendError(res, 'DRIVER_NOT_FOUND', 'Driver not found', 404);
    return;
  }

  const { amount } = req.body;

  if (amount > driver.cashBalance) {
    sendError(res, 'EXCEEDS_BALANCE', 'Deposit amount exceeds cash balance', 400);
    return;
  }

  driver.cashBalance -= amount;
  driver.cashDeposited += amount;
  driver.lastCashDepositAt = new Date();
  await driver.save();

  await Transaction.create({
    driverId: driver._id,
    type: 'cod_deposit',
    amount,
    status: 'completed',
    description: `Cash deposit of $${amount}`,
  });

  sendSuccess(res, { remainingBalance: driver.cashBalance }, 'Cash deposit recorded');
}
