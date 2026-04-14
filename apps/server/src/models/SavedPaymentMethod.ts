import mongoose, { Schema, Document } from 'mongoose';

export interface ISavedPaymentMethod extends Document {
  userId: mongoose.Types.ObjectId;
  gateway: 'stripe' | 'square' | 'paypal';
  gatewayPaymentMethodId: string;
  type: 'card' | 'bank_account' | 'paypal';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
  label?: string;
  createdAt: Date;
  updatedAt: Date;
}

const savedPaymentMethodSchema = new Schema<ISavedPaymentMethod>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gateway: { type: String, enum: ['stripe', 'square', 'paypal'], required: true },
    gatewayPaymentMethodId: { type: String, required: true },
    type: { type: String, enum: ['card', 'bank_account', 'paypal'], default: 'card' },
    card: {
      brand: String,
      last4: String,
      expMonth: Number,
      expYear: Number,
    },
    isDefault: { type: Boolean, default: false },
    label: String,
  },
  { timestamps: true }
);

savedPaymentMethodSchema.index({ userId: 1, gateway: 1 });
savedPaymentMethodSchema.index({ userId: 1, isDefault: 1 });

export const SavedPaymentMethod = mongoose.model<ISavedPaymentMethod>(
  'SavedPaymentMethod',
  savedPaymentMethodSchema
);
