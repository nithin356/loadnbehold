import { Request, Response } from 'express';
import { Order } from '../../models/Order';
import { User } from '../../models/User';
import { AppConfig } from '../../models/AppConfig';
import { Offer } from '../../models/Offer';
import { WalletTransaction } from '../../models/Wallet';
import { findOutletForAddress } from '../../services/geolocation.service';
import { sendOrderStatusNotification } from '../../services/notification.service';
import { sendOrderConfirmation } from '../../services/email.service';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse';
import { redis } from '../../config/redis';
import { CANCELLATION_POLICY, ORDER_STATUS_LABELS, SERVICES as DEFAULT_SERVICES } from '@loadnbehold/constants';
import { Service } from '../../models/Service';
import { Driver } from '../../models/Driver';

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, '0');
  return `LNB-${year}-${random}`;
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { items, pickupAddress, deliveryAddress, schedule, paymentMethod, promoCode, tip: requestedTip } = req.body;

  // Find outlet for pickup address
  const coords = pickupAddress.location.coordinates;
  const outlet = await findOutletForAddress(coords[0], coords[1]);

  if (!outlet) {
    sendError(res, 'ORDER_OUTSIDE_RADIUS', 'Your address is outside our service area', 400);
    return;
  }

  // Get app config for pricing
  const config = await AppConfig.findOne({ key: 'global' });
  const taxRate = config?.taxRate || 6.0;
  const deliveryFeeConfig = config?.deliveryFee || { base: 4.99, perMile: 0.5, freeAbove: 50 };

  // Calculate pricing — use DB prices first, fall back to constants
  const basePricesMap: Record<string, number> = {};
  const dbServices = await Service.find({ isActive: true }).lean();
  if (dbServices.length > 0) {
    for (const svc of dbServices) basePricesMap[svc.key] = svc.basePrice;
  } else {
    for (const svc of DEFAULT_SERVICES) basePricesMap[svc.key] = svc.basePrice;
  }

  let subtotal = 0;
  for (const item of items) {
    const unitPrice = item.price || basePricesMap[item.service] || 5;
    const lineTotal = item.quantity * (item.weight || 1) * unitPrice;
    item.price = unitPrice;
    subtotal += lineTotal;
  }

  const deliveryFee = subtotal >= deliveryFeeConfig.freeAbove ? 0 : deliveryFeeConfig.base;
  const tax = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
  const tip = Math.max(0, parseFloat((Number(requestedTip) || 0).toFixed(2)));

  // Promo code validation & discount
  let discount = 0;
  let appliedOffer: any = null;

  if (promoCode) {
    const now = new Date();
    const offer = await Offer.findOne({
      promoCode: promoCode.toUpperCase(),
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
    });

    if (!offer) {
      sendError(res, 'INVALID_PROMO', 'Invalid or expired promo code', 400);
      return;
    }

    if (offer.config.minOrderAmount && subtotal < offer.config.minOrderAmount) {
      sendError(res, 'MIN_ORDER_NOT_MET', `Minimum order of $${offer.config.minOrderAmount} required for this promo`, 400);
      return;
    }

    if (offer.config.usageLimit && offer.redemptions >= offer.config.usageLimit) {
      sendError(res, 'PROMO_EXHAUSTED', 'This promo code has reached its usage limit', 400);
      return;
    }

    // Check per-user limit
    const userRedemptions = await Order.countDocuments({ customerId: userId, promoCode: promoCode.toUpperCase(), status: { $ne: 'cancelled' } });
    if (userRedemptions >= offer.config.perUserLimit) {
      sendError(res, 'PROMO_ALREADY_USED', 'You have already used this promo code', 400);
      return;
    }

    // Calculate discount
    if (offer.config.discountType === 'percentage') {
      discount = parseFloat(((subtotal * offer.config.discountValue) / 100).toFixed(2));
      if (offer.config.maxDiscount && discount > offer.config.maxDiscount) {
        discount = offer.config.maxDiscount;
      }
    } else {
      discount = offer.config.discountValue;
    }

    discount = Math.min(discount, subtotal); // never exceed subtotal
    appliedOffer = offer;
  }

  const total = parseFloat((subtotal + deliveryFee + tax + tip - discount).toFixed(2));

  // COD constraint checks
  const codConfig = config?.payment.cod;
  const forceCodN = codConfig?.forceCodForFirstNOrders ?? 3;
  const user = await User.findById(userId);
  const isWithinForcedCodWindow = forceCodN > 0 && user && user.totalOrders < forceCodN;

  // Wallet balance check
  if (paymentMethod === 'wallet') {
    if (!user || (user.walletBalance || 0) < total) {
      sendError(res, 'INSUFFICIENT_WALLET', `Wallet balance ($${(user?.walletBalance || 0).toFixed(2)}) is insufficient for this order ($${total.toFixed(2)})`, 400);
      return;
    }
  }

  // Force COD for first N orders
  if (isWithinForcedCodWindow && paymentMethod !== 'cod') {
    sendError(
      res,
      'COD_REQUIRED',
      `Your first ${forceCodN} orders must use Cash on Delivery. You have ${user!.totalOrders} completed order(s).`,
      400
    );
    return;
  }

  // COD eligibility check (skip minCompletedOrders if within forced COD window)
  if (paymentMethod === 'cod') {
    if (!codConfig?.enabled && !isWithinForcedCodWindow) {
      sendError(res, 'COD_DISABLED', 'Cash on Delivery is not available', 400);
      return;
    }

    if (!isWithinForcedCodWindow && user && user.totalOrders < (codConfig?.minCompletedOrdersRequired || 3)) {
      sendError(res, 'COD_NOT_ELIGIBLE', `Complete ${codConfig?.minCompletedOrdersRequired} orders first to use COD`, 400);
      return;
    }

    if (total > (codConfig?.maxOrderAmount || 100)) {
      sendError(res, 'COD_MAX_EXCEEDED', `COD is limited to $${codConfig?.maxOrderAmount}`, 400);
      return;
    }
  }

  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    customerId: userId,
    outletId: outlet._id,
    status: 'placed',
    items,
    pickupAddress,
    deliveryAddress,
    schedule,
    pricing: { subtotal, deliveryFee, tax, discount, surcharge: 0, tip, total },
    paymentMethod,
    payment: {
      gateway: paymentMethod === 'cod' ? 'cod' : paymentMethod === 'wallet' ? 'wallet' : 'stripe',
      status: paymentMethod === 'cod' ? 'cod_pending' : paymentMethod === 'wallet' ? 'completed' : 'pending',
      codAmount: paymentMethod === 'cod' ? total : 0,
      walletAmount: paymentMethod === 'wallet' ? total : 0,
      onlineAmount: paymentMethod === 'online' ? total : 0,
      codCollectedByDriver: false,
    },
    promoCode: promoCode ? promoCode.toUpperCase() : undefined,
    offerId: appliedOffer?._id,
    timeline: [{ status: 'placed', timestamp: new Date() }],
    isRecurring: req.body.isRecurring || false,
    recurringSchedule: req.body.recurringSchedule,
    specialInstructions: req.body.specialInstructions,
    deliveryInstructions: req.body.deliveryInstructions,
  });

  // Deduct wallet balance for wallet payments
  if (paymentMethod === 'wallet' && user) {
    user.walletBalance = (user.walletBalance || 0) - total;
    await user.save();
    await WalletTransaction.create({
      userId,
      type: 'payment',
      amount: -total,
      balance: user.walletBalance,
      description: `Payment for order ${order.orderNumber}`,
      orderId: order._id,
    });
  }

  // Increment user order count + offer redemptions
  await User.findByIdAndUpdate(userId, { $inc: { totalOrders: 1 } });
  if (appliedOffer) {
    await Offer.findByIdAndUpdate(appliedOffer._id, { $inc: { redemptions: 1 } });
  }

  // Send notification
  await sendOrderStatusNotification(userId, order.orderNumber, 'placed', 'Order Placed');

  // Send order confirmation email asynchronously
  if (user?.email) {
    sendOrderConfirmation(user.email, order.orderNumber, items, total).catch(() => {});
  }

  sendSuccess(res, order, 'Order placed successfully', 201);
}

