import { Request, Response } from 'express';
import { User } from '../../models/User';
import { AppConfig } from '../../models/AppConfig';
import { creditToWallet } from '../wallet/wallet.controller';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';

async function getReferralConfig() {
  const config = await AppConfig.findOne({ key: 'global' });
  return {
    referrerReward: config?.referral?.referrerReward ?? 5,
    refereeDiscount: config?.referral?.refereeDiscount ?? 5,
    maxReferralsPerUser: config?.referral?.maxReferralsPerUser ?? 50,
  };
}

export async function getReferralCode(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user!.userId).select('referralCode name');
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }

    const { referrerReward } = await getReferralConfig();
    const referralCount = await User.countDocuments({ referredBy: user.referralCode });

    sendSuccess(res, {
      code: user.referralCode,
      referralCount,
      bonusPerReferral: referrerReward,
      totalEarned: referralCount * referrerReward,
    });
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to get referral code');
    sendError(res, 'INTERNAL_ERROR', 'Failed to retrieve referral code', 500);
  }
}

export async function applyReferralCode(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.body;
    const userId = req.user!.userId;

    const user = await User.findById(userId);
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }

    if (user.referredBy) {
      sendError(res, 'ALREADY_REFERRED', 'You have already used a referral code', 400);
      return;
    }

    if (user.totalOrders > 0) {
      sendError(res, 'NOT_NEW_USER', 'Referral codes can only be applied before your first order', 400);
      return;
    }

    const referrer = await User.findOne({ referralCode: code });
    if (!referrer) {
      sendError(res, 'INVALID_CODE', 'Referral code not found', 404);
      return;
    }

    if (referrer._id.toString() === userId) {
      sendError(res, 'SELF_REFERRAL', 'You cannot refer yourself', 400);
      return;
    }

    const { referrerReward, refereeDiscount } = await getReferralConfig();

    user.referredBy = code;
    await user.save();

    await creditToWallet(userId, refereeDiscount, 'referral', `Welcome bonus from referral code ${code}`);
    await creditToWallet(referrer._id.toString(), referrerReward, 'referral', `Referral bonus — ${user.phone} joined`);

    sendSuccess(res, {
      bonusReceived: refereeDiscount,
      message: `$${refereeDiscount} added to your wallet!`,
    });
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to apply referral code');
    sendError(res, 'INTERNAL_ERROR', 'Failed to apply referral code', 500);
  }
}
