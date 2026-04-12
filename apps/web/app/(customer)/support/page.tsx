'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronDown, HelpCircle, Send, MessageSquare, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface FaqItem {
  category: string;
  question: string;
  answer: string;
}

interface Ticket {
  _id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}

const ticketStatusColors: Record<string, string> = {
  open: 'bg-warning-light text-warning',
  'in-progress': 'bg-brand-light text-brand',
  resolved: 'bg-success-light text-success',
  closed: 'bg-surface-secondary text-text-secondary',
};

export default function SupportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuthStore((s) => s.accessToken);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill from order page "Report Issue" button
  useEffect(() => {
    const orderNumber = searchParams.get('orderNumber');
    if (orderNumber) {
      setSubject(`Issue with order ${orderNumber}`);
      setShowTicketForm(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.getFaq(token).then((res: any) => setFaqs(res.data || [])).catch(() => { toast.error('Failed to load FAQs'); }),
      api.getTickets(token).then((res: any) => setTickets(res.data || [])).catch(() => { toast.error('Failed to load tickets'); }),
    ]).finally(() => setLoading(false));
  }, [token]);

  const handleSubmitTicket = async () => {
    if (!token || !subject.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const res: any = await api.createTicket(token, { subject, description, priority });
      toast.success('Support ticket created');
      setTickets((prev) => [res.data, ...prev]);
      setSubject('');
      setDescription('');
      setShowTicketForm(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const groupedFaqs = faqs.reduce<Record<string, FaqItem[]>>((acc, faq) => {
    (acc[faq.category] = acc[faq.category] || []).push(faq);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    orders: 'Orders',
    payments: 'Payments',
    delivery: 'Delivery',
    general: 'General',
  };

  if (loading) {
    return (
      <div className="py-6 max-w-4xl mx-auto space-y-4">
        <div className="skeleton h-8 w-32 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-64 w-full rounded-2xl" />
          <div className="skeleton h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-text-primary">Help & Support</h1>
          <p className="text-xs text-text-secondary">Find answers or create a support ticket</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* FAQ Section (Left Column) */}
      <section>
        <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">Frequently Asked Questions</h3>
        {Object.entries(groupedFaqs).map(([category, items]) => (
          <div key={category} className="mb-3">
            <p className="text-sm font-semibold text-text-primary mb-1.5 px-1">{categoryLabels[category] || category}</p>
            <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
              {items.map((faq, i) => {
                const globalIndex = faqs.indexOf(faq);
                const isExpanded = expandedFaq === globalIndex;
                return (
                  <button
                    key={i}
                    onClick={() => setExpandedFaq(isExpanded ? null : globalIndex)}
                    className="w-full text-left p-4 hover:bg-surface-secondary transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-text-primary">{faq.question}</span>
                      <ChevronDown className={cn('w-4 h-4 text-text-tertiary flex-shrink-0 transition-transform', isExpanded && 'rotate-180')} />
                    </div>
                    {isExpanded && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-sm text-text-secondary mt-2 leading-relaxed"
                      >
                        {faq.answer}
                      </motion.p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {faqs.length === 0 && (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center">
            <HelpCircle className="w-10 h-10 text-text-tertiary mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-sm text-text-secondary">FAQ not available right now</p>
          </div>
        )}
      </section>

      {/* Right Column — Ticket Form + Existing Tickets */}
      <div className="space-y-6">
      {/* Create Ticket */}
      <section>
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Need More Help?</h3>
        </div>
        {!showTicketForm ? (
          <button
            onClick={() => setShowTicketForm(true)}
            className="w-full bg-surface border border-border rounded-2xl p-4 flex items-center gap-3 hover:shadow-md hover:border-border-hover transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center">
              <Send className="w-4 h-4 text-brand" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-text-primary">Create a Support Ticket</p>
              <p className="text-[11px] text-text-secondary">We typically respond within 24 hours</p>
            </div>
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface border border-border rounded-2xl p-5"
          >
            <h4 className="font-bold text-sm text-text-primary mb-4">New Support Ticket</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1 block">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                  className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1 block">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  rows={4}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1 block">Priority</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={cn(
                        'flex-1 h-9 rounded-xl text-xs font-semibold capitalize transition-all border',
                        priority === p
                          ? 'border-brand bg-brand-light text-brand'
                          : 'border-border text-text-secondary hover:border-border-hover'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowTicketForm(false)}
                  className="flex-1 h-10 border border-border rounded-xl text-sm font-semibold text-text-secondary hover:bg-surface-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitTicket}
                  disabled={submitting || !subject.trim() || !description.trim()}
                  className="flex-1 h-10 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Submit
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </section>

      {/* Existing Tickets */}
      {tickets.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">Your Tickets</h3>
          <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {tickets.map((ticket) => (
              <div key={ticket._id} onClick={() => router.push(`/support/${ticket._id}`)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-surface-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface-secondary flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-text-tertiary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{ticket.subject}</p>
                    <p className="text-[11px] text-text-tertiary flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={cn('inline-flex items-center h-6 px-2.5 rounded-full text-[10px] font-bold uppercase tracking-wide', ticketStatusColors[ticket.status] || ticketStatusColors.open)}>
                  {ticket.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
      </div>
      </div>
    </div>
  );
}