export async function getOrders(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { page, limit, sort, order: sortOrder } = req.query as Record<string, string>;

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  const sortField = sort || 'createdAt';
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  const [orders, total] = await Promise.all([
    Order.find({ customerId: userId })
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limitNum)
      .populate('outletId', 'name address')
      .populate('driverId', 'userId vehicle metrics.rating')
      .lean(),
    Order.countDocuments({ customerId: userId }),
  ]);

  sendPaginated(res, orders, total, pageNum, limitNum);
}

export async function getOrderById(req: Request, res: Response): Promise<void> {
  const order = await Order.findOne({
    _id: req.params.id,
    customerId: req.user!.userId,
  })
    .populate('outletId', 'name address')
    .populate('driverId')
    .lean();

  if (!order) {
    sendError(res, 'ORDER_NOT_FOUND', 'Order not found', 404);
    return;
  }

  sendSuccess(res, order);
}

export async function cancelOrder(req: Request, res: Response): Promise<void> {
  const order = await Order.findOne({
    _id: req.params.id,
    customerId: req.user!.userId,
  });

  if (!order) {
    sendError(res, 'ORDER_NOT_FOUND', 'Order not found', 404);
    return;
  }

  const policy = CANCELLATION_POLICY[order.status];
  if (!policy || !policy.allowed) {
    sendError(res, 'CANCELLATION_NOT_ALLOWED', `Cannot cancel order in "${ORDER_STATUS_LABELS[order.status]}" status`, 400);
    return;
  }

  const { reason, refundMethod } = req.body || {};
  const refundPercent = policy.refundPercent;
  const fee = policy.fee;
  const refundAmount = parseFloat(((order.pricing.total * refundPercent) / 100 - fee).toFixed(2));

  order.status = 'cancelled';
  order.timeline.push({
    status: 'cancelled',
    timestamp: new Date(),
    note: reason
      ? `Cancelled by customer: ${reason}. Fee: $${fee}`
      : `Cancelled by customer. Fee: $${fee}`,
  });

  // Process refund for non-COD orders
  let refundInfo: { method?: string; amount: number; status: string } = { amount: 0, status: 'none' };

  if (order.paymentMethod !== 'cod' && refundAmount > 0) {
    // Wallet payments always refund to wallet instantly
    const chosenMethod = order.paymentMethod === 'wallet' ? 'wallet' : (refundMethod || 'wallet');

    if (chosenMethod === 'wallet') {
      // Credit to wallet
      const user = await User.findById(req.user!.userId);
      if (user) {
        user.walletBalance = (user.walletBalance || 0) + refundAmount;
        await user.save();
        await WalletTransaction.create({
          userId: req.user!.userId,
          type: 'refund',
          amount: refundAmount,
          balance: user.walletBalance,
          description: `Refund for cancelled order ${order.orderNumber}`,
          orderId: order._id,
        });
        order.refund = { method: 'wallet', amount: refundAmount, status: 'processed', processedAt: new Date() };
        order.payment.status = 'refunded';
        refundInfo = { method: 'wallet', amount: refundAmount, status: 'processed' };
      }
    } else {
      // Original payment method — process via gateway
      try {
        const { processRefund } = await import('../../services/payment.service');
        const gatewayResult = await processRefund(
          order.payment.gatewayTransactionId || order.payment.transactionId || '',
          refundAmount,
          order.payment.gateway,
        );
        if (gatewayResult.success) {
          order.refund = { method: 'original_payment', amount: refundAmount, status: 'processed', processedAt: new Date() };
          order.payment.status = 'refunded';
          refundInfo = { method: 'original_payment', amount: refundAmount, status: 'processed' };
        } else {
          order.refund = { method: 'original_payment', amount: refundAmount, status: 'pending' };
          refundInfo = { method: 'original_payment', amount: refundAmount, status: 'pending' };
        }
      } catch {
        order.refund = { method: 'original_payment', amount: refundAmount, status: 'pending' };
        refundInfo = { method: 'original_payment', amount: refundAmount, status: 'pending' };
      }
    }
  }

  await order.save();

  await sendOrderStatusNotification(req.user!.userId, order.orderNumber, 'cancelled', 'Cancelled');

  sendSuccess(res, {
    refundPercent,
    fee,
    refundAmount: refundAmount > 0 ? refundAmount : 0,
    refund: refundInfo,
  }, 'Order cancelled');
}

