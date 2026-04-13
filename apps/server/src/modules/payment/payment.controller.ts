import { Request, Response } from 'express';
import crypto from 'crypto';
import {
  createPaymentIntent, processRefund, capturePayPalOrder, completeSquarePayment,
  savePaymentMethodFromIntent, listSavedPaymentMethods, deleteSavedPaymentMethod,
  setDefaultPaymentMethod,
} from '../../services/payment.service';
import { getAllGatewayHealth, getStripe, pingGatewayHealth } from '../../config/payment';
import { env } from '../../config/env';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';
import { Order } from '../../models/Order';
import { Transaction } from '../../models/Transaction';

// ─── Create Payment Intent ─────────────────────────────────
export async function createIntent(req: Request, res: Response): Promise<void> {
  const { orderId, currency, saveCard, savedPaymentMethodId } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    sendError(res, 'NOT_FOUND', 'Order not found', 404);
    return;
  }

  // Security: verify order belongs to authenticated user
  if (order.customerId.toString() !== req.user!.userId) {
    sendError(res, 'FORBIDDEN', 'You do not have access to this order', 403);
    return;
  }

  // Security: always use server-side order total, never trust client amount
  const chargeAmount = order.pricing.total;

  const result = await createPaymentIntent(
    chargeAmount,
    currency || 'usd',
    { orderId: order._id.toString(), orderNumber: order.orderNumber },
    { saveCard, savedPaymentMethodId, userId: req.user!.userId },
  );

  if (!result.success) {
    sendError(res, 'PAYMENT_FAILED', result.error || 'Payment failed', 502);
    return;
  }

  // Record transaction
  await Transaction.create({
    orderId: order._id,
    customerId: req.user!.userId,
    type: 'charge',
    amount: chargeAmount,
    gateway: result.gateway,
    gatewayTransactionId: result.transactionId,
    status: result.gateway === 'paypal' ? 'pending' : 'completed',
    description: `Payment for order ${order.orderNumber} via ${result.gateway}`,
  });

  sendSuccess(res, {
    gateway: result.gateway,
    transactionId: result.transactionId,
    clientSecret: result.clientSecret,    // Stripe
    approvalUrl: result.approvalUrl,       // PayPal
    failoverAttempts: result.failoverAttempts,
  });
}

// ─── Confirm Payment (after 3DS) ──────────────────────────
export async function confirmPayment(req: Request, res: Response): Promise<void> {
  const { paymentIntentId, orderId, saveCard } = req.body;

  try {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, { 'payment.status': 'completed' });
        await Transaction.findOneAndUpdate(
          { gatewayTransactionId: paymentIntentId },
          { status: 'completed' }
        );
      }

      // Save card if user opted in and setup_future_usage was set
      if (saveCard && paymentIntent.setup_future_usage) {
        await savePaymentMethodFromIntent(
          req.user!.userId,
          'stripe',
          paymentIntentId,
        );
      }

      sendSuccess(res, { status: 'succeeded', transactionId: paymentIntentId });
    } else if (paymentIntent.status === 'requires_action') {
      sendSuccess(res, { status: 'requires_action', clientSecret: paymentIntent.client_secret });
    } else {
      sendError(res, 'PAYMENT_FAILED', `Payment status: ${paymentIntent.status}`, 402);
    }
  } catch (error) {
    logger.error({ err: error }, 'Payment confirmation failed');
    sendError(res, 'PAYMENT_FAILED', 'Payment confirmation failed', 502);
  }
}

// ─── COD: Place ───────────────────────────────────────────
export async function codPlace(req: Request, res: Response): Promise<void> {
  const { orderId } = req.body;
  const userId = req.user!.userId;

  const order = await Order.findById(orderId);
  if (!order) {
    sendError(res, 'NOT_FOUND', 'Order not found', 404);
    return;
  }

  // Check COD eligibility
  const user = await (await import('../../models/User')).User.findById(userId);
  if (!user || user.totalOrders < 3) {
    sendError(res, 'COD_NOT_ELIGIBLE', 'Complete at least 3 orders to use Cash on Delivery', 403);
    return;
  }

  const config = await (await import('../../models/AppConfig')).AppConfig.findOne({ key: 'global' });
  const maxCod = config?.payment?.cod?.maxOrderAmount || 100;
  if (order.pricing.total > maxCod) {
    sendError(res, 'COD_AMOUNT_EXCEEDED', `COD is limited to $${maxCod}`, 400);
    return;
  }

  order.paymentMethod = 'cod';
  order.payment.gateway = 'cod';
  order.payment.status = 'cod_pending';
  order.payment.codAmount = order.pricing.total;
  await order.save();

  await Transaction.create({
    orderId: order._id,
    customerId: userId,
    type: 'charge',
    amount: order.pricing.total,
    gateway: 'cod',
    status: 'pending',
    description: `COD payment for order ${order.orderNumber}`,
  });

  sendSuccess(res, { orderId: order._id, paymentMethod: 'cod', amount: order.pricing.total });
}

