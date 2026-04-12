'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Truck, User, MapPin, Clock, DollarSign, Package, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from '@loadnbehold/constants';
import { useAdminAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  delivered: 'bg-success-light text-success',
  processing: 'bg-surface-secondary text-text-secondary',
  pickup_enroute: 'bg-warning-light text-warning',
  placed: 'bg-brand-light text-brand',
  out_for_delivery: 'bg-warning-light text-warning',
  cancelled: 'bg-error-light text-error',
  picked_up: 'bg-brand-light text-brand',
  at_laundry: 'bg-surface-secondary text-text-secondary',
  quality_check: 'bg-brand-light text-brand',
  ready_for_delivery: 'bg-brand-light text-brand',
  confirmed: 'bg-brand-light text-brand',
  driver_assigned: 'bg-brand-light text-brand',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, user: adminUser } = useAdminAuthStore();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundToWallet, setRefundToWallet] = useState(true);
  const [driverId, setDriverId] = useState('');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [adjustWeight, setAdjustWeight] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (accessToken && id) fetchOrder();
  }, [accessToken, id]);

  const fetchOrder = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await adminApi.getOrderById(accessToken, id);
      setOrder(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch order');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!accessToken || !newStatus) return;
    setSaving(true);
    try {
      await adminApi.updateOrder(accessToken, id, { status: newStatus });
      toast.success(`Status updated to ${(ORDER_STATUS_LABELS as any)[newStatus] || newStatus}`);
      setShowStatusModal(false);
      fetchOrder();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleRefund = async () => {
    if (!accessToken) return;
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Invalid amount'); return; }
    setSaving(true);
    try {
      await adminApi.refundOrder(accessToken, id, { amount, toWallet: refundToWallet });
      toast.success(`Refund of $${amount.toFixed(2)} processed`);
      setShowRefundModal(false);
      fetchOrder();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process refund');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!accessToken || !driverId) return;
    setSaving(true);
    try {
      await adminApi.assignDriverToOrder(accessToken, id, driverId);
      toast.success('Driver assigned');
      setShowAssignModal(false);
      fetchOrder();
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign driver');
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustPrice = async () => {
    if (!accessToken) return;
    setSaving(true);
    try {
      const data: Record<string, unknown> = { note: adjustNote };
      if (adjustWeight) data.weight = parseFloat(adjustWeight);
      await adminApi.adjustOrderPrice(accessToken, id, data);
      toast.success('Price adjusted');
      setShowPriceModal(false);
      fetchOrder();
    } catch (err: any) {
      toast.error(err.message || 'Failed to adjust price');
    } finally {
      setSaving(false);
    }
  };

  const openAssignModal = async () => {
    if (!accessToken) return;
    try {
      const res = await adminApi.getDrivers(accessToken);
      setDrivers((res.data || []).filter((d: any) => d.status === 'approved'));
    } catch {}
    setShowAssignModal(true);
  };

  const canRefund = ['super_admin', 'finance', 'support_staff'].includes(adminUser?.adminRole || '');
  const canAssign = ['super_admin', 'outlet_manager'].includes(adminUser?.adminRole || '');
  const canAdjust = ['super_admin', 'outlet_manager'].includes(adminUser?.adminRole || '');

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-8 bg-surface-secondary rounded w-48" />
        <div className="animate-pulse h-64 bg-surface-secondary rounded" />
        <div className="animate-pulse h-48 bg-surface-secondary rounded" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
        <p className="text-text-secondary">Order not found</p>
        <button onClick={() => router.push('/dashboard/orders')} className="mt-4 text-brand text-sm font-medium">Back to Orders</button>
      </div>
    );
  }

  const driverInfo = order.driverId;

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/dashboard/orders')} className="p-2 hover:bg-surface-secondary rounded-lg">
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">{order.orderNumber}</h1>
            <span className={cn('inline-flex h-[24px] px-2.5 rounded-full text-[12px] font-semibold items-center', statusColors[order.status])}>
              {(ORDER_STATUS_LABELS as any)[order.status] || order.status}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-0.5">Created {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowStatusModal(true)} className="px-3 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90">Update Status</button>
          {canAssign && <button onClick={openAssignModal} className="px-3 py-2 bg-surface border border-border text-text-primary rounded-lg text-sm font-medium hover:bg-surface-secondary">Assign Driver</button>}
          {canAdjust && <button onClick={() => setShowPriceModal(true)} className="px-3 py-2 bg-surface border border-border text-text-primary rounded-lg text-sm font-medium hover:bg-surface-secondary">Adjust Price</button>}
          {canRefund && <button onClick={() => { setRefundAmount(order.pricing?.total?.toFixed(2) || ''); setShowRefundModal(true); }} className="px-3 py-2 bg-error/10 text-error border border-error/20 rounded-lg text-sm font-medium hover:bg-error/20">Issue Refund</button>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Customer */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-text-secondary" />
            <span className="text-sm font-medium text-text-secondary">Customer</span>
          </div>
          <div className="text-sm font-medium text-text-primary">{order.customerId?.name || 'N/A'}</div>
          <div className="text-[12px] text-text-tertiary">{order.customerId?.phone}</div>
          {order.customerId?.email && <div className="text-[12px] text-text-tertiary">{order.customerId.email}</div>}
          {order.customerId?._id && (
            <button onClick={() => router.push(`/dashboard/customers/${order.customerId._id}`)} className="text-[12px] text-brand mt-1 font-medium">View Customer</button>
          )}
        </div>

        {/* Driver */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-text-secondary" />
            <span className="text-sm font-medium text-text-secondary">Driver</span>
          </div>
          {driverInfo ? (
            <>
              <div className="text-sm font-medium text-text-primary">{driverInfo.userId?.name || 'N/A'}</div>
              <div className="text-[12px] text-text-tertiary">{driverInfo.userId?.phone}</div>
              {driverInfo.vehicle && <div className="text-[12px] text-text-tertiary">{driverInfo.vehicle.type} {driverInfo.vehicle.plate && `- ${driverInfo.vehicle.plate}`}</div>}
              {driverInfo._id && (
                <button onClick={() => router.push(`/dashboard/drivers/${driverInfo._id}`)} className="text-[12px] text-brand mt-1 font-medium">View Driver</button>
              )}
            </>
          ) : (
            <div className="text-sm text-text-tertiary">Unassigned</div>
          )}
        </div>

        {/* Outlet */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-text-secondary" />
            <span className="text-sm font-medium text-text-secondary">Outlet</span>
          </div>
          <div className="text-sm font-medium text-text-primary">{order.outletId?.name || 'N/A'}</div>
          {order.outletId?.address && <div className="text-[12px] text-text-tertiary">{order.outletId.address.line1}</div>}
        </div>
      </div>

      {/* Items */}
      <div className="bg-surface border border-border rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-text-secondary" />
          <span className="text-sm font-medium text-text-secondary">Items</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-left text-[12px] text-text-tertiary">
              <th className="pb-2">Service</th>
              <th className="pb-2">Qty</th>
              <th className="pb-2">Weight</th>
              <th className="pb-2">Unit Price</th>
              <th className="pb-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item: any, i: number) => (
              <tr key={i} className="text-sm border-t border-border">
                <td className="py-2 text-text-primary font-medium">{item.service}</td>
                <td className="py-2 text-text-secondary">{item.quantity}</td>
                <td className="py-2 text-text-secondary">{item.weight ? `${item.weight} ${item.unit || ''}` : '-'}</td>
                <td className="py-2 text-text-secondary">${(item.price || 0).toFixed(2)}</td>
                <td className="py-2 text-text-primary font-medium text-right">${((item.quantity || 1) * (item.weight || 1) * (item.price || 0)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Pricing */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-text-secondary" />
            <span className="text-sm font-medium text-text-secondary">Pricing</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-text-secondary">Subtotal</span><span className="text-text-primary">${order.pricing?.subtotal?.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-text-secondary">Delivery Fee</span><span className="text-text-primary">${order.pricing?.deliveryFee?.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-text-secondary">Tax</span><span className="text-text-primary">${order.pricing?.tax?.toFixed(2)}</span></div>
            {order.pricing?.discount > 0 && <div className="flex justify-between"><span className="text-text-secondary">Discount</span><span className="text-success">-${order.pricing.discount.toFixed(2)}</span></div>}
            {order.pricing?.tip > 0 && <div className="flex justify-between"><span className="text-text-secondary">Tip</span><span className="text-text-primary">${order.pricing.tip.toFixed(2)}</span></div>}
            <div className="flex justify-between border-t border-border pt-2 font-semibold"><span className="text-text-primary">Total</span><span className="text-text-primary">${order.pricing?.total?.toFixed(2)}</span></div>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-text-secondary" />
            <span className="text-sm font-medium text-text-secondary">Payment</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-text-secondary">Method</span><span className="text-text-primary uppercase font-medium">{order.paymentMethod}</span></div>
            <div className="flex justify-between"><span className="text-text-secondary">Gateway</span><span className="text-text-primary">{order.payment?.gateway || '-'}</span></div>
            <div className="flex justify-between"><span className="text-text-secondary">Status</span><span className="text-text-primary">{order.payment?.status?.replace(/_/g, ' ')}</span></div>
            {order.payment?.gatewayTransactionId && <div className="flex justify-between"><span className="text-text-secondary">Transaction ID</span><span className="text-text-tertiary text-[12px] font-mono">{order.payment.gatewayTransactionId}</span></div>}
            {order.promoCode && <div className="flex justify-between"><span className="text-text-secondary">Promo Code</span><span className="text-brand font-medium">{order.promoCode}</span></div>}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-text-secondary" />
          <span className="text-sm font-medium text-text-secondary">Timeline</span>
        </div>
        <div className="space-y-3">
          {order.timeline?.map((entry: any, i: number) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-1.5 w-2 h-2 rounded-full bg-brand flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-text-primary">{(ORDER_STATUS_LABELS as any)[entry.status] || entry.status?.replace(/_/g, ' ')}</div>
                {entry.note && <div className="text-[12px] text-text-tertiary">{entry.note}</div>}
                <div className="text-[11px] text-text-tertiary">{new Date(entry.timestamp).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Update Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Update Order Status</h3>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full h-10 px-3 bg-surface border border-border rounded-lg text-sm text-text-primary mb-4">
              <option value="">Select status...</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{(ORDER_STATUS_LABELS as any)[s] || s}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowStatusModal(false)} className="px-4 py-2 text-sm text-text-secondary hover:bg-surface-secondary rounded-lg">Cancel</button>
              <button onClick={handleUpdateStatus} disabled={saving || !newStatus} className="px-4 py-2 text-sm bg-brand text-white rounded-lg font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Update'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Issue Refund</h3>
            <label className="block text-sm text-text-secondary mb-1">Amount</label>
            <input type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className="w-full h-10 px-3 bg-surface border border-border rounded-lg text-sm text-text-primary mb-3" step="0.01" />
            <label className="flex items-center gap-2 text-sm text-text-primary mb-4">
              <input type="checkbox" checked={refundToWallet} onChange={(e) => setRefundToWallet(e.target.checked)} className="rounded border-border" />
              Refund to wallet (instant)
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRefundModal(false)} className="px-4 py-2 text-sm text-text-secondary hover:bg-surface-secondary rounded-lg">Cancel</button>
              <button onClick={handleRefund} disabled={saving} className="px-4 py-2 text-sm bg-error text-white rounded-lg font-medium disabled:opacity-50">{saving ? 'Processing...' : 'Refund'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Driver Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Assign Driver</h3>
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="w-full h-10 px-3 bg-surface border border-border rounded-lg text-sm text-text-primary mb-4">
              <option value="">Select driver...</option>
              {drivers.map((d: any) => (
                <option key={d._id} value={d._id}>{d.userId?.name || 'Unknown'} — {d.vehicle?.type || 'N/A'} {d.isOnline ? '(Online)' : '(Offline)'}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-sm text-text-secondary hover:bg-surface-secondary rounded-lg">Cancel</button>
              <button onClick={handleAssignDriver} disabled={saving || !driverId} className="px-4 py-2 text-sm bg-brand text-white rounded-lg font-medium disabled:opacity-50">{saving ? 'Assigning...' : 'Assign'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Price Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Adjust Order Price</h3>
            <label className="block text-sm text-text-secondary mb-1">Actual Weight (lbs)</label>
            <input type="number" value={adjustWeight} onChange={(e) => setAdjustWeight(e.target.value)} className="w-full h-10 px-3 bg-surface border border-border rounded-lg text-sm text-text-primary mb-3" step="0.1" placeholder="Leave blank to keep current" />
            <label className="block text-sm text-text-secondary mb-1">Note</label>
            <input type="text" value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} className="w-full h-10 px-3 bg-surface border border-border rounded-lg text-sm text-text-primary mb-4" placeholder="Reason for adjustment" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowPriceModal(false)} className="px-4 py-2 text-sm text-text-secondary hover:bg-surface-secondary rounded-lg">Cancel</button>
              <button onClick={handleAdjustPrice} disabled={saving} className="px-4 py-2 text-sm bg-brand text-white rounded-lg font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Adjust'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
