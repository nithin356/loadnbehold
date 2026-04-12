import mongoose, { Schema, Document } from 'mongoose';

export interface IFaq extends Document {
  category: string;
  question: string;
  answer: string;
  order: number;
  isActive: boolean;
}

const faqSchema = new Schema<IFaq>(
  {
    category: { type: String, required: true, index: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Faq = mongoose.model<IFaq>('Faq', faqSchema);
