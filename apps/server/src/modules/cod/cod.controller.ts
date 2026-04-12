import { Request, Response } from 'express';
import { Order } from '../../models/Order';
import { Driver } from '../../models/Driver';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';

export async function getCodDashboard(_req: Request, res: Response): Promise<void> {
  try {
    // Aggregate COD stats from orders
    const stats = await Order.aggregate([
      {
        $match: {
          paymentMethod: 'cod',
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$payment.codAmount' },
          collected: {
            $sum: {
              $cond: ['$payment.codCollectedByDriver', '$payment.codAmount', 0],
            },
          },
          pending: {
            $sum: {
              $cond: [
                { $eq: ['$payment.codCollectedByDriver', false] },
                '$payment.codAmount',
                0,
              ],
            },
          },
          deposited: {
            $sum: {
              $cond: [
                { $ne: ['$payment.codDepositedAt', null] },
                '$payment.codAmount',
                0,
              ],
            },
          },
        },
      },
    ]);

    // Get driver-wise cash balance
    const driverBalances = await Driver.aggregate([
      {
        $match: {
          cashBalance: { $gt: 0 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          driverId: '$_id',
          driverName: '$user.name',
          driverPhone: '$user.phone',
          cashBalance: 1,
          cashCollected: 1,
          cashDeposited: 1,
          lastCashDepositAt: 1,
        },
      },
      {
        $sort: { cashBalance: -1 },
      },
    ]);

    const result = {
      overview: stats[0] || {
        totalOrders: 0,
        totalAmount: 0,
        collected: 0,
        pending: 0,
        deposited: 0,
      },
      driverBalances,
      undeposited: stats[0] ? stats[0].collected - stats[0].deposited : 0,
    };

    sendSuccess(res, result);
  } catch (error) {
    logger.error({ error }, 'Error fetching COD dashboard');
    sendError(res, 'FETCH_ERROR', 'Failed to fetch COD dashboard', 500);
  }
}

export async function getCodLedger(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate, driverId } = req.query;

    const matchConditions: any = {
      paymentMethod: 'cod',
    };

    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) matchConditions.createdAt.$gte = new Date(startDate as string);
      if (endDate) matchConditions.createdAt.$lte = new Date(endDate as string);
    }

    if (driverId) {
      matchConditions.driverId = driverId;
    }

    const ledger = await Order.find(matchConditions)
      .populate('customerId', 'name phone')
      .populate('driverId', 'userId')
      .populate({
        path: 'driverId',
        populate: {
          path: 'userId',
          select: 'name phone',
        },
      })
      .select(
        'orderNumber customerId driverId payment.codAmount payment.codCollectedByDriver payment.codDepositedAt createdAt status'
      )
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    sendSuccess(res, ledger);
  } catch (error) {
    logger.error({ error }, 'Error fetching COD ledger');
    sendError(res, 'FETCH_ERROR', 'Failed to fetch COD ledger', 500);
  }
}

export async function reconcileDriverCash(req: Request, res: Response): Promise<void> {
  try {
    const { driverId } = req.params;
    const { amount, notes } = req.body;

    const driver = await Driver.findById(driverId);
    if (!driver) {
      sendError(res, 'DRIVER_NOT_FOUND', 'Driver not found', 404);
      return;
    }

    if (amount && amount !== driver.cashBalance) {
      sendError(
        res,
        'AMOUNT_MISMATCH',
        `Amount mismatch. Driver balance is $${driver.cashBalance}, but $${amount} was provided`,
        400
      );
      return;
    }

    const reconciliationAmount = driver.cashBalance;

    // Update driver cash balances
    driver.cashDeposited += reconciliationAmount;
    driver.cashBalance = 0;
    driver.lastCashDepositAt = new Date();
    await driver.save();

    // Mark all COD orders for this driver as deposited
    await Order.updateMany(
      {
        driverId: driver._id,
        paymentMethod: 'cod',
        'payment.codCollectedByDriver': true,
        'payment.codDepositedAt': null,
      },
      {
        $set: {
          'payment.codDepositedAt': new Date(),
        },
      }
    );

    logger.info(
      { driverId, reconciliationAmount, notes },
      'Driver cash reconciliation completed'
    );

    sendSuccess(
      res,
      {
        driverId,
        reconciledAmount: reconciliationAmount,
        newBalance: 0,
        depositedAt: driver.lastCashDepositAt,
      },
      `Successfully reconciled $${reconciliationAmount.toFixed(2)}`
    );
  } catch (error) {
    logger.error({ error }, 'Error reconciling driver cash');
    sendError(res, 'RECONCILE_ERROR', 'Failed to reconcile driver cash', 500);
  }
}

export async function markCodCollected(req: Request, res: Response): Promise<void> {
  try {
    const { orderId } = req.params;
    const driverId = req.user!.userId;

    const order = await Order.findById(orderId);
    if (!order) {
      sendError(res, 'ORDER_NOT_FOUND', 'Order not found', 404);
      return;
    }

    if (order.paymentMethod !== 'cod') {
      sendError(res, 'NOT_COD_ORDER', 'This is not a COD order', 400);
      return;
    }

    if (order.payment.codCollectedByDriver) {
      sendError(res, 'ALREADY_COLLECTED', 'COD already marked as collected', 400);
      return;
    }

    // Find driver by userId
    const driver = await Driver.findOne({ userId: driverId });
    if (!driver) {
      sendError(res, 'DRIVER_NOT_FOUND', 'Driver profile not found', 404);
      return;
    }

    if (order.driverId?.toString() !== driver._id.toString()) {
      sendError(res, 'UNAUTHORIZED', 'You are not assigned to this order', 403);
      return;
    }

    // Update order
    order.payment.codCollectedByDriver = true;
    order.payment.status = 'cod_collected';
    await order.save();

    // Update driver cash balance
    driver.cashBalance += order.payment.codAmount;
    driver.cashCollected += order.payment.codAmount;
    await driver.save();

    sendSuccess(
      res,
      {
        orderId,
        codAmount: order.payment.codAmount,
        driverCashBalance: driver.cashBalance,
      },
      `COD of $${order.payment.codAmount.toFixed(2)} collected`
    );
  } catch (error) {
    logger.error({ error }, 'Error marking COD as collected');
    sendError(res, 'COLLECT_ERROR', 'Failed to mark COD as collected', 500);
  }
}
