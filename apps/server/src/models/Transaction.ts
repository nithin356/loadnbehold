import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  orderId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  type: 'charge' | 'refund' | 'payout' | 'credit' | 'earning' | 'tip' | 'cod_collection' | 'cod_deposit';
  amount: number;
  gateway?: string;
  gatewayTransactionId?: string;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  createdAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    customerId: { type: Schema.Types.ObjectId, ref: 'User' },
    driverId: { type: Schema.Types.ObjectId, ref: 'Driver' },
    type: {
      type: String,
      enum: ['charge', 'refund', 'payout', 'credit', 'earning', 'tip', 'cod_collection', 'cod_deposit'],
      required: true,
    },
    amount: { type: Number, required: true },
    gateway: String,
    gatewayTransactionId: String,
    status: { type: String, enum: ['completed', 'pending', 'failed'], default: 'pending' },
    description: { type: String, required: true },
  },
  { timestamps: true }
);

transactionSchema.index({ customerId: 1, createdAt: -1 });
transactionSchema.index({ driverId: 1, createdAt: -1 });
transactionSchema.index({ orderId: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