export async function rateOrder(req: Request, res: Response): Promise<void> {
  const order = await Order.findOne({
    _id: req.params.id,
    customerId: req.user!.userId,
    status: 'delivered',
  });

  if (!order) {
    sendError(res, 'ORDER_NOT_FOUND', 'Delivered order not found', 404);
    return;
  }

  if (order.rating) {
    sendError(res, 'ALREADY_RATED', 'Order already rated', 400);
    return;
  }

  order.rating = req.body;
  await order.save();

  // Update driver rating if rated
  if (order.driverId && req.body.driver) {
    const { Driver } = await import('../../models/Driver');
    const driver = await Driver.findById(order.driverId);
    if (driver) {
      const newCount = driver.metrics.ratingCount + 1;
      const newRating =
        (driver.metrics.rating * driver.metrics.ratingCount + req.body.driver) / newCount;
      driver.metrics.rating = parseFloat(newRating.toFixed(2));
      driver.metrics.ratingCount = newCount;
      await driver.save();
    }
  }

  sendSuccess(res, null, 'Thank you for your rating!');
}

export async function getTrackingData(req: Request, res: Response): Promise<void> {
  const order = await Order.findOne({
    _id: req.params.id,
    customerId: req.user!.userId,
  })
    .select('status driverId timeline orderNumber outletId pickupAddress deliveryAddress')
    .populate({
      path: 'driverId',
      select: 'userId vehicle metrics.rating currentLocation',
      populate: { path: 'userId', select: 'name phone' },
    })
    .populate('outletId', 'name address');

  if (!order) {
    sendError(res, 'ORDER_NOT_FOUND', 'Order not found', 404);
    return;
  }

  // Get driver location from Redis cache
  let driverLocation = null;
  let driver = null;

  if (order.driverId && typeof order.driverId === 'object') {
    const d = order.driverId as any;
    const driverId = d._id;

    const cached = await redis.get(`driver:location:${driverId}`);
    if (cached) {
      driverLocation = JSON.parse(cached);
    }
    // Fallback: query driver's last known location from DB
    if (!driverLocation) {
      const driverDoc = await Driver.findById(driverId).select('currentLocation').lean();
      if (driverDoc?.currentLocation?.coordinates?.length === 2 && (driverDoc.currentLocation.coordinates[0] !== 0 || driverDoc.currentLocation.coordinates[1] !== 0)) {
        driverLocation = { coordinates: driverDoc.currentLocation.coordinates };
      }
    }

    driver = {
      name: d.userId?.name || 'Driver',
      phone: d.userId?.phone || '',
      rating: d.metrics?.rating || 0,
      vehicle: d.vehicle ? `${d.vehicle.color || ''} ${d.vehicle.make || ''} ${d.vehicle.model || ''}`.trim() : undefined,
      licensePlate: d.vehicle?.plate || undefined,
    };
  }

  const driverIdRaw = order.driverId;
  const driverId = driverIdRaw
    ? (typeof driverIdRaw === 'object' ? (driverIdRaw as any)._id?.toString() : String(driverIdRaw))
    : null;

  sendSuccess(res, {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    timeline: order.timeline,
    driverLocation,
    driver,
    driverId,
  });
}

