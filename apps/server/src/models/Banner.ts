import mongoose, { Schema, Document } from 'mongoose';

export interface IBanner extends Document {
  imageUrl: string;
  title: string;
  description?: string;
  deepLink: string;
  order: number;
  activeFrom: Date;
  activeUntil: Date;
  isActive: boolean;
  targetAudience: 'all' | 'new' | 'returning';
  impressions: number;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    imageUrl: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    deepLink: { type: String, required: true },
    order: { type: Number, default: 0 },
    activeFrom: { type: Date, required: true },
    activeUntil: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    targetAudience: { type: String, enum: ['all', 'new', 'returning'], default: 'all' },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

bannerSchema.index({ isActive: 1, activeFrom: 1, activeUntil: 1, order: 1 });

export const Banner = mongoose.model<IBanner>('Banner', bannerSchema);
