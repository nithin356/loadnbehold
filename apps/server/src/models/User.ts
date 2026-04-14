import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  name: string;
  email?: string;
  role: 'customer' | 'driver' | 'admin';
  adminRole?: 'super_admin' | 'outlet_manager' | 'support_staff' | 'marketing' | 'finance';
  addresses: Array<{
    label: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    location: { type: 'Point'; coordinates: [number, number] };
    instructions?: string;
  }>;
  profileImage?: string;
  referralCode: string;
  referredBy?: string;
  loyaltyPoints: number;
  totalOrders: number;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: {
      orderUpdates: boolean;
      promotions: boolean;
      reminders: boolean;
    };
  };
  familyMembers: Array<{ name: string; phone: string; relationship: string }>;
  gatewayCustomerIds: {
    stripe?: string;
    square?: string;
    paypal?: string;
  };
  subscription?: {
    plan: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    familySlots?: number;
    stripeSubscriptionId?: string;
  };
  walletBalance: number;
  isBlocked: boolean;
  lastLoginAt?: Date;
  fcmTokens: string[];
  createdAt: Date;
  updatedAt: Date;
}

const addressSubSchema = new Schema(
  {
    label: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    instructions: String,
  },
  { _id: true }
);

const userSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String, default: '' },
    email: { type: String, sparse: true },
    role: { type: String, enum: ['customer', 'driver', 'admin'], default: 'customer' },
    adminRole: {
      type: String,
      enum: ['super_admin', 'outlet_manager', 'support_staff', 'marketing', 'finance'],
    },
    addresses: [addressSubSchema],
    profileImage: String,
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: String,
    loyaltyPoints: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      language: { type: String, default: 'en' },
      notifications: {
        orderUpdates: { type: Boolean, default: true },
        promotions: { type: Boolean, default: true },
        reminders: { type: Boolean, default: true },
      },
    },
    familyMembers: [
      {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        relationship: String,
      },
    ],
    gatewayCustomerIds: {
      stripe: String,
      square: String,
      paypal: String,
    },
    subscription: {
      plan: { type: String, default: 'basic' },
      status: { type: String, enum: ['active', 'cancelled', 'expired'], default: 'active' },
      startDate: Date,
      endDate: Date,
      familySlots: { type: Number, default: 0 },
      stripeSubscriptionId: String,
    },
    walletBalance: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false },
    lastLoginAt: Date,
    fcmTokens: [String],
  },
  { timestamps: true }
);

// Geospatial index on addresses
userSchema.index({ 'addresses.location': '2dsphere' });
// phone and referralCode already indexed via unique: true

export const User = mongoose.model<IUser>('User', userSchema);