export async function reorder(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const original = await Order.findOne({ _id: req.params.id, customerId: userId });

  if (!original) {
    sendError(res, 'ORDER_NOT_FOUND', 'Original order not found', 404);
    return;
  }

  // Create new order based on original
  const newOrder = await Order.create({
    orderNumber: generateOrderNumber(),
    customerId: userId,
    outletId: original.outletId,
    status: 'placed',
    items: original.items.map((item: any) => ({
      service: item.service,
      quantity: item.quantity,
      weight: item.weight,
      unit: item.unit,
      specialInstructions: item.specialInstructions,
    })),
    pickupAddress: original.pickupAddress,
    deliveryAddress: original.deliveryAddress,
    pricing: original.pricing,
    paymentMethod: original.paymentMethod,
    payment: {
      gateway: original.payment.gateway,
      status: 'pending',
      codAmount: 0,
      walletAmount: 0,
      onlineAmount: original.pricing.total,
      codCollectedByDriver: false,
    },
    timeline: [{ status: 'placed', timestamp: new Date() }],
  });

  await User.findByIdAndUpdate(userId, { $inc: { totalOrders: 1 } });
  await sendOrderStatusNotification(userId, newOrder.orderNumber, 'placed', 'Reorder Placed');

  sendSuccess(res, newOrder, 'Reorder placed successfully', 201);
}

