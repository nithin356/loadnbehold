import mongoose, { Schema, Document } from 'mongoose';

export interface ISupportTicket extends Document {
  ticketNumber: string;
  customerId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  category: 'order_issue' | 'payment' | 'delivery' | 'quality' | 'account' | 'general';
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting_for_info' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: mongoose.Types.ObjectId;
  messages: Array<{
    senderId: mongoose.Types.ObjectId;
    senderRole: string;
    message: string;
    attachments?: string[];
    isInternal?: boolean;
    createdAt: Date;
  }>;
  resolution?: string;
  slaDeadline: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  satisfactionRating?: number;
  createdAt: Date;
  updatedAt: Date;
}

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketNumber: { type: String, unique: true, sparse: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    category: {
      type: String,
      enum: ['order_issue', 'payment', 'delivery', 'quality', 'account', 'general'],
      default: 'general',
    },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'waiting_for_info', 'resolved', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    messages: [
      {
        senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        senderRole: { type: String, required: true },
        message: { type: String, required: true },
        attachments: [String],
        isInternal: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    resolution: String,
    slaDeadline: { type: Date, required: true },
    resolvedAt: Date,
    closedAt: Date,
    satisfactionRating: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true }
);

// Auto-generate ticketNumber for legacy tickets
supportTicketSchema.pre('save', function (next) {
  if (!this.ticketNumber) {
    const now = new Date();
    const y = now.getFullYear().toString().slice(-2);
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    this.ticketNumber = `TKT-${y}${m}-${rand}`;
  }
  next();
});

supportTicketSchema.index({ customerId: 1, status: 1 });
supportTicketSchema.index({ status: 1, priority: -1, slaDeadline: 1 });
// ticketNumber already indexed via unique: true

export const SupportTicket = mongoose.model<ISupportTicket>('SupportTicket', supportTicketSchema);
