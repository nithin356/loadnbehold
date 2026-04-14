import { Request, Response } from 'express';
import { User } from '../../models/User';
import { AppConfig } from '../../models/AppConfig';
import { Banner } from '../../models/Banner';
import { findNearbyOutlets } from '../../services/geolocation.service';
import { Service } from '../../models/Service';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user!.userId).select('-fcmTokens');
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }
    sendSuccess(res, user);
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to get profile');
    sendError(res, 'INTERNAL_ERROR', 'Failed to retrieve profile', 500);
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findByIdAndUpdate(
      req.user!.userId,
      { $set: req.body },
      { new: true, runValidators: true }
    ).select('-fcmTokens');

    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }

    sendSuccess(res, user, 'Profile updated');
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to update profile');
    sendError(res, 'INTERNAL_ERROR', 'Failed to update profile', 500);
  }
}

export async function addAddress(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findByIdAndUpdate(
      req.user!.userId,
      { $push: { addresses: req.body } },
      { new: true }
    );

    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }

    const newAddress = user.addresses[user.addresses.length - 1];
    sendSuccess(res, newAddress, 'Address added', 201);
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to add address');
    sendError(res, 'INTERNAL_ERROR', 'Failed to add address', 500);
  }
}

export async function getAddresses(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user!.userId).select('addresses');
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }
    sendSuccess(res, user.addresses);
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to get addresses');
    sendError(res, 'INTERNAL_ERROR', 'Failed to retrieve addresses', 500);
  }
}

export async function deleteAddress(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findByIdAndUpdate(
      req.user!.userId,
      { $pull: { addresses: { _id: req.params.id } } },
      { new: true }
    );

    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }

    sendSuccess(res, null, 'Address removed');
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to delete address');
    sendError(res, 'INTERNAL_ERROR', 'Failed to remove address', 500);
  }
}

export async function updateAddress(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
      return;
    }

    const address = (user.addresses as any).id(req.params.id);
    if (!address) {
      sendError(res, 'ADDRESS_NOT_FOUND', 'Address not found', 404);
      return;
    }

    Object.assign(address, req.body);
    await user.save();

    sendSuccess(res, address, 'Address updated');
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to update address');
    sendError(res, 'INTERNAL_ERROR', 'Failed to update address', 500);
  }
}

export async function getNearbyOutlets(req: Request, res: Response): Promise<void> {
  try {
    const { longitude, latitude, lng, lat } = req.query;

    const lon = parseFloat((longitude || lng) as string);
    const la = parseFloat((latitude || lat) as string);

    if (isNaN(lon) || isNaN(la)) {
      sendError(res, 'MISSING_COORDINATES', 'longitude/lng and latitude/lat are required', 400);
      return;
    }

    const outlets = await findNearbyOutlets(lon, la);

    sendSuccess(res, outlets);
  } catch (err: any) {
    logger.error({ err }, 'Failed to find nearby outlets');
    sendError(res, 'INTERNAL_ERROR', 'Failed to find nearby outlets', 500);
  }
}

export async function getOrderConfig(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const [config, user] = await Promise.all([
      AppConfig.findOne({ key: 'global' }),
      User.findById(userId).select('totalOrders'),
    ]);

    const codConfig = config?.payment.cod;
    const forceCodN = codConfig?.forceCodForFirstNOrders ?? 3;
    const totalOrders = user?.totalOrders ?? 0;

    const deliveryFeeConfig = config?.deliveryFee || { base: 4.99, perMile: 0.5, freeAbove: 50 };

    sendSuccess(res, {
      forceCodForFirstNOrders: forceCodN,
      userTotalOrders: totalOrders,
      codRequired: forceCodN > 0 && totalOrders < forceCodN,
      codEnabled: codConfig?.enabled ?? true,
      maxCodAmount: codConfig?.maxOrderAmount ?? 100,
      taxRate: config?.taxRate ?? 6.0,
      deliveryFee: deliveryFeeConfig.base,
      freeDeliveryAbove: deliveryFeeConfig.freeAbove,
    });
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to get order config');
    sendError(res, 'INTERNAL_ERROR', 'Failed to retrieve order configuration', 500);
  }
}

export async function getServices(_req: Request, res: Response): Promise<void> {
  try {
    const dbServices = await Service.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
    if (dbServices.length > 0) {
      sendSuccess(res, dbServices);
      return;
    }
    const { SERVICES } = await import('@loadnbehold/constants');
    sendSuccess(res, SERVICES.map((s, i) => ({ ...s, sortOrder: i, isActive: true })));
  } catch (err: any) {
    logger.error({ err }, 'Failed to get services');
    sendError(res, 'INTERNAL_ERROR', 'Failed to retrieve services', 500);
  }
}

export async function getRecommendations(req: Request, res: Response): Promise<void> {
  try {
    const { Order } = await import('../../models/Order');
    const userId = req.user!.userId;

    const topServices = await Order.aggregate([
      { $match: { customerId: userId, status: 'delivered' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.service', count: { $sum: 1 }, avgWeight: { $avg: '$items.weight' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const { Offer } = await import('../../models/Offer');
    const now = new Date();
    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).limit(3).lean();

    sendSuccess(res, {
      topServices,
      suggestedOffers: offers,
      message: topServices.length === 0 ? 'Place your first order to get personalized recommendations!' : undefined,
    });
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to get recommendations');
    sendError(res, 'INTERNAL_ERROR', 'Failed to retrieve recommendations', 500);
  }
}

export async function getBanners(_req: Request, res: Response): Promise<void> {
  try {
    const now = new Date();
    const banners = await Banner.find({
      isActive: true,
      activeFrom: { $lte: now },
      activeUntil: { $gte: now },
    }).sort({ order: 1 }).select('title description imageUrl deepLink').lean();

    if (banners.length === 0) {
      sendSuccess(res, [
        { title: 'First Order 20% OFF', description: 'Use code FIRST20', deepLink: '/orders', color: '#2563EB' },
        { title: 'Free Delivery on $50+', description: 'Limited time offer', deepLink: '/orders', color: '#7C3AED' },
        { title: 'Refer & Earn $5', description: 'Share with friends', deepLink: '/referral', color: '#059669' },
      ]);
      return;
    }

    sendSuccess(res, banners);
  } catch (err: any) {
    logger.error({ err }, 'Failed to get banners');
    sendError(res, 'INTERNAL_ERROR', 'Failed to retrieve banners', 500);
  }
}

export async function registerPushToken(req: Request, res: Response): Promise<void> {
  try {
    const { pushToken } = req.body;
    if (!pushToken || typeof pushToken !== 'string') {
      sendError(res, 'INVALID_TOKEN', 'Push token is required', 400);
      return;
    }

    await User.findByIdAndUpdate(req.user!.userId, {
      $addToSet: { fcmTokens: pushToken },
    });

    sendSuccess(res, null, 'Push token registered');
  } catch (err: any) {
    logger.error({ err, userId: req.user?.userId }, 'Failed to register push token');
    sendError(res, 'INTERNAL_ERROR', 'Failed to register push token', 500);
  }
}