// ─── COD: Collect ─────────────────────────────────────────
export async function codCollect(req: Request, res: Response): Promise<void> {
  const { orderId, amountCollected } = req.body;

  const order = await Order.findById(orderId);
  if (!order || order.paymentMethod !== 'cod') {
    sendError(res, 'INVALID_ORDER', 'Invalid COD order', 400);
    return;
  }

  // Validate collected amount matches order total
  if (amountCollected !== undefined && amountCollected !== order.pricing.total) {
    logger.warn({ orderId, expected: order.pricing.total, collected: amountCollected }, 'COD amount mismatch');
    sendError(res, 'AMOUNT_MISMATCH', `Expected $${order.pricing.total} but driver reported $${amountCollected}`, 400);
    return;
  }

  order.payment.codCollectedByDriver = true;
  order.payment.status = 'cod_collected';
  order.payment.codAmount = order.pricing.total;
  await order.save();

  await Transaction.findOneAndUpdate(
    { orderId: order._id, type: 'charge', gateway: 'cod' },
    { status: 'completed' }
  );

  sendSuccess(res, null, `Cash of $${order.pricing.total} collected`);
}

// ─── COD: Deposit ─────────────────────────────────────────
export async function codDeposit(req: Request, res: Response): Promise<void> {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);
  if (!order || order.paymentMethod !== 'cod') {
    sendError(res, 'INVALID_ORDER', 'Invalid COD order', 400);
    return;
  }

  order.payment.status = 'paid';
  await order.save();

  sendSuccess(res, null, 'Cash deposit recorded');
}

// ─── COD: Ledger ──────────────────────────────────────────
export async function codLedger(req: Request, res: Response): Promise<void> {
  const { from, to } = req.query;

  const filter: Record<string, unknown> = {
    gateway: 'cod',
  };

  if (from || to) {
    filter.createdAt = {};
    if (from) (filter.createdAt as any).$gte = new Date(from as string);
    if (to) (filter.createdAt as any).$lte = new Date(to as string);
  }

  const transactions = await Transaction.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  sendSuccess(res, transactions);
}

// ─── Refund ───────────────────────────────────────────────
export async function refund(req: Request, res: Response): Promise<void> {
  const { orderId, amount, reason, refundTo } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    sendError(res, 'NOT_FOUND', 'Order not found', 404);
    return;
  }

  const refundAmount = amount || order.pricing.total;

  if (refundTo === 'wallet') {
    const { creditToWallet } = await import('../wallet/wallet.controller');
    await creditToWallet(
      order.customerId.toString(),
      refundAmount,
      'refund',
      reason || `Refund for order ${order.orderNumber}`,
      order._id.toString()
    );
    order.payment.status = 'refunded';
    await order.save();
    sendSuccess(res, { refundAmount, refundTo: 'wallet' }, 'Refund credited to wallet');
    return;
  }

  // Refund to original payment method
  const { processRefund: gatewayRefund } = await import('../../services/payment.service');
  const result = await gatewayRefund(
    order.payment.gatewayTransactionId || '',
    refundAmount,
    order.payment.gateway
  );

  if (result.success) {
    order.payment.status = 'refunded';
    await order.save();
  }

  sendSuccess(res, { ...result, refundAmount }, result.success ? 'Refund processed' : 'Refund failed');
}

