import { Request, Response } from 'express';
import { User } from '../../models/User';
import { Driver } from '../../models/Driver';
import { Order } from '../../models/Order';
import { Outlet } from '../../models/Outlet';
import { Offer } from '../../models/Offer';
import { Banner } from '../../models/Banner';
import { AppConfig } from '../../models/AppConfig';
import { AuditLog } from '../../models/AuditLog';
import { Service } from '../../models/Service';
import { creditToWallet } from '../wallet/wallet.controller';
import { queues } from '../../jobs/queue';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';

// ─── Dashboard ─────────────────────────────────────────────
export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const { SupportTicket } = await import('../../models/SupportTicket');

  const [
    ordersToday, revenueToday, ordersYesterday, revenueYesterday,
    driversOnline, openTickets, totalCustomers, totalOrders,
    cancelledToday, activeOrders,
  ] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: today } }),
    Order.aggregate([
      { $match: { createdAt: { $gte: today }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } },
    ]),
    Order.countDocuments({ createdAt: { $gte: yesterday, $lt: today } }),
    Order.aggregate([
      { $match: { createdAt: { $gte: yesterday, $lt: today }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } },
    ]),
    Driver.countDocuments({ isOnline: true, status: 'approved' }),
    SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
    User.countDocuments({ role: 'customer' }),
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: today }, status: 'cancelled' }),
    Order.countDocuments({ status: { $in: ['placed', 'driver_assigned', 'pickup_enroute', 'picked_up', 'at_laundry', 'processing', 'quality_check', 'out_for_delivery'] } }),
  ]);

  const revToday = revenueToday[0]?.total || 0;
  const revYesterday = revenueYesterday[0]?.total || 0;

  sendSuccess(res, {
    ordersToday,
    revenueToday: revToday,
    ordersYesterday,
    revenueYesterday: revYesterday,
    driversOnline,
    openTickets,
    totalCustomers,
    totalOrders,
    cancelledToday,
    activeOrders,
    orderChangePercent: ordersYesterday > 0 ? Math.round(((ordersToday - ordersYesterday) / ordersYesterday) * 100) : 0,
    revenueChangePercent: revYesterday > 0 ? Math.round(((revToday - revYesterday) / revYesterday) * 100) : 0,
  });
}

// ─── Outlets ───────────────────────────────────────────────
export async function getOutlets(req: Request, res: Response): Promise<void> {
  const outlets = await Outlet.find().sort({ createdAt: -1 }).lean();
  sendSuccess(res, outlets);
}

export async function createOutlet(req: Request, res: Response): Promise<void> {
  const outlet = await Outlet.create(req.body);

  await logAudit(req, 'outlet.created', 'outlet', outlet._id.toString());
  sendSuccess(res, outlet, 'Outlet created', 201);
}

export async function updateOutlet(req: Request, res: Response): Promise<void> {
  const outlet = await Outlet.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!outlet) {
    sendError(res, 'NOT_FOUND', 'Outlet not found', 404);
    return;
  }

  await logAudit(req, 'outlet.updated', 'outlet', outlet._id.toString());
  sendSuccess(res, outlet, 'Outlet updated');
}

export async function deleteOutlet(req: Request, res: Response): Promise<void> {
  await Outlet.findByIdAndDelete(req.params.id);
  await logAudit(req, 'outlet.deleted', 'outlet', req.params.id as string);
  sendSuccess(res, null, 'Outlet deleted');
}

export async function getOutletById(req: Request, res: Response): Promise<void> {
  const outlet = await Outlet.findById(req.params.id).lean();
  if (!outlet) {
    sendError(res, 'NOT_FOUND', 'Outlet not found', 404);
    return;
  }
  sendSuccess(res, outlet);
}

// ─── Orders ────────────────────────────────────────────────
export async function getOrderById(req: Request, res: Response): Promise<void> {
  const order = await Order.findById(req.params.id)
    .populate('customerId', 'name phone email')
    .populate({
      path: 'driverId',
      select: 'userId vehicle metrics status',
      populate: { path: 'userId', select: 'name phone' },
    })
    .populate('outletId', 'name address')
    .lean();

  if (!order) {
    sendError(res, 'NOT_FOUND', 'Order not found', 404);
    return;
  }

  sendSuccess(res, order);
}

