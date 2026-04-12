import mongoose, { Schema, Document } from 'mongoose';

export interface IService extends Document {
  key: string;
  label: string;
  icon: string;
  unit: 'lbs' | 'items';
  basePrice: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    key: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    icon: { type: String, required: true },
    unit: { type: String, enum: ['lbs', 'items'], required: true },
    basePrice: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Service = mongoose.model<IService>('Service', serviceSchema);
