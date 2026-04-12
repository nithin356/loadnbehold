import mongoose from 'mongoose';
import { Outlet } from '../models/Outlet';
import { Driver } from '../models/Driver';
import { MILES_TO_METERS, DRIVER_ASSIGNMENT_WEIGHTS } from '@loadnbehold/constants';
import { logger } from '../utils/logger';

interface NearbyOutlet {
  outlet: InstanceType<typeof Outlet>;
  distance: number;
}

export async function findNearbyOutlets(
  longitude: number,
  latitude: number,
  maxRadiusMiles?: number
): Promise<NearbyOutlet[]> {
  const outlets = await Outlet.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [longitude, latitude] },
        distanceField: 'distanceMeters',
        maxDistance: (maxRadiusMiles || 50) * MILES_TO_METERS,
        spherical: true,
        query: { isActive: true },
      },
    },
    {
      $addFields: {
        distanceMiles: { $divide: ['$distanceMeters', MILES_TO_METERS] },
      },
    },
    {
      $match: {
        $expr: { $lte: ['$distanceMiles', '$serviceRadius'] },
      },
    },
    { $sort: { distanceMeters: 1 } },
  ]);

  return outlets.map((o: Record<string, unknown>) => ({
    outlet: o as unknown as InstanceType<typeof Outlet>,
    distance: o.distanceMiles as number,
  }));
}

export async function findOutletForAddress(
  longitude: number,
  latitude: number
): Promise<InstanceType<typeof Outlet> | null> {
  const results = await findNearbyOutlets(longitude, latitude);
  return results.length > 0 ? results[0].outlet : null;
}

interface RankedDriver {
  driver: InstanceType<typeof Driver>;
  score: number;
  distance: number;
}

export async function findAndRankNearbyDrivers(
  outletId: string,
  pickupLongitude: number,
  pickupLatitude: number,
  searchRadiusMiles: number = 10,
  excludeDriverIds?: string[]
): Promise<RankedDriver[]> {
  const query: Record<string, unknown> = {
    assignedOutlet: outletId,
    status: 'approved',
    isOnline: true,
  };

  if (excludeDriverIds && excludeDriverIds.length > 0) {
    query._id = { $nin: excludeDriverIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  const drivers = await Driver.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [pickupLongitude, pickupLatitude] },
        distanceField: 'distanceMeters',
        maxDistance: searchRadiusMiles * MILES_TO_METERS,
        spherical: true,
        query,
      },
    },
    {
      $addFields: {
        distanceMiles: { $divide: ['$distanceMeters', MILES_TO_METERS] },
      },
    },
  ]);

  if (drivers.length === 0) return [];

  // Normalize and score
  const maxDistance = Math.max(...drivers.map((d: Record<string, unknown>) => d.distanceMiles as number));
  const now = Date.now();

  const ranked = drivers.map((d: Record<string, unknown>) => {
    const distanceMiles = d.distanceMiles as number;
    const metrics = d.metrics as { rating: number };
    const lastOnlineAt = d.lastOnlineAt as Date | undefined;

    const distanceScore = maxDistance > 0 ? 1 - distanceMiles / maxDistance : 1;
    const ratingScore = (metrics?.rating || 0) / 5;
    const idleTimeMs = lastOnlineAt ? now - new Date(lastOnlineAt).getTime() : 0;
    const idleScore = Math.min(idleTimeMs / (30 * 60 * 1000), 1); // Max 30 min idle

    const totalScore =
      distanceScore * DRIVER_ASSIGNMENT_WEIGHTS.distance +
      ratingScore * DRIVER_ASSIGNMENT_WEIGHTS.rating +
      idleScore * DRIVER_ASSIGNMENT_WEIGHTS.idleTime;

    return {
      driver: d as unknown as InstanceType<typeof Driver>,
      score: totalScore,
      distance: distanceMiles,
    };
  });

  ranked.sort((a, b) => b.score - a.score);

  logger.info(`Found ${ranked.length} drivers near pickup, top score: ${ranked[0]?.score.toFixed(3)}`);

  return ranked;
}