export async function raiseDispute(req: Request, res: Response): Promise<void> {
  const order = await Order.findOne({
    _id: req.params.id,
    customerId: req.user!.userId,
  });

  if (!order) {
    sendError(res, 'ORDER_NOT_FOUND', 'Order not found', 404);
    return;
  }

  if (!['delivered', 'completed'].includes(order.status)) {
    sendError(res, 'DISPUTE_NOT_ALLOWED', 'Disputes can only be raised on delivered orders', 400);
    return;
  }

  const { SupportTicket } = await import('../../models/SupportTicket');
  const ticket = await SupportTicket.create({
    customerId: req.user!.userId,
    orderId: order._id,
    category: 'order_issue',
    subject: req.body.reason || `Dispute for order ${order.orderNumber}`,
    description: req.body.reason,
    priority: 'high',
    slaDeadline: new Date(Date.now() + 8 * 60 * 60 * 1000),
    messages: [{
      senderId: req.user!.userId,
      senderRole: 'customer',
      message: req.body.reason,
      attachments: req.body.photos || [],
      createdAt: new Date(),
    }],
  });

  order.dispute = { ticketId: ticket._id, reason: req.body.reason, status: 'open' };
  await order.save();

  sendSuccess(res, { ticketId: ticket._id, orderId: order._id }, 'Dispute raised successfully', 201);
}

export async function getInvoice(req: Request, res: Response): Promise<void> {
  const order = await Order.findOne({
    _id: req.params.id,
    customerId: req.user!.userId,
  })
    .populate('outletId', 'name address')
    .lean();

  if (!order) {
    sendError(res, 'ORDER_NOT_FOUND', 'Order not found', 404);
    return;
  }

  // Return invoice data as JSON (PDF generation can be added later with puppeteer/pdfkit)
  const invoice = {
    invoiceNumber: `INV-${order.orderNumber}`,
    date: order.createdAt,
    customer: { id: order.customerId },
    order: {
      orderNumber: order.orderNumber,
      items: order.items,
      pricing: order.pricing,
      paymentMethod: order.paymentMethod,
      status: order.status,
    },
    outlet: order.outletId,
  };

  // For now return JSON; in production this would generate a PDF
  res.setHeader('Content-Type', 'application/json');
  sendSuccess(res, invoice);
}
