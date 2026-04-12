import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  type: 'push' | 'sms' | 'email';
  channel: 'order_status' | 'promotional' | 'system' | 'reminder';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  status: 'sent' | 'delivered' | 'failed' | 'read';
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['push', 'sms', 'email'], required: true },
    channel: { type: String, enum: ['order_status', 'promotional', 'system', 'reminder'], required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['sent', 'delivered', 'failed', 'read'], default: 'sent' },
    sentAt: { type: Date, default: Date.now },
    deliveredAt: Date,
    readAt: Date,
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
