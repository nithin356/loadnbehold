import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  orderNumber: string;
  customerId: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  outletId: mongoose.Types.ObjectId;
  rejectedDrivers?: mongoose.Types.ObjectId[];
  status: string;
  items: Array<{
    service: string;
    quantity: number;
    weight?: number;
    unit: 'lbs' | 'kg' | 'items';
    specialInstructions?: string;
    price: number;
  }>;
  pickupAddress: {
    label: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    location: { type: 'Point'; coordinates: [number, number] };
    instructions?: string;
  };
  deliveryAddress: {
    label: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    location: { type: 'Point'; coordinates: [number, number] };
    instructions?: string;
  };
  schedule: {
    pickupSlot: { date: string; from: string; to: string };
    estimatedDelivery?: Date;
  };
  pricing: {
    subtotal: number;
    deliveryFee: number;
    tax: number;
    discount: number;
    surcharge: number;
    tip: number;
    total: number;
  };
  paymentMethod: 'online' | 'cod' | 'wallet' | 'split';
  payment: {
    gateway: string;
    transactionId?: string;
    gatewayTransactionId?: string;
    status: string;
    codAmount: number;
    walletAmount: number;
    onlineAmount: number;
    codCollectedByDriver: boolean;
    codDepositedAt?: Date;
  };
  refund?: {
    method: 'wallet' | 'original_payment';
    amount: number;
    status: 'pending' | 'processed' | 'failed';
    processedAt?: Date;
  };
  dispute?: {
    ticketId: mongoose.Types.ObjectId;
    reason: string;
    status: string;
  };
  offerId?: mongoose.Types.ObjectId;
  promoCode?: string;
  timeline: Array<{
    status: string;
    timestamp: Date;
    note?: string;
    driverId?: mongoose.Types.ObjectId;
    actor?: string;
  }>;
  rating?: { service: number; driver: number; review?: string };
  proofImages: {
    pickup?: string;
    delivery?: string;
    customerPhotos?: string[];
  };
  isRecurring: boolean;
  recurringSchedule?: {
    frequency: 'weekly' | 'biweekly' | 'monthly';
    dayOfWeek: number;
    time: string;
  };
  deliveryOtp?: string;
  specialInstructions?: string;
  deliveryInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

const addressSubSchema = {
  label: String,
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
};

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'Driver', index: true },
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    rejectedDrivers: [{ type: Schema.Types.ObjectId, ref: 'Driver' }],
    status: {
      type: String,
      enum: [
        'placed', 'driver_assigned', 'pickup_enroute', 'picked_up',
        'at_laundry', 'processing', 'quality_check',
        'out_for_delivery', 'delivered', 'cancelled',
      ],
      default: 'placed',
      index: true,
    },
    items: [
      {
        service: { type: String, required: true },
        quantity: { type: Number, required: true },
        weight: Number,
        unit: { type: String, enum: ['lbs', 'kg', 'items'], default: 'lbs' },
        specialInstructions: String,
        price: { type: Number, required: true },
      },
    ],
    pickupAddress: addressSubSchema,
    deliveryAddress: addressSubSchema,
    schedule: {
      pickupSlot: {
        date: { type: String, required: true },
        from: { type: String, required: true },
        to: { type: String, required: true },
      },
      estimatedDelivery: Date,
    },
    pricing: {
      subtotal: { type: Number, required: true },
      deliveryFee: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      surcharge: { type: Number, default: 0 },
      tip: { type: Number, default: 0 },
      total: { type: Number, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ['online', 'cod', 'wallet', 'split'],
      required: true,
    },
    payment: {
      gateway: { type: String, default: 'stripe' },
      transactionId: String,
      gatewayTransactionId: String,
      status: {
        type: String,
        enum: ['pending', 'paid', 'completed', 'refunded', 'failed', 'cod_pending', 'cod_collected', 'cod_deposited'],
        default: 'pending',
      },
      codAmount: { type: Number, default: 0 },
      walletAmount: { type: Number, default: 0 },
      onlineAmount: { type: Number, default: 0 },
      codCollectedByDriver: { type: Boolean, default: false },
      codDepositedAt: Date,
    },
    refund: {
      method: { type: String, enum: ['wallet', 'original_payment'] },
      amount: Number,
      status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },
      processedAt: Date,
    },
    dispute: {
      ticketId: { type: Schema.Types.ObjectId, ref: 'SupportTicket' },
      reason: String,
      status: { type: String, enum: ['open', 'resolved', 'rejected'], default: 'open' },
    },
    offerId: { type: Schema.Types.ObjectId, ref: 'Offer' },
    promoCode: String,
    timeline: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: String,
        driverId: { type: Schema.Types.ObjectId, ref: 'Driver' },
        actor: String,
      },
    ],
    rating: {
      service: { type: Number, min: 1, max: 5 },
      driver: { type: Number, min: 1, max: 5 },
      review: String,
    },
    proofImages: {
      pickup: String,
      delivery: String,
      customerPhotos: [String],
    },
    isRecurring: { type: Boolean, default: false },
    recurringSchedule: {
      frequency: { type: String, enum: ['weekly', 'biweekly', 'monthly'] },
      dayOfWeek: Number,
      time: String,
    },
    deliveryOtp: String,
    specialInstructions: String,
    deliveryInstructions: String,
  },
  { timestamps: true }
);

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ driverId: 1, status: 1 });
orderSchema.index({ outletId: 1, status: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ 'schedule.pickupSlot.date': 1, outletId: 1 });

export const Order = mongoose.model<IOrder>('Order', orderSchema);
