import mongoose, { Schema, Document } from 'mongoose';

export interface IAppConfig extends Document {
  key: 'global';
  serviceRadius: { default: number; unit: 'miles' | 'km' };
  minimumOrderAmount: number;
  deliveryFee: { base: number; perMile: number; freeAbove: number };
  taxRate: number;
  pickupSlotDuration: number;
  maxFutureScheduleDays: number;
  expressService: { enabled: boolean; surchargePercent: number };
  recurringOrders: boolean;
  payment: {
    primaryGateway: string;
    fallbackGateway: string;
    autoFailover: boolean;
    cod: {
      enabled: boolean;
      maxOrderAmount: number;
      minCompletedOrdersRequired: number;
      forceCodForFirstNOrders: number;
      surcharge: number;
      driverDepositDeadlineHours: number;
    };
    wallet: { enabled: boolean; maxBalance: number; topUpAmounts: number[] };
  };
  notifications: {
    orderStatusSMS: boolean;
    promotionalPush: boolean;
    driverAlerts: boolean;
    abandonedCartMinutes: number;
    dormantCustomerDays: number;
  };
  referral: {
    referrerReward: number;
    refereeDiscount: number;
    refereeDiscountType: 'percentage' | 'flat';
    maxReferralsPerUser: number;
  };
  driver: {
    acceptanceTimeoutSeconds: number;
    maxConcurrentOrders: number;
    batchPickupEnabled: boolean;
    cashDepositDeadlineHours: number;
    autoSuspendRatingBelow: number;
  };
  maintenance: { isDown: boolean; message: string };
}

const appConfigSchema = new Schema<IAppConfig>(
  {
    key: { type: String, default: 'global', unique: true },
    serviceRadius: { default: { type: Number, default: 25 }, unit: { type: String, default: 'miles' } },
    minimumOrderAmount: { type: Number, default: 15 },
    deliveryFee: {
      base: { type: Number, default: 4.99 },
      perMile: { type: Number, default: 0.5 },
      freeAbove: { type: Number, default: 50 },
    },
    taxRate: { type: Number, default: 6.0 },
    pickupSlotDuration: { type: Number, default: 60 },
    maxFutureScheduleDays: { type: Number, default: 7 },
    expressService: {
      enabled: { type: Boolean, default: true },
      surchargePercent: { type: Number, default: 50 },
    },
    recurringOrders: { type: Boolean, default: true },
    payment: {
      primaryGateway: { type: String, default: 'stripe' },
      fallbackGateway: { type: String, default: 'square' },
      autoFailover: { type: Boolean, default: true },
      cod: {
        enabled: { type: Boolean, default: true },
        maxOrderAmount: { type: Number, default: 100 },
        minCompletedOrdersRequired: { type: Number, default: 3 },
        forceCodForFirstNOrders: { type: Number, default: 3 },
        surcharge: { type: Number, default: 0 },
        driverDepositDeadlineHours: { type: Number, default: 24 },
      },
      wallet: {
        enabled: { type: Boolean, default: true },
        maxBalance: { type: Number, default: 10_000 },
        topUpAmounts: { type: [Number], default: [10, 25, 50, 100] },
      },
    },
    notifications: {
      orderStatusSMS: { type: Boolean, default: true },
      promotionalPush: { type: Boolean, default: true },
      driverAlerts: { type: Boolean, default: true },
      abandonedCartMinutes: { type: Number, default: 30 },
      dormantCustomerDays: { type: Number, default: 14 },
    },
    referral: {
      referrerReward: { type: Number, default: 5 },
      refereeDiscount: { type: Number, default: 10 },
      refereeDiscountType: { type: String, default: 'percentage' },
      maxReferralsPerUser: { type: Number, default: 20 },
    },
    driver: {
      acceptanceTimeoutSeconds: { type: Number, default: 30 },
      maxConcurrentOrders: { type: Number, default: 3 },
      batchPickupEnabled: { type: Boolean, default: true },
      cashDepositDeadlineHours: { type: Number, default: 24 },
      autoSuspendRatingBelow: { type: Number, default: 3.0 },
    },
    maintenance: {
      isDown: { type: Boolean, default: false },
      message: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export const AppConfig = mongoose.model<IAppConfig>('AppConfig', appConfigSchema);
