import mongoose, { Schema, Document } from 'mongoose';

export interface IOffer extends Document {
  title: string;
  description?: string;
  type: string;
  config: {
    firstNOrders?: number;
    firstNCustomers?: number;
    discountType: 'percentage' | 'flat';
    discountValue: number;
    minOrderAmount: number;
    maxDiscount?: number;
    usageLimit?: number;
    perUserLimit: number;
    happyHourStart?: string;
    happyHourEnd?: string;
    happyHourDays?: number[];
    bundleServices?: string[];
  };
  promoCode?: string;
  targeting: 'all' | 'new_users' | 'segment';
  segmentFilter?: Record<string, unknown>;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  redemptions: number;
  createdAt: Date;
  updatedAt: Date;
}

const offerSchema = new Schema<IOffer>(
  {
    title: { type: String, required: true },
    description: String,
    type: {
      type: String,
      enum: [
        'first_n_orders', 'first_n_customers', 'min_order', 'promo_code',
        'referral', 'loyalty', 'flash_sale', 'happy_hour', 'bundle',
        'free_delivery', 'seasonal',
      ],
      required: true,
    },
    config: {
      firstNOrders: Number,
      firstNCustomers: Number,
      discountType: { type: String, enum: ['percentage', 'flat'], required: true },
      discountValue: { type: Number, required: true },
      minOrderAmount: { type: Number, default: 0 },
      maxDiscount: Number,
      usageLimit: Number,
      perUserLimit: { type: Number, default: 1 },
      happyHourStart: String,
      happyHourEnd: String,
      happyHourDays: [Number],
      bundleServices: [String],
    },
    promoCode: { type: String, sparse: true, uppercase: true },
    targeting: { type: String, enum: ['all', 'new_users', 'segment'], default: 'all' },
    segmentFilter: { type: Schema.Types.Mixed },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    redemptions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

offerSchema.index({ promoCode: 1 });
offerSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });

export const Offer = mongoose.model<IOffer>('Offer', offerSchema);