export async function getAllOrders(req: Request, res: Response): Promise<void> {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const status = req.query.status as string;
  const paymentMethod = req.query.paymentMethod as string;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (paymentMethod) filter.paymentMethod = paymentMethod;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'name phone')
      .populate('driverId', 'userId')
      .populate('outletId', 'name')
      .lean(),
    Order.countDocuments(filter),
  ]);

  sendPaginated(res, orders, total, page, limit);
}

export async function updateOrder(req: Request, res: Response): Promise<void> {
  const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!order) {
    sendError(res, 'NOT_FOUND', 'Order not found', 404);
    return;
  }

  await logAudit(req, 'order.updated', 'order', order._id.toString());
  sendSuccess(res, order, 'Order updated');
}

export async function assignDriverToOrder(req: Request, res: Response): Promise<void> {
  const { driverId } = req.body;
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    {
      driverId,
      status: 'driver_assigned',
      $push: { timeline: { status: 'driver_assigned', timestamp: new Date(), note: 'Manually assigned by admin' } },
    },
    { new: true }
  );

  if (!order) {
    sendError(res, 'NOT_FOUND', 'Order not found', 404);
    return;
  }

  // Add order to driver's active list
  await Driver.findByIdAndUpdate(driverId, { $push: { activeOrders: order._id } });

  await logAudit(req, 'order.driver_assigned', 'order', order._id.toString());
  sendSuccess(res, order, 'Driver assigned to order');
}

export async function adjustOrderPrice(req: Request, res: Response): Promise<void> {
  const { weight, subtotal, note } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    sendError(res, 'NOT_FOUND', 'Order not found', 404);
    return;
  }

  if (weight) {
    for (const item of order.items) {
      if (item.unit === 'lbs' || item.unit === 'kg') {
        item.weight = weight;
      }
    }
  }

  if (subtotal !== undefined) {
    const { AppConfig } = await import('../../models/AppConfig');
    const appConfig = await AppConfig.findOne({ key: 'global' });
    const taxRate = appConfig?.taxRate ?? 6.0;
    order.pricing.subtotal = subtotal;
    order.pricing.tax = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
    order.pricing.total = parseFloat((subtotal + order.pricing.deliveryFee + order.pricing.tax - order.pricing.discount).toFixed(2));
  }

  order.timeline.push({
    status: order.status,
    timestamp: new Date(),
    note: note || 'Price adjusted by admin after weighing',
    actor: req.user!.userId,
  });

  await order.save();
  await logAudit(req, 'order.price_adjusted', 'order', order._id.toString());
  sendSuccess(res, order, 'Order price adjusted');
}

export async function refundOrder(req: Request, res: Response): Promise<void> {
  const order = await Order.findById(req.params.id);
  if (!order) {
    sendError(res, 'NOT_FOUND', 'Order not found', 404);
    return;
  }

  const { amount, toWallet } = req.body;
  const refundAmount = amount || order.pricing.total;

  if (toWallet) {
    await creditToWallet(
      order.customerId.toString(),
      refundAmount,
      'refund',
      `Refund for order ${order.orderNumber}`,
      order._id.toString()
    );
  } else if (order.payment.gatewayTransactionId) {
    // Refund via payment gateway
    const { processRefund } = await import('../../services/payment.service');
    const refundResult = await processRefund(
      order.payment.gatewayTransactionId,
      refundAmount,
      order.payment.gateway || 'stripe'
    );
    if (!refundResult.success) {
      logger.warn({ orderId: order._id, error: refundResult.error }, 'Gateway refund failed, crediting to wallet instead');
      await creditToWallet(
        order.customerId.toString(),
        refundAmount,
        'refund',
        `Refund for order ${order.orderNumber} (gateway refund failed)`,
        order._id.toString()
      );
    }
  } else {
    // No gateway transaction — credit to wallet as fallback
    await creditToWallet(
      order.customerId.toString(),
      refundAmount,
      'refund',
      `Refund for order ${order.orderNumber}`,
      order._id.toString()
    );
  }

  order.payment.status = 'refunded';
  order.timeline.push({
    status: order.status,
    timestamp: new Date(),
    note: `Refund of $${refundAmount} issued${toWallet ? ' to wallet' : ''}`,
    actor: req.user!.userId,
  });
  await order.save();

  await logAudit(req, 'order.refunded', 'order', order._id.toString());
  sendSuccess(res, null, `Refund of $${refundAmount} processed`);
}

