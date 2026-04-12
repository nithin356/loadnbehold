'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Package, MapPin, Calendar, CreditCard, Clock, Star, Check, Circle, FileText, AlertTriangle, X, Wallet, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_VARIANT, CANCELLATION_POLICY } from '@loadnbehold/constants';
import { cn } from '@/lib/utils';

const badgeColors: Record<string, string> = {
  info: 'bg-brand-light text-brand',
  warning: 'bg-warning-light text-warning',
  success: 'bg-success-light text-success',
  error: 'bg-error-light text-error',
  neutral: 'bg-surface-secondary text-text-secondary',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  // Cancel dialog state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'wallet' | 'original_payment'>('wallet');

  // Rating state
  const [showRating, setShowRating] = useState(false);
  const [serviceRating, setServiceRating] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    api.getOrder(token, id)
      .then((res: any) => setOrder(res.data))
      .catch(() => toast.error('Failed to load order'))
      .finally(() => setLoading(false));
  }, [token, id]);

  const handleCancel = async () => {
    if (!token || !order) return;
    setCancelling(true);
    try {
      await api.cancelOrder(token, order._id, {
        reason: cancelReason || undefined,
        refundMethod: order.paymentMethod !== 'cod' ? refundMethod : undefined,
      });
      const policy = CANCELLATION_POLICY[order.status];
      const refundAmt = policy ? parseFloat(((order.pricing.total * policy.refundPercent) / 100 - policy.fee).toFixed(2)) : 0;
      if (order.paymentMethod !== 'cod' && refundAmt > 0) {
        const isWalletRefund = order.paymentMethod === 'wallet' || refundMethod === 'wallet';
        toast.success(isWalletRefund
          ? `Order cancelled. $${refundAmt.toFixed(2)} refunded instantly to your wallet.`
          : `Order cancelled. $${refundAmt.toFixed(2)} refund is being processed to your original payment method.`);
      } else {
        toast.success('Order cancelled successfully');
      }
      setOrder({ ...order, status: 'cancelled' });
      setShowCancelDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Cannot cancel this order');
    } finally {
      setCancelling(false);
    }
  };

  const handleRate = async () => {
    if (!token || !order || serviceRating === 0 || driverRating === 0) return;
    setSubmittingRating(true);
    try {
      await api.rateOrder(token, order._id, {
        service: serviceRating,
        driver: driverRating,
        review: reviewText || undefined,
      });
      toast.success('Thank you for your rating!');
      setOrder({ ...order, rating: { service: serviceRating, driver: driverRating, review: reviewText } });
      setShowRating(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6 space-y-4">
        <div className="skeleton h-8 w-32 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="skeleton h-48 w-full rounded-2xl" />
            <div className="skeleton h-40 w-full rounded-2xl" />
          </div>
          <div className="space-y-4">
            <div className="skeleton h-48 w-full rounded-2xl" />
            <div className="skeleton h-32 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-6 text-center">
        <div className="bg-surface border border-border rounded-2xl p-10 max-w-md mx-auto">
          <Package className="w-12 h-12 text-text-tertiary mx-auto mb-4" strokeWidth={1.5} />
          <h3 className="text-lg font-bold text-text-primary mb-1">Order not found</h3>
          <p className="text-sm text-text-secondary mb-5">This order doesn't exist or you don't have access.</p>
          <button onClick={() => router.push('/orders')} className="px-5 py-2.5 bg-brand text-white font-bold rounded-xl hover:bg-brand-hover transition-colors">
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const variant = ORDER_STATUS_BADGE_VARIANT[order.status] || 'neutral';
  const canCancel = CANCELLATION_POLICY[order.status]?.allowed && order.status !== 'cancelled';
  const isTerminal = ['delivered', 'cancelled'].includes(order.status);

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/orders')} className="p-2 rounded-full hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-text-primary">{order.orderNumber}</h1>
          <p className="text-xs text-text-tertiary">{new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <span className={cn('inline-flex items-center h-6 px-2.5 rounded-full text-[10px] font-bold uppercase tracking-wide', badgeColors[variant])}>
          {ORDER_STATUS_LABELS[order.status] || order.status}
        </span>
      </div>

      {/* Two-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status Card */}
          {!isTerminal && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-5 text-white relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold">{ORDER_STATUS_LABELS[order.status] || order.status}</p>
                  <p className="text-sm text-white/70">Your order is being processed</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Items */}
          <section>
            <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">Items</h3>
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              {order.items?.map((item: any, i: number) => (
                <div key={i} className={cn('flex items-center justify-between p-4', i < order.items.length - 1 && 'border-b border-border')}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center">
                      <Package className="w-4 h-4 text-brand" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary capitalize">{item.service?.replace(/_/g, ' ')}</p>
                      <p className="text-[11px] text-text-tertiary">Qty: {item.quantity}{item.weight ? ` · ${item.weight} ${item.unit}` : ''}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-text-primary">${(item.price || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Timeline */}
          {order.timeline?.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">Timeline</h3>
              <div className="bg-surface border border-border rounded-2xl p-4">
                <div className="space-y-0">
                  {order.timeline.map((entry: any, i: number) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        {i < order.timeline.length - 1 && (
                          <div className="w-0.5 h-6 my-1 rounded-full bg-success" />
                        )}
                      </div>
                      <div className="pb-1 flex-1">
                        <p className="text-sm font-semibold text-text-primary">{ORDER_STATUS_LABELS[entry.status] || entry.status}</p>
                        <p className="text-[11px] text-text-secondary">{new Date(entry.timestamp).toLocaleString()}</p>
                        {entry.note && <p className="text-[11px] text-text-tertiary mt-0.5">{entry.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!isTerminal && (
              <button
                onClick={() => router.push('/track')}
                className="h-12 bg-brand text-white font-semibold rounded-xl shadow-lg shadow-brand/20 hover:bg-brand-hover transition-all flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4" /> Track Order
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => setShowCancelDialog(true)}
                className="h-12 border border-error/30 text-error font-semibold rounded-xl hover:bg-error-light transition-all flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" /> Cancel Order
              </button>
            )}
            {order.status === 'delivered' && !order.rating && (
              <button
                onClick={() => setShowRating(true)}
                className="h-12 border border-brand bg-brand-light text-brand font-semibold rounded-xl hover:bg-brand/10 transition-all flex items-center justify-center gap-2"
              >
                <Star className="w-4 h-4" /> Rate this Order
              </button>
            )}
            {order.status !== 'cancelled' && (
              <button
                onClick={async () => {
                  if (!token) return;
                  try {
                    const res: any = await api.getInvoice(token, order._id);
                    const inv = res.data;
                    const w = window.open('', '_blank');
                    if (!w) { toast.error('Please allow pop-ups'); return; }
                    w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${inv.invoiceNumber}</title>
                    <style>body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;color:#1a1a2e}
                    .header{display:flex;justify-content:space-between;border-bottom:2px solid #6366f1;padding-bottom:16px;margin-bottom:24px}
                    .brand{font-size:24px;font-weight:800;color:#6366f1}
                    table{width:100%;border-collapse:collapse;margin:16px 0}th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #e2e8f0}
                    th{background:#f8fafc;font-size:12px;text-transform:uppercase;color:#64748b}
                    .total-row{font-weight:700;border-top:2px solid #1a1a2e}
                    .footer{margin-top:32px;text-align:center;color:#94a3b8;font-size:12px}
                    @media print{body{margin:0;padding:20px}}</style></head><body>
                    <div class="header"><div><div class="brand">LoadNBehold</div><div style="font-size:12px;color:#64748b">On-Demand Laundry Service</div></div>
                    <div style="text-align:right"><div style="font-size:18px;font-weight:700">${inv.invoiceNumber}</div>
                    <div style="font-size:12px;color:#64748b">${new Date(inv.date).toLocaleDateString()}</div></div></div>
                    <div style="margin-bottom:16px"><strong>Order:</strong> ${inv.order.orderNumber}<br/>
                    <strong>Status:</strong> ${inv.order.status}<br/>
                    <strong>Payment:</strong> ${inv.order.paymentMethod}</div>
                    <table><thead><tr><th>Service</th><th>Qty</th><th>Unit Price</th><th style="text-align:right">Amount</th></tr></thead><tbody>
                    ${inv.order.items.map((item: any) => `<tr><td>${item.service}</td><td>${item.quantity}${item.weight ? ` x ${item.weight} ${item.unit}` : ''}</td>
                    <td>$${(item.price || 0).toFixed(2)}</td><td style="text-align:right">$${(item.quantity * (item.weight || 1) * (item.price || 0)).toFixed(2)}</td></tr>`).join('')}
                    </tbody></table>
                    <table style="width:300px;margin-left:auto"><tbody>
                    <tr><td>Subtotal</td><td style="text-align:right">$${inv.order.pricing.subtotal.toFixed(2)}</td></tr>
                    <tr><td>Delivery Fee</td><td style="text-align:right">${inv.order.pricing.deliveryFee === 0 ? 'FREE' : '$' + inv.order.pricing.deliveryFee.toFixed(2)}</td></tr>
                    <tr><td>Tax</td><td style="text-align:right">$${inv.order.pricing.tax.toFixed(2)}</td></tr>
                    ${inv.order.pricing.discount > 0 ? `<tr><td>Discount</td><td style="text-align:right;color:#16a34a">-$${inv.order.pricing.discount.toFixed(2)}</td></tr>` : ''}
                    ${inv.order.pricing.tip > 0 ? `<tr><td>Tip</td><td style="text-align:right">$${inv.order.pricing.tip.toFixed(2)}</td></tr>` : ''}
                    <tr class="total-row"><td>Total</td><td style="text-align:right">$${inv.order.pricing.total.toFixed(2)}</td></tr>
                    </tbody></table>
                    <div class="footer"><p>Thank you for choosing LoadNBehold!</p><p>Questions? support@loadnbehold.com</p></div>
                    <script>window.print();</script></body></html>`);
                    w.document.close();
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to generate invoice');
                  }
                }}
                className="h-12 border border-border bg-surface text-text-primary font-semibold rounded-xl hover:bg-surface-secondary transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Invoice
              </button>
            )}
            <button
              onClick={() => router.push(`/support?orderId=${order._id}&orderNumber=${order.orderNumber}`)}
              className="h-12 border border-warning/30 text-warning font-semibold rounded-xl hover:bg-warning-light transition-all flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" /> Report Issue
            </button>
          </div>
        </div>

        {/* Right Column — Sidebar */}
        <div className="space-y-4">
          {/* Pricing */}
          <div className="lg:sticky lg:top-20">
            <section>
              <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">Pricing</h3>
              <div className="bg-surface border border-border rounded-2xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-text-secondary"><span>Subtotal</span><span>${order.pricing?.subtotal?.toFixed(2)}</span></div>
                <div className="flex justify-between text-text-secondary">
                  <span>Delivery Fee</span>
                  <span className={order.pricing?.deliveryFee === 0 ? 'text-success font-medium' : ''}>{order.pricing?.deliveryFee === 0 ? 'FREE' : `$${order.pricing?.deliveryFee?.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-text-secondary"><span>Tax</span><span>${order.pricing?.tax?.toFixed(2)}</span></div>
                {order.pricing?.tip > 0 && (
                  <div className="flex justify-between text-text-secondary"><span>Driver Tip</span><span className="text-pink-500 font-medium">${order.pricing.tip.toFixed(2)}</span></div>
                )}
                {order.pricing?.discount > 0 && (
                  <div className="flex justify-between text-success"><span>Discount</span><span>-${order.pricing.discount.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between font-bold text-text-primary pt-2 border-t border-border text-base">
                  <span>Total</span>
                  <span>${order.pricing?.total?.toFixed(2)}</span>
                </div>
              </div>
            </section>

            {/* Details */}
            <section className="mt-4">
              <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">Details</h3>
              <div className="bg-surface border border-border rounded-2xl p-4 space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-text-tertiary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-text-tertiary">Pickup Address</p>
                    <p className="font-medium text-text-primary">{order.pickupAddress?.line1}, {order.pickupAddress?.city}, {order.pickupAddress?.state} {order.pickupAddress?.zip}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-text-tertiary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-text-tertiary">Schedule</p>
                    <p className="font-medium text-text-primary">{order.schedule?.pickupSlot?.date} &middot; {order.schedule?.pickupSlot?.from}&#8211;{order.schedule?.pickupSlot?.to}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CreditCard className="w-4 h-4 text-text-tertiary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-text-tertiary">Payment</p>
                    <p className="font-medium text-text-primary capitalize">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Cancel Dialog */}
      <AnimatePresence>
        {showCancelDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowCancelDialog(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-error-light flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-error" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">Cancel Order</h3>
                  <p className="text-xs text-text-secondary">This action cannot be undone</p>
                </div>
              </div>

              {/* Refund info */}
              {(() => {
                const policy = CANCELLATION_POLICY[order.status];
                if (!policy) return null;
                const refundAmt = parseFloat(((order.pricing.total * policy.refundPercent) / 100 - policy.fee).toFixed(2));
                return (
                  <div className="bg-surface-secondary rounded-xl p-3 mb-4 text-sm space-y-1">
                    <div className="flex justify-between text-text-secondary">
                      <span>Order Total</span>
                      <span className="font-medium">${order.pricing.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span>Refund ({policy.refundPercent}%)</span>
                      <span className="font-medium">${((order.pricing.total * policy.refundPercent) / 100).toFixed(2)}</span>
                    </div>
                    {policy.fee > 0 && (
                      <div className="flex justify-between text-text-secondary">
                        <span>Cancellation Fee</span>
                        <span className="font-medium text-error">-${policy.fee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-text-primary pt-1 border-t border-border">
                      <span>You&apos;ll receive</span>
                      <span className="text-success">${Math.max(0, refundAmt).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Refund method — wallet payments always go to wallet */}
              {order.paymentMethod !== 'cod' && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2">Refund to</p>
                  {order.paymentMethod === 'wallet' ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-brand bg-brand-light">
                      <Wallet className="w-4 h-4 text-brand" />
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-text-primary">Wallet</span>
                        <p className="text-[11px] text-text-secondary">Instant refund to your app wallet</p>
                      </div>
                      <Check className="w-4 h-4 text-brand" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className={cn('flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                        refundMethod === 'wallet' ? 'border-brand bg-brand-light' : 'border-border hover:border-border-hover'
                      )}>
                        <input type="radio" name="refundMethod" checked={refundMethod === 'wallet'} onChange={() => setRefundMethod('wallet')} className="sr-only" />
                        <Wallet className={cn('w-4 h-4', refundMethod === 'wallet' ? 'text-brand' : 'text-text-tertiary')} />
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-text-primary">Wallet</span>
                          <p className="text-[11px] text-text-secondary">Instant refund to your app wallet</p>
                        </div>
                        {refundMethod === 'wallet' && <Check className="w-4 h-4 text-brand" />}
                      </label>
                      <label className={cn('flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                        refundMethod === 'original_payment' ? 'border-brand bg-brand-light' : 'border-border hover:border-border-hover'
                      )}>
                        <input type="radio" name="refundMethod" checked={refundMethod === 'original_payment'} onChange={() => setRefundMethod('original_payment')} className="sr-only" />
                        <CreditCard className={cn('w-4 h-4', refundMethod === 'original_payment' ? 'text-brand' : 'text-text-tertiary')} />
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-text-primary">Original Payment</span>
                          <p className="text-[11px] text-text-secondary">3-5 business days to process</p>
                        </div>
                        {refundMethod === 'original_payment' && <Check className="w-4 h-4 text-brand" />}
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Reason */}
              <div className="mb-4">
                <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2">Reason (optional)</p>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Tell us why you're cancelling..."
                  rows={2}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="flex-1 h-11 border border-border rounded-xl font-semibold text-sm text-text-secondary hover:bg-surface-secondary transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 h-11 bg-error text-white rounded-xl font-semibold text-sm hover:bg-error/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cancelling ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Confirm Cancel'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rating Dialog */}
      <AnimatePresence>
        {showRating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowRating(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl"
            >
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl bg-brand-light flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-brand" />
                </div>
                <h3 className="font-bold text-lg text-text-primary">Rate your experience</h3>
                <p className="text-xs text-text-secondary mt-0.5">Your feedback helps us improve</p>
              </div>

              {/* Service Rating */}
              <div className="mb-4">
                <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2">Service Quality</p>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setServiceRating(star)} className="p-1 transition-transform hover:scale-110">
                      <Star className={cn('w-8 h-8', star <= serviceRating ? 'text-yellow-500 fill-yellow-500' : 'text-border')} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Driver Rating */}
              <div className="mb-4">
                <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2">Driver</p>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setDriverRating(star)} className="p-1 transition-transform hover:scale-110">
                      <Star className={cn('w-8 h-8', star <= driverRating ? 'text-yellow-500 fill-yellow-500' : 'text-border')} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review */}
              <div className="mb-5">
                <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2">Review (optional)</p>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="How was your experience?"
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRating(false)}
                  className="flex-1 h-11 border border-border rounded-xl font-semibold text-sm text-text-secondary hover:bg-surface-secondary transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleRate}
                  disabled={submittingRating || serviceRating === 0 || driverRating === 0}
                  className="flex-1 h-11 bg-brand text-white rounded-xl font-semibold text-sm hover:bg-brand-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingRating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Submit Rating'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
