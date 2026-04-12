import mongoose, { Schema, Document } from 'mongoose';

export interface IWalletTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'topup' | 'payment' | 'refund' | 'credit' | 'debit' | 'referral';
  amount: number;
  balance: number;
  description: string;
  orderId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const walletTransactionSchema = new Schema<IWalletTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['topup', 'payment', 'refund', 'credit', 'debit', 'referral'],
      required: true,
    },
    amount: { type: Number, required: true },
    balance: { type: Number, required: true },
    description: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ userId: 1, createdAt: -1 });

export const WalletTransaction = mongoose.model<IWalletTransaction>(
  'WalletTransaction',
  walletTransactionSchema
);
