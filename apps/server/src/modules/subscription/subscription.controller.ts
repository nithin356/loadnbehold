import { Request, Response } from 'express';
import { User } from '../../models/User';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';

const PLANS = [
  { id: 'basic', name: 'Basic', price: 0, features: ['Standard delivery', 'Email support'], discount: 0, familySlots: 0 },
  { id: 'plus', name: 'Plus', price: 9.99, features: ['Priority delivery', 'Free pickup', '10% off all services', 'Chat support', 'Family sharing (2 members)'], discount: 10, familySlots: 2 },
  { id: 'premium', name: 'Premium', price: 29.99, features: ['Same-day delivery', 'Free pickup & delivery', '20% off all services', '24/7 phone support', 'Family sharing (5 members)'], discount: 20, familySlots: 5 },
];

export async function getPlans(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, PLANS);
}

export async function subscribe(req: Request, res: Response): Promise<void> {
  try {
    const { planId } = req.body;
    const userId = req.user!.userId;

    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) {
      sendError(res, 'INVALID_PLAN', 'Plan not found', 400);
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const user = await User.findByIdAndUpdate(
      userId,
      {
        subscription: {
          plan: planId,
          status: 'active',
          startDate,
          endDate,
          familySlots: plan.familySlots
        }
      },
      { new: true }
    );

    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }

    sendSuccess(res, {
      plan: planId,
      status: 'active',
      startDate,
      endDate,
      discount: plan.discount,
      familySlots: plan.familySlots
    }, `Subscribed to ${plan.name}`);
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to subscribe');
    sendError(res, 'INTERNAL_ERROR', 'Failed to process subscription', 500);
  }
}

export async function cancelSubscription(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        'subscription.plan': 'basic',
        'subscription.status': 'cancelled',
        'subscription.endDate': null,
        'subscription.familySlots': 0
      },
      { new: true }
    );

    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }

    sendSuccess(res, null, 'Subscription cancelled. You are now on the Basic plan.');
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to cancel subscription');
    sendError(res, 'INTERNAL_ERROR', 'Failed to cancel subscription', 500);
  }
}

export async function getCurrentSubscription(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user!.userId).select('subscription');
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }

    const plan = PLANS.find((p) => p.id === user.subscription?.plan) || PLANS[0];

    sendSuccess(res, {
      ...plan,
      status: user.subscription?.status || 'active',
      startDate: user.subscription?.startDate,
      endDate: user.subscription?.endDate,
      isActive: user.subscription?.plan !== 'basic' && user.subscription?.status === 'active',
    });
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to get subscription');
    sendError(res, 'INTERNAL_ERROR', 'Failed to retrieve subscription', 500);
  }
}
