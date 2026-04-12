import mongoose, { Schema, Document } from 'mongoose';

export interface IDriver extends Document {
  userId: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'suspended' | 'rejected';
  isOnline: boolean;
  currentLocation: { type: 'Point'; coordinates: [number, number] };
  vehicle: {
    type: 'car' | 'bike' | 'van';
    make: string;
    model: string;
    plate: string;
    color: string;
  };
  documents: {
    license: { url: string; verified: boolean; expiry: Date; uploadedAt: Date };
    insurance: { url: string; verified: boolean; expiry: Date; uploadedAt: Date };
    backgroundCheck: { status: 'pending' | 'cleared' | 'failed'; date?: Date };
  };
  metrics: {
    totalDeliveries: number;
    rating: number;
    ratingCount: number;
    onTimePercent: number;
    acceptanceRate: number;
    avgDeliveryTime: number;
  };
  assignedOutlet: mongoose.Types.ObjectId;
  cashBalance: number;
  cashCollected: number;
  cashDeposited: number;
  lastCashDepositAt?: Date;
  bankInfo?: {
    routingNumber: string;
    accountNumber: string;
    accountHolder: string;
  };
  activeOrders: mongoose.Types.ObjectId[];
  lastOnlineAt?: Date;
  suspendedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const driverSchema = new Schema<IDriver>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'suspended', 'rejected'],
      default: 'pending',
    },
    isOnline: { type: Boolean, default: false },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    vehicle: {
      type: { type: String, enum: ['car', 'bike', 'van'], required: true },
      make: { type: String, required: true },
      model: { type: String, required: true },
      plate: { type: String, required: true },
      color: { type: String, required: true },
    },
    documents: {
      license: {
        url: String,
        verified: { type: Boolean, default: false },
        expiry: Date,
        uploadedAt: Date,
      },
      insurance: {
        url: String,
        verified: { type: Boolean, default: false },
        expiry: Date,
        uploadedAt: Date,
      },
      backgroundCheck: {
        status: { type: String, enum: ['pending', 'cleared', 'failed'], default: 'pending' },
        date: Date,
      },
    },
    metrics: {
      totalDeliveries: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
      ratingCount: { type: Number, default: 0 },
      onTimePercent: { type: Number, default: 100 },
      acceptanceRate: { type: Number, default: 100 },
      avgDeliveryTime: { type: Number, default: 0 },
    },
    assignedOutlet: { type: Schema.Types.ObjectId, ref: 'Outlet' },
    cashBalance: { type: Number, default: 0 },
    cashCollected: { type: Number, default: 0 },
    cashDeposited: { type: Number, default: 0 },
    lastCashDepositAt: Date,
    bankInfo: {
      routingNumber: String,
      accountNumber: String,
      accountHolder: String,
    },
    activeOrders: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
    lastOnlineAt: Date,
    suspendedReason: String,
  },
  { timestamps: true }
);

driverSchema.index({ currentLocation: '2dsphere' });
driverSchema.index({ userId: 1 });
driverSchema.index({ assignedOutlet: 1, isOnline: 1, status: 1 });

export const Driver = mongoose.model<IDriver>('Driver', driverSchema);