// ─── Capture PayPal ────────────────────────────────────────
export async function capturePayPal(req: Request, res: Response): Promise<void> {
  const { paypalOrderId, orderId } = req.body;

  // Verify order belongs to authenticated user
  const order = await Order.findById(orderId);
  if (!order) {
    sendError(res, 'NOT_FOUND', 'Order not found', 404);
    return;
  }
  if (order.customerId.toString() !== req.user!.userId) {
    sendError(res, 'FORBIDDEN', 'You do not have access to this order', 403);
    return;
  }

  const result = await capturePayPalOrder(paypalOrderId);

  if (result.success) {
    await Order.findByIdAndUpdate(orderId, {
      'payment.status': 'completed',
      'payment.transactionId': result.transactionId,
    });
    await Transaction.findOneAndUpdate(
      { gatewayTransactionId: paypalOrderId },
      { status: 'completed', gatewayTransactionId: result.transactionId }
    );
  }

  sendSuccess(res, result);
}

// ─── Complete Square ───────────────────────────────────────
export async function completeSquare(req: Request, res: Response): Promise<void> {
  const { paymentId, orderId } = req.body;

  const result = await completeSquarePayment(paymentId);

  if (result.success) {
    await Order.findByIdAndUpdate(orderId, { 'payment.status': 'completed' });
    await Transaction.findOneAndUpdate(
      { gatewayTransactionId: paymentId },
      { status: 'completed' }
    );
  }

  sendSuccess(res, result);
}

