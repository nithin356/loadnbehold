import mongoose from 'mongoose';

const recurringOrderSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  frequency: { type: String, enum: ['weekly', 'biweekly', 'monthly'], required: true },
  dayOfWeek: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
  dayOfMonth: Number,
  timeSlot: { from: String, to: String },
  services: [{ service: String, quantity: Number, weight: Number, specialInstructions: String }],
  pickupAddress: { type: mongoose.Schema.Types.Mixed },
  deliveryAddress: { type: mongoose.Schema.Types.Mixed },
  paymentMethod: { type: String, default: 'online' },
  isActive: { type: Boolean, default: true },
  nextScheduledDate: Date,
  lastOrderDate: Date,
}, { timestamps: true });

export const RecurringOrder = mongoose.models.RecurringOrder || mongoose.model('RecurringOrder', recurringOrderSchema);
