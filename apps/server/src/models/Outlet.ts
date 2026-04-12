import mongoose, { Schema, Document } from 'mongoose';

export interface IOutlet extends Document {
  name: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    location: { type: 'Point'; coordinates: [number, number] };
  };
  serviceRadius: number;
  serviceRadiusUnit: 'miles' | 'km';
  operatingHours: {
    [day: string]: { open: string; close: string };
  };
  services: string[];
  pricingOverrides: Record<string, number>;
  capacityPerDay: number;
  capacityPerSlot: number;
  blackoutDates: Date[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const outletSchema = new Schema<IOutlet>(
  {
    name: { type: String, required: true },
    address: {
      line1: { type: String, required: true },
      line2: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      zip: { type: String, required: true },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true },
      },
    },
    serviceRadius: { type: Number, default: 25 },
    serviceRadiusUnit: { type: String, enum: ['miles', 'km'], default: 'miles' },
    operatingHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },
    services: [{ type: String, enum: ['wash_fold', 'dry_clean', 'iron', 'stain_removal', 'bedding'] }],
    pricingOverrides: { type: Map, of: Number, default: {} },
    capacityPerDay: { type: Number, default: 100 },
    capacityPerSlot: { type: Number, default: 10 },
    blackoutDates: [Date],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

outletSchema.index({ 'address.location': '2dsphere' });

export const Outlet = mongoose.model<IOutlet>('Outlet', outletSchema);