// ─── Drivers ───────────────────────────────────────────────
export async function getDrivers(req: Request, res: Response): Promise<void> {
  const drivers = await Driver.find()
    .populate('userId', 'name phone email')
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(res, drivers);
}

export async function getDriverById(req: Request, res: Response): Promise<void> {
  const driver = await Driver.findById(req.params.id)
    .populate('userId', 'name phone email')
    .lean();

  if (!driver) {
    sendError(res, 'NOT_FOUND', 'Driver not found', 404);
    return;
  }

  // Get recent orders for this driver
  const recentOrders = await Order.find({ driverId: driver._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('orderNumber status pricing.total createdAt')
    .lean();

  sendSuccess(res, { ...driver, recentOrders });
}

export async function approveDriver(req: Request, res: Response): Promise<void> {
  const driver = await Driver.findByIdAndUpdate(
    req.params.id,
    { status: req.body.approve ? 'approved' : 'rejected' },
    { new: true }
  );

  if (!driver) {
    sendError(res, 'NOT_FOUND', 'Driver not found', 404);
    return;
  }

  await logAudit(req, `driver.${req.body.approve ? 'approved' : 'rejected'}`, 'driver', driver._id.toString());
  sendSuccess(res, driver, `Driver ${req.body.approve ? 'approved' : 'rejected'}`);
}

export async function suspendDriver(req: Request, res: Response): Promise<void> {
  const driver = await Driver.findByIdAndUpdate(
    req.params.id,
    { status: 'suspended', isOnline: false, suspendedReason: req.body.reason },
    { new: true }
  );

  if (!driver) {
    sendError(res, 'NOT_FOUND', 'Driver not found', 404);
    return;
  }

  await logAudit(req, 'driver.suspended', 'driver', driver._id.toString());
  sendSuccess(res, driver, 'Driver suspended');
}

// ─── Customers ─────────────────────────────────────────────
export async function getCustomers(req: Request, res: Response): Promise<void> {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [customers, total] = await Promise.all([
    User.find({ role: 'customer' })
      .select('-fcmTokens')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments({ role: 'customer' }),
  ]);

  sendPaginated(res, customers, total, page, limit);
}

export async function getCustomerById(req: Request, res: Response): Promise<void> {
  const customer = await User.findById(req.params.id).select('-fcmTokens').lean();
  if (!customer) {
    sendError(res, 'NOT_FOUND', 'Customer not found', 404);
    return;
  }

  const [orders, walletTransactions] = await Promise.all([
    Order.find({ customerId: customer._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber status pricing.total createdAt')
      .lean(),
    (await import('../../models/Wallet')).WalletTransaction.find({ userId: customer._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  sendSuccess(res, { ...customer, recentOrders: orders, recentWalletTransactions: walletTransactions });
}

export async function blockCustomer(req: Request, res: Response): Promise<void> {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isBlocked: req.body.block ?? true },
    { new: true }
  );

  if (!user) {
    sendError(res, 'NOT_FOUND', 'Customer not found', 404);
    return;
  }

  await logAudit(req, `customer.${req.body.block ? 'blocked' : 'unblocked'}`, 'customer', user._id.toString());
  sendSuccess(res, null, `Customer ${req.body.block ? 'blocked' : 'unblocked'}`);
}

export async function creditCustomer(req: Request, res: Response): Promise<void> {
  const { amount, reason } = req.body;
  const newBalance = await creditToWallet(req.params.id as string, amount, 'credit', reason || 'Admin credit');

  await logAudit(req, 'customer.credited', 'customer', req.params.id as string);
  sendSuccess(res, { balance: newBalance }, `$${amount} credited to wallet`);
}

// ─── Offers ────────────────────────────────────────────────
export async function getOffers(req: Request, res: Response): Promise<void> {
  const offers = await Offer.find().sort({ createdAt: -1 }).lean();
  sendSuccess(res, offers);
}

export async function getOfferById(req: Request, res: Response): Promise<void> {
  const offer = await Offer.findById(req.params.id).lean();
  if (!offer) {
    sendError(res, 'NOT_FOUND', 'Offer not found', 404);
    return;
  }
  sendSuccess(res, offer);
}

export async function createOffer(req: Request, res: Response): Promise<void> {
  const offer = await Offer.create(req.body);
  await logAudit(req, 'offer.created', 'offer', offer._id.toString());
  sendSuccess(res, offer, 'Offer created', 201);
}

export async function updateOffer(req: Request, res: Response): Promise<void> {
  const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!offer) { sendError(res, 'NOT_FOUND', 'Offer not found', 404); return; }
  await logAudit(req, 'offer.updated', 'offer', offer._id.toString());
  sendSuccess(res, offer, 'Offer updated');
}

export async function deleteOffer(req: Request, res: Response): Promise<void> {
  await Offer.findByIdAndDelete(req.params.id);
  await logAudit(req, 'offer.deleted', 'offer', req.params.id as string);
  sendSuccess(res, null, 'Offer deleted');
}

// ─── Banners ───────────────────────────────────────────────
export async function getBanners(req: Request, res: Response): Promise<void> {
  const banners = await Banner.find().sort({ order: 1 }).lean();
  sendSuccess(res, banners);
}

export async function createBanner(req: Request, res: Response): Promise<void> {
  const banner = await Banner.create(req.body);
  await logAudit(req, 'banner.created', 'banner', banner._id.toString());
  sendSuccess(res, banner, 'Banner created', 201);
}

export async function updateBanner(req: Request, res: Response): Promise<void> {
  const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!banner) { sendError(res, 'NOT_FOUND', 'Banner not found', 404); return; }
  await logAudit(req, 'banner.updated', 'banner', banner._id.toString());
  sendSuccess(res, banner, 'Banner updated');
}

export async function deleteBanner(req: Request, res: Response): Promise<void> {
  await Banner.findByIdAndDelete(req.params.id);
  await logAudit(req, 'banner.deleted', 'banner', req.params.id as string);
  sendSuccess(res, null, 'Banner deleted');
}

// ─── Notifications ─────────────────────────────────────────
export async function sendBulkNotification(req: Request, res: Response): Promise<void> {
  const { title, body, target } = req.body;

  if (!title || !body) {
    sendError(res, 'INVALID_INPUT', 'Title and body are required', 400);
    return;
  }

  // Determine target audience
  let userIds: string[] = [];
  if (target === 'drivers') {
    const drivers = await Driver.find().select('userId').lean();
    userIds = drivers.map((d) => d.userId.toString());
  } else if (target === 'customers') {
    const users = await User.find({ role: 'customer' }).select('_id').lean();
    userIds = users.map((u) => u._id.toString());
  } else if (Array.isArray(target)) {
    userIds = target;
  } else {
    // Default: all users
    const users = await User.find().select('_id').lean();
    userIds = users.map((u) => u._id.toString());
  }

  // Queue each notification via BullMQ
  const jobs = userIds.map((userId) => ({
    name: 'send-push',
    data: { userId, title, body, data: { type: 'bulk_notification' } },
  }));

  if (jobs.length > 0) {
    await queues.notifications.addBulk(jobs);
  }

  logger.info({ target, recipientCount: userIds.length }, 'Bulk notification queued');
  await logAudit(req, 'notification.sent', 'notification', 'bulk');
  sendSuccess(res, { recipientCount: userIds.length }, `Notification queued for ${userIds.length} recipients`);
}

export async function getNotificationHistory(req: Request, res: Response): Promise<void> {
  const { Notification } = await import('../../models/Notification');
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  // Get distinct bulk notifications (grouped by title+body+sentAt rounded to minute)
  const [notifications, total] = await Promise.all([
    Notification.aggregate([
      { $sort: { sentAt: -1 } },
      {
        $group: {
          _id: { title: '$title', body: '$body', minute: { $dateTrunc: { date: '$sentAt', unit: 'minute' } } },
          title: { $first: '$title' },
          body: { $first: '$body' },
          sentAt: { $first: '$sentAt' },
          channel: { $first: '$channel' },
          count: { $sum: 1 },
          deliveredCount: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        },
      },
      { $sort: { sentAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]),
    Notification.aggregate([
      {
        $group: {
          _id: { title: '$title', body: '$body', minute: { $dateTrunc: { date: '$sentAt', unit: 'minute' } } },
        },
      },
      { $count: 'total' },
    ]),
  ]);

  const totalCount = total[0]?.total || 0;
  sendPaginated(res, notifications, totalCount, page, limit);
}

// ─── Config ────────────────────────────────────────────────
export async function getConfig(req: Request, res: Response): Promise<void> {
  let config = await AppConfig.findOne({ key: 'global' });
  if (!config) {
    config = await AppConfig.create({ key: 'global' });
  }
  sendSuccess(res, config);
}

export async function updateConfig(req: Request, res: Response): Promise<void> {
  const config = await AppConfig.findOneAndUpdate(
    { key: 'global' },
    { $set: req.body },
    { new: true, upsert: true }
  );
  await logAudit(req, 'config.updated', 'config', 'global');
  sendSuccess(res, config, 'Configuration updated');
}

// ─── COD Dashboard ─────────────────────────────────────────
export async function getCodDashboard(req: Request, res: Response): Promise<void> {
  const [codOrders, codPending, driversWithCash] = await Promise.all([
    Order.countDocuments({ paymentMethod: 'cod', 'payment.status': 'cod_collected' }),
    Order.aggregate([
      { $match: { paymentMethod: 'cod', 'payment.status': 'cod_collected' } },
      { $group: { _id: null, total: { $sum: '$payment.codAmount' } } },
    ]),
    Driver.find({ cashBalance: { $gt: 0 } })
      .populate('userId', 'name phone')
      .select('cashBalance cashCollected cashDeposited lastCashDepositAt')
      .lean(),
  ]);

  sendSuccess(res, {
    totalCodOrders: codOrders,
    pendingDeposit: codPending[0]?.total || 0,
    driversWithCash,
  });
}

export async function getCodDriverLedger(req: Request, res: Response): Promise<void> {
  const drivers = await Driver.find()
    .populate('userId', 'name phone')
    .select('cashBalance cashCollected cashDeposited lastCashDepositAt')
    .sort({ cashBalance: -1 })
    .lean();

  sendSuccess(res, drivers);
}

// ─── Reports ───────────────────────────────────────────────
export async function getReport(req: Request, res: Response): Promise<void> {
  const { type } = req.params;

  switch (type) {
    case 'revenue': {
      const days = parseInt(req.query.days as string) || 30;
      const since = new Date();
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);

      const revenue = await Order.aggregate([
        { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$pricing.total' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: days },
      ]);

      // Map _id to date for frontend consumption
      const mapped = revenue.map((r: any) => ({
        date: r._id,
        revenue: r.revenue,
        orders: r.orders,
      }));

      sendSuccess(res, mapped);
      break;
    }
    case 'orders': {
      const orders = await Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);
      // Map to { status, count } format
      const mappedOrders = orders.map((o: any) => ({
        status: o._id,
        count: o.count,
      }));
      sendSuccess(res, mappedOrders);
      break;
    }
    case 'overview': {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const [dailyRevenue, paymentMethods, topServices, hourlyDistribution] = await Promise.all([
        // Daily revenue for last 30 days
        Order.aggregate([
          { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              revenue: { $sum: '$pricing.total' },
              orders: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        // Payment method breakdown
        Order.aggregate([
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: '$paymentMethod',
              count: { $sum: 1 },
              total: { $sum: '$pricing.total' },
            },
          },
        ]),
        // Top services
        Order.aggregate([
          { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: thirtyDaysAgo } } },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.service',
              orders: { $sum: 1 },
              revenue: { $sum: '$items.price' },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 5 },
        ]),
        // Orders by hour of day
        Order.aggregate([
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: { $hour: '$createdAt' },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

      sendSuccess(res, {
        dailyRevenue: dailyRevenue.map((r: any) => ({ date: r._id, revenue: r.revenue, orders: r.orders })),
        paymentMethods: paymentMethods.map((p: any) => ({ method: p._id || 'unknown', count: p.count, total: p.total })),
        topServices: topServices.map((s: any) => ({ service: s._id, orders: s.orders, revenue: s.revenue })),
        hourlyDistribution: hourlyDistribution.map((h: any) => ({ hour: h._id, count: h.count })),
      });
      break;
    }
    default:
      sendError(res, 'INVALID_REPORT', 'Unknown report type', 400);
  }
}

// ─── COD Reconcile ────────────────────────────────────────
export async function reconcileDriverCash(req: Request, res: Response): Promise<void> {
  const driver = await Driver.findById(req.params.id);
  if (!driver) {
    sendError(res, 'NOT_FOUND', 'Driver not found', 404);
    return;
  }

  const { orderIds } = req.body;
  const reconciledAmount = driver.cashBalance;

  driver.cashBalance = 0;
  driver.cashDeposited += reconciledAmount;
  driver.lastCashDepositAt = new Date();
  await driver.save();

  // Mark orders as reconciled
  if (orderIds && orderIds.length > 0) {
    await Order.updateMany(
      { _id: { $in: orderIds } },
      { 'payment.status': 'paid' }
    );
  }

  const { Transaction: TxModel } = await import('../../models/Transaction');
  await TxModel.create({
    driverId: driver._id,
    type: 'cod_reconciliation',
    amount: reconciledAmount,
    status: 'completed',
    description: `Admin reconciled $${reconciledAmount} cash from driver`,
  });

  await logAudit(req, 'cod.reconciled', 'driver', driver._id.toString());
  sendSuccess(res, { reconciledAmount, driverId: driver._id }, 'Cash reconciled');
}

// ─── Admin Wallet ─────────────────────────────────────────
export async function getWalletCredits(req: Request, res: Response): Promise<void> {
  const { WalletTransaction } = await import('../../models/Wallet');
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  const [credits, total] = await Promise.all([
    WalletTransaction.find({ type: { $in: ['credit', 'refund', 'referral'] } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name phone')
      .lean(),
    WalletTransaction.countDocuments({ type: { $in: ['credit', 'refund', 'referral'] } }),
  ]);

  sendPaginated(res, credits, total, page, limit);
}

export async function adminCreditWallet(req: Request, res: Response): Promise<void> {
  const { amount, reason } = req.body;
  const userId = req.params.userId as string;
  const newBalance = await creditToWallet(userId, amount, 'credit', reason || 'Admin credit');

  await logAudit(req, 'wallet.credited', 'user', userId);
  sendSuccess(res, { balance: newBalance, userId }, `$${amount} credited to wallet`);
}

export async function adminDebitWallet(req: Request, res: Response): Promise<void> {
  const { amount, reason } = req.body;
  const userId = req.params.userId as string;
  const user = await User.findById(userId);

  if (!user) {
    sendError(res, 'NOT_FOUND', 'User not found', 404);
    return;
  }

  if (user.walletBalance < amount) {
    sendError(res, 'INSUFFICIENT_BALANCE', `User only has $${user.walletBalance} in wallet`, 400);
    return;
  }

  user.walletBalance -= amount;
  await user.save();

  const { WalletTransaction } = await import('../../models/Wallet');
  await WalletTransaction.create({
    userId,
    type: 'debit',
    amount: -amount,
    balance: user.walletBalance,
    description: reason || 'Admin debit',
  });

  await logAudit(req, 'wallet.debited', 'user', userId);
  sendSuccess(res, { balance: user.walletBalance }, `$${amount} debited from wallet`);
}

// ─── Admin Support ────────────────────────────────────────
export async function getAllSupportTickets(req: Request, res: Response): Promise<void> {
  const { SupportTicket } = await import('../../models/SupportTicket');
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const status = req.query.status as string;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter)
      .sort({ slaDeadline: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'name phone')
      .lean(),
    SupportTicket.countDocuments(filter),
  ]);

  // Add SLA status
  const now = new Date();
  const enriched = tickets.map((t: any) => ({
    ...t,
    slaBreached: t.slaDeadline && new Date(t.slaDeadline) < now && t.status !== 'resolved',
  }));

  sendPaginated(res, enriched, total, page, limit);
}

export async function assignTicket(req: Request, res: Response): Promise<void> {
  const { SupportTicket } = await import('../../models/SupportTicket');
  const { staffId } = req.body;

  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.id,
    { assignedTo: staffId, status: 'in_progress' },
    { new: true }
  );

  if (!ticket) {
    sendError(res, 'NOT_FOUND', 'Ticket not found', 404);
    return;
  }

  await logAudit(req, 'ticket.assigned', 'support_ticket', ticket._id.toString());
  sendSuccess(res, ticket, 'Ticket assigned');
}

export async function resolveTicket(req: Request, res: Response): Promise<void> {
  const { SupportTicket } = await import('../../models/SupportTicket');
  const { resolution } = req.body;

  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) {
    sendError(res, 'NOT_FOUND', 'Ticket not found', 404);
    return;
  }

  ticket.status = 'resolved';
  ticket.resolution = resolution || 'Resolved by admin';
  ticket.resolvedAt = new Date();
  ticket.messages.push({
    senderId: req.user!.userId as any,
    senderRole: 'admin',
    message: resolution || 'Ticket resolved by admin',
    createdAt: new Date(),
  });
  await ticket.save();

  await logAudit(req, 'ticket.resolved', 'support_ticket', ticket._id.toString());
  sendSuccess(res, ticket, 'Ticket resolved');
}

// Get single ticket with full conversation
export async function getTicketById(req: Request, res: Response): Promise<void> {
  const { SupportTicket } = await import('../../models/SupportTicket');
  const ticket = await SupportTicket.findById(req.params.id)
    .populate('customerId', 'name phone email')
    .populate('assignedTo', 'name')
    .populate('orderId', 'orderNumber pricing status')
    .lean();

  if (!ticket) {
    sendError(res, 'NOT_FOUND', 'Ticket not found', 404);
    return;
  }

  sendSuccess(res, ticket);
}

// Change ticket status (Jira-like transitions)
export async function updateTicketStatus(req: Request, res: Response): Promise<void> {
  const { SupportTicket } = await import('../../models/SupportTicket');
  const { status, note } = req.body;

  const validStatuses = ['open', 'in_progress', 'waiting_for_info', 'resolved', 'closed'];
  if (!validStatuses.includes(status)) {
    sendError(res, 'INVALID_STATUS', `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    return;
  }

  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) {
    sendError(res, 'NOT_FOUND', 'Ticket not found', 404);
    return;
  }

  const oldStatus = ticket.status;
  ticket.status = status;

  if (status === 'resolved' && !ticket.resolvedAt) {
    ticket.resolvedAt = new Date();
  }
  if (status === 'closed') {
    ticket.closedAt = new Date();
  }

  // Add status change as a system message
  ticket.messages.push({
    senderId: req.user!.userId as any,
    senderRole: 'admin',
    message: note || `Status changed from ${oldStatus.replace(/_/g, ' ')} to ${status.replace(/_/g, ' ')}`,
    isInternal: true,
    createdAt: new Date(),
  });

  await ticket.save();
  await logAudit(req, 'ticket.status_changed', 'support_ticket', ticket._id.toString());
  sendSuccess(res, ticket, `Status updated to ${status}`);
}

// Add comment to ticket
export async function addTicketComment(req: Request, res: Response): Promise<void> {
  const { SupportTicket } = await import('../../models/SupportTicket');
  const { message, isInternal } = req.body;

  if (!message?.trim()) {
    sendError(res, 'INVALID_INPUT', 'Message is required', 400);
    return;
  }

  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) {
    sendError(res, 'NOT_FOUND', 'Ticket not found', 404);
    return;
  }

  ticket.messages.push({
    senderId: req.user!.userId as any,
    senderRole: 'admin',
    message: message.trim(),
    isInternal: isInternal || false,
    createdAt: new Date(),
  });

  // If admin replies and ticket is open or waiting, move to in_progress
  if (['open', 'waiting_for_info'].includes(ticket.status) && !isInternal) {
    ticket.status = 'in_progress';
  }

  await ticket.save();
  sendSuccess(res, ticket, 'Comment added');
}

// Update ticket priority
export async function updateTicketPriority(req: Request, res: Response): Promise<void> {
  const { SupportTicket } = await import('../../models/SupportTicket');
  const { priority } = req.body;

  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  if (!validPriorities.includes(priority)) {
    sendError(res, 'INVALID_PRIORITY', `Must be one of: ${validPriorities.join(', ')}`, 400);
    return;
  }

  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.id,
    { priority },
    { new: true }
  );

  if (!ticket) {
    sendError(res, 'NOT_FOUND', 'Ticket not found', 404);
    return;
  }

  sendSuccess(res, ticket, `Priority updated to ${priority}`);
}

// ─── Audit Logs ───────────────────────────────────────────
export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(),
  ]);

  sendPaginated(res, logs, total, page, limit);
}

// ─── Services ─────────────────────────────────────────────
export async function getServices(req: Request, res: Response): Promise<void> {
  const services = await Service.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
  sendSuccess(res, services);
}

export async function createService(req: Request, res: Response): Promise<void> {
  const service = await Service.create(req.body);
  await logAudit(req, 'service.created', 'service', service._id.toString());
  sendSuccess(res, service, 'Service created', 201);
}

export async function updateService(req: Request, res: Response): Promise<void> {
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!service) {
    sendError(res, 'NOT_FOUND', 'Service not found', 404);
    return;
  }
  await logAudit(req, 'service.updated', 'service', service._id.toString());
  sendSuccess(res, service, 'Service updated');
}

export async function deleteService(req: Request, res: Response): Promise<void> {
  await Service.findByIdAndDelete(req.params.id);
  await logAudit(req, 'service.deleted', 'service', req.params.id as string);
  sendSuccess(res, null, 'Service deleted');
}

export async function seedServices(_req: Request, res: Response): Promise<void> {
  const { SERVICES } = await import('@loadnbehold/constants');
  const existing = await Service.countDocuments();
  if (existing > 0) {
    sendSuccess(res, null, `Services already exist (${existing} found). Skipped seeding.`);
    return;
  }
  const docs = SERVICES.map((s, i) => ({ ...s, sortOrder: i, isActive: true }));
  await Service.insertMany(docs);
  sendSuccess(res, null, `Seeded ${docs.length} services`);
}

// ─── Audit Helper ──────────────────────────────────────────
async function logAudit(
  req: Request,
  action: string,
  resourceType: string,
  resourceId: string
): Promise<void> {
  try {
    await AuditLog.create({
      actor: {
        userId: req.user!.userId,
        role: req.user!.adminRole || req.user!.role,
        ip: req.ip || 'unknown',
      },
      action,
      resource: { type: resourceType, id: resourceId },
      timestamp: new Date(),
    });
  } catch {
    // Non-critical — don't fail the request
  }
}
