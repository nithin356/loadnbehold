import { Request, Response } from 'express';
import { User } from '../../models/User';
import { Order } from '../../models/Order';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';

export async function getPoints(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user!.userId).select('loyaltyPoints totalOrders');
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }

    let tier = 'Bronze';
    let pointsToNextTier = 500 - user.loyaltyPoints;

    if (user.loyaltyPoints >= 1500) {
      tier = 'Gold';
      pointsToNextTier = 0;
    } else if (user.loyaltyPoints >= 500) {
      tier = 'Silver';
      pointsToNextTier = 1500 - user.loyaltyPoints;
    }

    sendSuccess(res, {
      points: user.loyaltyPoints,
      tier,
      totalOrders: user.totalOrders,
      pointsToNextTier: Math.max(0, pointsToNextTier),
    });
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to get loyalty points');
    sendError(res, 'INTERNAL_ERROR', 'Failed to retrieve loyalty points', 500);
  }
}

export async function redeemPoints(req: Request, res: Response): Promise<void> {
  try {
    const { points } = req.body;
    const userId = req.user!.userId;

    const user = await User.findById(userId);
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }

    if (user.loyaltyPoints < points) {
      sendError(res, 'INSUFFICIENT_POINTS', `You only have ${user.loyaltyPoints} points`, 400);
      return;
    }

    if (points < 100) {
      sendError(res, 'MIN_REDEEM', 'Minimum redemption is 100 points', 400);
      return;
    }

    // 100 points = $1 wallet credit
    const walletCredit = points / 100;

    user.loyaltyPoints -= points;
    user.walletBalance += walletCredit;
    await user.save();

    sendSuccess(res, {
      pointsRedeemed: points,
      walletCredit,
      remainingPoints: user.loyaltyPoints,
      newWalletBalance: user.walletBalance,
    }, `${points} points redeemed for $${walletCredit.toFixed(2)} wallet credit`);
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to redeem loyalty points');
    sendError(res, 'INTERNAL_ERROR', 'Failed to redeem points', 500);
  }
}