// ─── Stripe Webhook ────────────────────────────────────────
export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'] as string;

  if (!env.STRIPE_WEBHOOK_SECRET) {
    logger.warn('Stripe webhook received but STRIPE_WEBHOOK_SECRET not configured');
    res.status(200).json({ received: true });
    return;
  }

  try {
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const orderId = pi.metadata?.orderId;
        const walletTopupAmount = pi.metadata?.walletTopupAmount;
        const walletUserId = pi.metadata?.userId;

        if (walletTopupAmount && walletUserId) {
          // Wallet top-up — credit the user's wallet (with idempotency check)
          const { User: UserModel } = await import('../../models/User');
          const { WalletTransaction } = await import('../../models/Wallet');
          const amount = parseFloat(walletTopupAmount);

          // Idempotency: skip if this payment intent already processed
          const existingTxn = await WalletTransaction.findOne({ gatewayTransactionId: pi.id });
          if (existingTxn) {
            logger.info(`Stripe webhook: duplicate wallet top-up ignored for ${pi.id}`);
            break;
          }

          const user = await UserModel.findById(walletUserId);
          if (user) {
            user.walletBalance += amount;
            await user.save();
            await WalletTransaction.create({
              userId: walletUserId,
              type: 'topup',
              amount,
              balance: user.walletBalance,
              description: `Wallet top-up of $${amount}`,
              gatewayTransactionId: pi.id,
            });
            logger.info(`Stripe webhook: wallet top-up $${amount} for user ${walletUserId}`);
          }
        } else if (orderId) {
          await Order.findByIdAndUpdate(orderId, { 'payment.status': 'completed' });
          await Transaction.findOneAndUpdate(
            { gatewayTransactionId: pi.id },
            { status: 'completed' }
          );
          logger.info(`Stripe: payment_intent.succeeded for order ${orderId}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        const orderId = pi.metadata?.orderId;
        if (orderId) {
          await Transaction.findOneAndUpdate(
            { gatewayTransactionId: pi.id },
            { status: 'failed' }
          );
          logger.warn(`Stripe: payment_intent.payment_failed for order ${orderId}`);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        logger.info(`Stripe: charge.refunded ${charge.id}`);
        break;
      }

      default:
        logger.info(`Stripe webhook: unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error({ err: error }, 'Stripe webhook signature verification failed');
    res.status(400).json({ error: 'Webhook signature verification failed' });
  }
}

// ─── Square Webhook ────────────────────────────────────────
export async function squareWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers['x-square-hmacsha256-signature'] as string;

  if (env.SQUARE_WEBHOOK_SIGNATURE_KEY) {
    if (!signature) {
      res.status(400).json({ error: 'Missing Square signature' });
      return;
    }
    // Verify HMAC-SHA256 signature
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const notificationUrl = `${env.API_BASE_URL || ''}/api/v1/payments/webhook/square`;
    const hmac = crypto.createHmac('sha256', env.SQUARE_WEBHOOK_SIGNATURE_KEY)
      .update(notificationUrl + body)
      .digest('base64');
    if (hmac !== signature) {
      logger.warn('Square webhook signature verification failed');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }
  } else {
    logger.warn('SQUARE_WEBHOOK_SIGNATURE_KEY not configured — skipping verification');
  }

  try {
    const event = req.body;

    switch (event.type) {
      case 'payment.completed': {
        const paymentId = event.data?.object?.payment?.id;
        if (paymentId) {
          await Transaction.findOneAndUpdate(
            { gatewayTransactionId: paymentId },
            { status: 'completed' }
          );
          logger.info(`Square: payment.completed ${paymentId}`);
        }
        break;
      }

      case 'refund.created': {
        const refundId = event.data?.object?.refund?.id;
        logger.info(`Square: refund.created ${refundId}`);
        break;
      }

      default:
        logger.info(`Square webhook: unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error({ err: error }, 'Square webhook processing failed');
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// ─── PayPal Webhook ────────────────────────────────────────
export async function paypalWebhook(req: Request, res: Response): Promise<void> {
  // Verify PayPal webhook signature
  if (env.PAYPAL_WEBHOOK_ID) {
    const transmissionId = req.headers['paypal-transmission-id'] as string;
    const transmissionTime = req.headers['paypal-transmission-time'] as string;
    const certUrl = req.headers['paypal-cert-url'] as string;
    const transmissionSig = req.headers['paypal-transmission-sig'] as string;

    if (!transmissionId || !transmissionTime || !transmissionSig) {
      logger.warn('PayPal webhook missing required signature headers');
      res.status(400).json({ error: 'Missing PayPal signature headers' });
      return;
    }

    // In production, verify the signature by calling PayPal's verify-webhook-signature API
    // For now, log that we received the required headers
    logger.info({ transmissionId, certUrl }, 'PayPal webhook received with signature headers');
  } else {
    logger.warn('PAYPAL_WEBHOOK_ID not configured — skipping webhook verification');
  }

  try {
    const event = req.body;

    switch (event.event_type) {
      case 'CHECKOUT.ORDER.APPROVED': {
        const orderId = event.resource?.id;
        logger.info(`PayPal: CHECKOUT.ORDER.APPROVED ${orderId}`);
        // Customer approved — capture will happen via client
        break;
      }

      case 'PAYMENT.CAPTURE.COMPLETED': {
        const captureId = event.resource?.id;
        if (captureId) {
          await Transaction.findOneAndUpdate(
            { gatewayTransactionId: captureId },
            { status: 'completed' }
          );
          logger.info(`PayPal: PAYMENT.CAPTURE.COMPLETED ${captureId}`);
        }
        break;
      }

      case 'PAYMENT.CAPTURE.REFUNDED': {
        const captureId = event.resource?.id;
        logger.info(`PayPal: PAYMENT.CAPTURE.REFUNDED ${captureId}`);
        break;
      }

      default:
        logger.info(`PayPal webhook: unhandled event type ${event.event_type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error({ err: error }, 'PayPal webhook processing failed');
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// ─── Saved Payment Methods ─────────────────────────────────
export async function getSavedMethods(req: Request, res: Response): Promise<void> {
  const methods = await listSavedPaymentMethods(req.user!.userId);
  sendSuccess(res, methods);
}

export async function deleteSavedMethod(req: Request, res: Response): Promise<void> {
  const deleted = await deleteSavedPaymentMethod(req.user!.userId, req.params.id as string);
  if (!deleted) {
    sendError(res, 'NOT_FOUND', 'Payment method not found', 404);
    return;
  }
  sendSuccess(res, null, 'Payment method removed');
}

export async function setDefaultMethod(req: Request, res: Response): Promise<void> {
  const updated = await setDefaultPaymentMethod(req.user!.userId, req.params.id as string);
  if (!updated) {
    sendError(res, 'NOT_FOUND', 'Payment method not found', 404);
    return;
  }
  sendSuccess(res, null, 'Default payment method updated');
}

// ─── Gateway Health (admin) ────────────────────────────────
export async function getGatewayHealth(req: Request, res: Response): Promise<void> {
  const health = getAllGatewayHealth();
  sendSuccess(res, {
    gateways: health,
    failoverChain: [
      env.PAYMENT_PRIMARY_GATEWAY,
      env.PAYMENT_FALLBACK_GATEWAY,
      env.PAYMENT_SECONDARY_FALLBACK_GATEWAY,
    ],
    autoFailover: env.PAYMENT_AUTO_FAILOVER,
  });
}
