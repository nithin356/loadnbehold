import { Request, Response } from 'express';
import { User } from '../../models/User';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';

export async function addMember(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { name, phone, relationship } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }

    // Check subscription tier for family limit (plus: 2, premium: 5)
    let maxMembers = 0;
    if (user.subscription?.plan === 'premium') maxMembers = 5;
    else if (user.subscription?.plan === 'plus') maxMembers = 2;

    if (user.familyMembers.length >= maxMembers) {
      sendError(res, 'FAMILY_LIMIT', `Your ${user.subscription?.plan || 'basic'} plan allows up to ${maxMembers} family member(s)`, 400);
      return;
    }

    user.familyMembers.push({ name, phone, relationship: relationship || 'family' });
    await user.save();

    const newMember = user.familyMembers[user.familyMembers.length - 1];
    sendSuccess(res, newMember, 'Family member added', 201);
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to add family member');
    sendError(res, 'INTERNAL_ERROR', 'Failed to add family member', 500);
  }
}

export async function getMembers(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user!.userId).select('familyMembers');
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }
    sendSuccess(res, user.familyMembers);
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to get family members');
    sendError(res, 'INTERNAL_ERROR', 'Failed to retrieve family members', 500);
  }
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findByIdAndUpdate(
      req.user!.userId,
      { $pull: { familyMembers: { _id: req.params.id } } },
      { new: true }
    );

    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }

    sendSuccess(res, null, 'Family member removed');
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to remove family member');
    sendError(res, 'INTERNAL_ERROR', 'Failed to remove family member', 500);
  }
}
