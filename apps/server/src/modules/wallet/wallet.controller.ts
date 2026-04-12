import { Request, Response } from 'express';
import { User } from '../../models/User';
import { WalletTransaction } from '../../models/Wallet';
import { createPaymentIntent } from '../../services/payment.service';
import { getGatewayChain } from '../../config/payment';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';

export async function getBalance(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user!.userId).select('walletBalance');
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }
    sendSuccess(res, { balance: user.walletBalance });
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to get wallet balance');
    sendError(res, 'INTERNAL_ERROR', 'Failed to retrieve balance', 500);
  }
}

export async function topUp(req: Request, res: Response): Promise<void> {
  try {
    const { amount, savedPaymentMethodId, saveCard } = req.body;
    const userId = req.user!.userId;

    const user = await User.findById(userId);
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }

    if (user.walletBalance + amount > 10_000) {
      sendError(res, 'MAX_BALANCE_EXCEEDED', 'Wallet balance cannot exceed $10,000', 400);
      return;
    }

    const gatewayChain = getGatewayChain();

    if (gatewayChain.length > 0) {
      const result = await createPaymentIntent(
        amount,
        'usd',
        { userId, purpose: 'wallet_topup', walletTopupAmount: String(amount) },
        { userId, savedPaymentMethodId, saveCard },
      );

      if (result.success) {
        sendSuccess(res, {
          clientSecret: result.clientSecret,
          approvalUrl: result.approvalUrl,
          gateway: result.gateway,
          transactionId: result.transactionId,
          amount,
          requiresConfirmation: true,
        }, 'Confirm payment to complete top-up');
        return;
      }

      logger.warn({ userId, amount, error: result.error }, 'Payment gateway failed for wallet top-up, falling back to direct credit');
    }

    user.walletBalance += amount;
    await user.save();

    await WalletTransaction.create({
      userId,
      type: 'topup',
      amount,
      balance: user.walletBalance,
      description: `Wallet top-up of $${amount}`,
    });

    sendSuccess(res, {
      balance: user.walletBalance,
      amount,
      requiresConfirmation: false,
    }, `$${amount} added to wallet`);
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Wallet top-up failed');
    sendError(res, 'INTERNAL_ERROR', 'Failed to process top-up', 500);
  }
}

// Called after Stripe confirms payment (via webhook or client confirmation)
export async function confirmTopUp(req: Request, res: Response): Promise<void> {
  try {
    const { paymentIntentId, amount } = req.body;
    const userId = req.user!.userId;

    const user = await User.findById(userId);
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }

    if (user.walletBalance + amount > 10_000) {
      sendError(res, 'MAX_BALANCE_EXCEEDED', 'Wallet balance cannot exceed $10,000', 400);
      return;
    }

    user.walletBalance += amount;
    await user.save();

    await WalletTransaction.create({
      userId,
      type: 'topup',
      amount,
      balance: user.walletBalance,
      description: `Wallet top-up of $${amount}`,
      gatewayTransactionId: paymentIntentId,
    });

    logger.info({ userId, amount, newBalance: user.walletBalance }, 'Wallet top-up confirmed');
    sendSuccess(res, { balance: user.walletBalance }, `$${amount} added to wallet`);
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Wallet top-up confirmation failed');
    sendError(res, 'INTERNAL_ERROR', 'Failed to confirm top-up', 500);
  }
}

export async function payWithWallet(req: Request, res: Response): Promise<void> {
  try {
    const { orderId, amount } = req.body;
    const userId = req.user!.userId;

    const user = await User.findById(userId);
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }

    if (user.walletBalance < amount) {
      sendError(res, 'INSUFFICIENT_WALLET', `Wallet balance ($${user.walletBalance}) is less than $${amount}`, 400);
      return;
    }

    const { Order } = await import('../../models/Order');
    const order = await Order.findById(orderId);
    if (!order) {
      sendError(res, 'NOT_FOUND', 'Order not found', 404);
      return;
    }

    const result = await deductFromWallet(userId, amount, orderId, `Payment for order ${order.orderNumber}`);

    if (!result.success) {
      sendError(res, 'WALLET_DEDUCTION_FAILED', 'Failed to deduct from wallet', 500);
      return;
    }

    order.paymentMethod = 'wallet';
    order.payment.gateway = 'wallet';
    order.payment.walletAmount = amount;
    order.payment.status = 'paid';
    await order.save();

    sendSuccess(res, { newBalance: result.newBalance, orderId }, `$${amount} paid from wallet`);
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Wallet payment failed');
    sendError(res, 'INTERNAL_ERROR', 'Failed to process wallet payment', 500);
  }
}

export async function getTransactions(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      WalletTransaction.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      WalletTransaction.countDocuments({ userId }),
    ]);

    sendPaginated(res, transactions, total, page, limit);
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to get wallet transactions');
    sendError(res, 'INTERNAL_ERROR', 'Failed to retrieve transactions', 500);
  }
}

// Internal helper — used by order and admin modules
export async function deductFromWallet(
  userId: string,
  amount: number,
  orderId: string,
  description: string
): Promise<{ success: boolean; newBalance: number }> {
  const user = await User.findById(userId);
  if (!user || user.walletBalance < amount) {
    return { success: false, newBalance: user?.walletBalance || 0 };
  }

  user.walletBalance -= amount;
  await user.save();

  await WalletTransaction.create({
    userId,
    type: 'payment',
    amount: -amount,
    balance: user.walletBalance,
    description,
    orderId,
  });

  return { success: true, newBalance: user.walletBalance };
}

export async function creditToWallet(
  userId: string,
  amount: number,
  type: 'refund' | 'credit' | 'referral',
  description: string,
  orderId?: string
): Promise<number> {
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: amount } },
    { new: true }
  );

  if (user) {
    await WalletTransaction.create({
      userId,
      type,
      amount,
      balance: user.walletBalance,
      description,
      orderId,
    });
    return user.walletBalance;
  }

  return 0;
}
