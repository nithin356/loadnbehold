import { Request, Response } from 'express';
import { RecurringOrder } from '../../models/RecurringOrder';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';

export async function createRecurringOrder(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const recurring = await RecurringOrder.create({
      customerId: userId,
      ...req.body,
      nextScheduledDate: calculateNextDate(req.body.frequency, req.body.dayOfWeek, req.body.dayOfMonth),
    });

    sendSuccess(res, recurring, 'Recurring order created', 201);
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to create recurring order');
    sendError(res, 'INTERNAL_ERROR', 'Failed to create recurring order', 500);
  }
}

export async function getRecurringOrders(req: Request, res: Response): Promise<void> {
  try {
    const orders = await RecurringOrder.find({ customerId: req.user!.userId, isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, orders);
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to get recurring orders');
    sendError(res, 'INTERNAL_ERROR', 'Failed to retrieve recurring orders', 500);
  }
}

export async function updateRecurringOrder(req: Request, res: Response): Promise<void> {
  try {
    const order = await RecurringOrder.findOneAndUpdate(
      { _id: req.params.id, customerId: req.user!.userId },
      { $set: req.body },
      { new: true }
    );

    if (!order) {
      sendError(res, 'NOT_FOUND', 'Recurring order not found', 404);
      return;
    }

    sendSuccess(res, order, 'Recurring order updated');
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to update recurring order');
    sendError(res, 'INTERNAL_ERROR', 'Failed to update recurring order', 500);
  }
}

export async function deleteRecurringOrder(req: Request, res: Response): Promise<void> {
  try {
    const order = await RecurringOrder.findOneAndUpdate(
      { _id: req.params.id, customerId: req.user!.userId },
      { isActive: false },
      { new: true }
    );

    if (!order) {
      sendError(res, 'NOT_FOUND', 'Recurring order not found', 404);
      return;
    }

    sendSuccess(res, null, 'Recurring order cancelled');
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to delete recurring order');
    sendError(res, 'INTERNAL_ERROR', 'Failed to cancel recurring order', 500);
  }
}

function calculateNextDate(frequency: string, dayOfWeek?: string, dayOfMonth?: number): Date {
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  if (frequency === 'weekly' && dayOfWeek) {
    const targetDay = days.indexOf(dayOfWeek);
    const currentDay = now.getDay();
    const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
    now.setDate(now.getDate() + daysUntil);
  } else if (frequency === 'biweekly' && dayOfWeek) {
    const targetDay = days.indexOf(dayOfWeek);
    const currentDay = now.getDay();
    const daysUntil = ((targetDay - currentDay + 7) % 7 || 7) + 7;
    now.setDate(now.getDate() + daysUntil);
  } else if (frequency === 'monthly') {
    now.setMonth(now.getMonth() + 1);
    if (dayOfMonth) now.setDate(dayOfMonth);
  }

  return now;
}
