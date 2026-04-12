import { Request, Response } from 'express';
import { SupportTicket } from '../../models/SupportTicket';
import { Faq } from '../../models/Faq';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse';
import { uploadFile } from '../../services/storage.service';

function generateTicketNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `TKT-${y}${m}-${rand}`;
}

export async function createTicket(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const slaHours = req.body.priority === 'urgent' ? 4 : req.body.priority === 'high' ? 8 : 24;
  const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

  const ticket = await SupportTicket.create({
    ticketNumber: generateTicketNumber(),
    customerId: userId,
    category: req.body.category || 'general',
    ...req.body,
    slaDeadline,
    messages: [
      {
        senderId: userId,
        senderRole: req.user!.role,
        message: req.body.description,
        createdAt: new Date(),
      },
    ],
  });

  sendSuccess(res, ticket, 'Support ticket created', 201);
}

export async function getTickets(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const filter = req.user!.role === 'admin'
    ? {}
    : { customerId: userId };

  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'name phone')
      .lean(),
    SupportTicket.countDocuments(filter),
  ]);

  sendPaginated(res, tickets, total, page, limit);
}

export async function getTicketById(req: Request, res: Response): Promise<void> {
  const ticket = await SupportTicket.findById(req.params.id)
    .populate('customerId', 'name phone')
    .populate('orderId')
    .lean();

  if (!ticket) {
    sendError(res, 'NOT_FOUND', 'Ticket not found', 404);
    return;
  }

  // Only allow access to own tickets (unless admin)
  // After .populate().lean(), customerId is an object { _id, name, phone }, not an ObjectId
  const ownerId = (ticket.customerId as any)?._id?.toString() || ticket.customerId?.toString();
  if (req.user!.role !== 'admin' && ownerId !== req.user!.userId) {
    sendError(res, 'FORBIDDEN', 'Access denied', 403);
    return;
  }

  sendSuccess(res, ticket);
}

export async function replyToTicket(req: Request, res: Response): Promise<void> {
  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    sendError(res, 'NOT_FOUND', 'Ticket not found', 404);
    return;
  }

  // Ownership check — only ticket owner or admin can reply
  if (req.user!.role !== 'admin' && ticket.customerId.toString() !== req.user!.userId) {
    sendError(res, 'FORBIDDEN', 'Access denied', 403);
    return;
  }

  ticket.messages.push({
    senderId: req.user!.userId as any,
    senderRole: req.user!.role,
    message: req.body.message,
    attachments: req.body.attachments,
    createdAt: new Date(),
  });

  if (req.user!.role === 'admin' && ticket.status === 'open') {
    ticket.status = 'in_progress';
  }

  // When customer replies to a waiting_for_info ticket, move back to in_progress
  if (req.user!.role === 'customer' && ticket.status === 'waiting_for_info') {
    ticket.status = 'in_progress';
  }

  await ticket.save();
  sendSuccess(res, ticket, 'Reply sent');
}

const DEFAULT_FAQS = [
  { category: 'orders', question: 'How do I place an order?', answer: 'Open the app, select your services, choose pickup/delivery times, and confirm your order.', order: 1 },
  { category: 'orders', question: 'Can I cancel my order?', answer: 'You can cancel before pickup. A fee may apply if the driver is already en route.', order: 2 },
  { category: 'orders', question: 'How long does processing take?', answer: 'Standard wash & fold takes 24–48 hours. Dry cleaning may take 48–72 hours.', order: 3 },
  { category: 'payments', question: 'What payment methods are accepted?', answer: 'We accept credit/debit cards (Stripe), PayPal, wallet balance, and Cash on Delivery for eligible orders.', order: 4 },
  { category: 'payments', question: 'How do refunds work?', answer: 'Refunds are processed to your original payment method or wallet within 5–7 business days.', order: 5 },
  { category: 'payments', question: 'When can I use Cash on Delivery?', answer: 'COD is available after completing 3 orders, for orders under $100.', order: 6 },
  { category: 'general', question: 'What is LoadNBehold?', answer: 'LoadNBehold is an on-demand laundry pickup and delivery service.', order: 7 },
  { category: 'general', question: 'What areas do you serve?', answer: 'We currently serve within a 25-mile radius of our outlet locations.', order: 8 },
  { category: 'general', question: 'How do I contact support?', answer: 'Create a support ticket in the app or email support@loadnbehold.com.', order: 9 },
];

export async function getFaq(req: Request, res: Response): Promise<void> {
  const category = req.query.category as string;

  // Fetch from DB, seed defaults if empty
  let faqs = await Faq.find({ isActive: true }).sort({ order: 1 }).lean();
  if (faqs.length === 0) {
    await Faq.insertMany(DEFAULT_FAQS);
    faqs = await Faq.find({ isActive: true }).sort({ order: 1 }).lean();
  }

  const filtered = category ? faqs.filter((f) => f.category === category) : faqs;
  sendSuccess(res, filtered);
}

export async function uploadAttachment(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    sendError(res, 'NO_FILE', 'No file uploaded', 400);
    return;
  }

  try {
    const url = await uploadFile(req.file, 'support-attachments');
    sendSuccess(res, { url, filename: req.file.originalname, size: req.file.size }, 'File uploaded');
  } catch (err: any) {
    sendError(res, 'UPLOAD_FAILED', err.message || 'File upload failed', 500);
  }
}
