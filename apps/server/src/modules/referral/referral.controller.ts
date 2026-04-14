import { Request, Response } from 'express';
import { User } from '../../models/User';
import { AppConfig } from '../../models/AppConfig';
import { WalletTransaction } from '../../models/Wallet';
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

    // Sum actual referral credits from wallet transactions
    const creditedTxns = await WalletTransaction.aggregate([
      { $match: { userId: user._id.toString(), type: 'referral' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalEarned = creditedTxns[0]?.total ?? 0;

    sendSuccess(res, {
      code: user.referralCode,
      referralCount,
      bonusPerReferral: referrerReward,
      totalEarned,
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

    const { refereeDiscount } = await getReferralConfig();

    user.referredBy = code;
    await user.save();

    sendSuccess(res, {
      bonusReceived: refereeDiscount,
      message: `You'll receive $${refereeDiscount} after your first order is delivered!`,
    });
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to apply referral code');
    sendError(res, 'INTERNAL_ERROR', 'Failed to apply referral code', 500);
  }
}

export async function getReferralHistory(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user!.userId).select('referralCode');
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }

    const referredUsers = await User.find({ referredBy: user.referralCode })
      .select('name phone createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Check which referred users have had their referral credited
    const creditedUserIds = new Set(
      (await WalletTransaction.find({
        type: 'referral',
        description: { $regex: /completed first order/ },
      }).select('description').lean()).reduce<string[]>((ids, txn) => {
        // Match phone from description "Referral bonus — +1XXXXXXX completed first order"
        const phoneMatch = (txn as any).description?.match(/— (\+\d+) completed/);
        if (phoneMatch) ids.push(phoneMatch[1]);
        return ids;
      }, [])
    );

    const history = referredUsers.map((u) => ({
      name: u.name || 'User',
      phone: u.phone.replace(/(\+\d)\d{6}(\d{4})/, '$1******$2'),
      joinedAt: u.createdAt,
      status: creditedUserIds.has(u.phone) ? 'completed' : 'pending',
    }));

    sendSuccess(res, history);
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to get referral history');
    sendError(res, 'INTERNAL_ERROR', 'Failed to retrieve referral history', 500);
  }
}

/**
 * Called when an order is delivered. Credits both referee and referrer
 * on the referred user's first delivered order.
 */
export async function processReferralReward(customerId: string): Promise<void> {
  try {
    const customer = await User.findById(customerId).select('referredBy phone');
    if (!customer?.referredBy) return;

    // Check if referral reward was already credited
    const alreadyCredited = await WalletTransaction.exists({ userId: customerId, type: 'referral' });
    if (alreadyCredited) return;

    const referrer = await User.findOne({ referralCode: customer.referredBy });
    if (!referrer) return;

    const { referrerReward, refereeDiscount } = await getReferralConfig();

    await creditToWallet(customerId, refereeDiscount, 'referral', 'Welcome bonus — first order delivered!');
    await creditToWallet(referrer._id.toString(), referrerReward, 'referral', `Referral bonus — ${customer.phone} completed first order`);

    logger.info({ customerId, referrerId: referrer._id.toString() }, 'Referral rewards credited');
  } catch (err) {
    logger.error({ err, customerId }, 'Failed to process referral reward');
  }
}
