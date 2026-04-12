'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Truck, Star, DollarSign, Package, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@loadnbehold/constants';
import { useAdminAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

const statusMap: Record<string, { label: string; color: string }> = {
  approved: { label: 'Approved', color: 'bg-success-light text-success' },
  pending: { label: 'Pending Review', color: 'bg-warning-light text-warning' },
  suspended: { label: 'Suspended', color: 'bg-error-light text-error' },
  rejected: { label: 'Rejected', color: 'bg-error-light text-error' },
};

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAdminAuthStore();
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accessToken && id) fetchDriver();
  }, [accessToken, id]);

  const fetchDriver = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await adminApi.getDriverById(accessToken, id);
      setDriver(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch driver');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!accessToken) return;
    try {
      await adminApi.approveDriver(accessToken, id, true);
      toast.success('Driver approved');
      fetchDriver();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve');
    }
  };

  const handleSuspend = async () => {
    if (!accessToken) return;
    try {
      await adminApi.suspendDriver(accessToken, id);
      toast.success('Driver suspended');
      fetchDriver();
    } catch (err: any) {
      toast.error(err.message || 'Failed to suspend');
    }
  };

  const handleReconcile = async () => {
    if (!accessToken) return;
    try {
      await adminApi.reconcileDriverCash(accessToken, id);
      toast.success('Cash reconciled');
      fetchDriver();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reconcile');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-8 bg-surface-secondary rounded w-48" />
        <div className="animate-pulse h-48 bg-surface-secondary rounded" />
        <div className="animate-pulse h-64 bg-surface-secondary rounded" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
        <p className="text-text-secondary">Driver not found</p>
        <button onClick={() => router.push('/dashboard/drivers')} className="mt-4 text-brand text-sm font-medium">Back to Drivers</button>
      </div>
    );
  }

  const status = statusMap[driver.status] || { label: driver.status, color: 'bg-surface-secondary text-text-secondary' };

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/dashboard/drivers')} className="p-2 hover:bg-surface-secondary rounded-lg">
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center text-lg font-bold">
            {driver.userId?.name?.split(' ').map((n: string) => n[0]).join('') || 'D'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-text-primary">{driver.userId?.name || 'Unknown Driver'}</h1>
              <span className={cn('inline-flex h-[22px] px-2 rounded-full text-[12px] font-semibold items-center', status.color)}>{status.label}</span>
              {driver.isOnline && <span className="inline-flex items-center gap-1 text-[12px] text-success font-medium"><span className="w-2 h-2 rounded-full bg-success" />Online</span>}
            </div>
            <p className="text-sm text-text-secondary">{driver.userId?.phone} {driver.userId?.email ? `· ${driver.userId.email}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {driver.status === 'pending' && (
            <>
              <button onClick={handleApprove} className="flex items-center gap-1.5 px-3 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90">
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
              <button onClick={() => adminApi.approveDriver(accessToken!, id, false).then(() => { toast.success('Rejected'); fetchDriver(); }).catch(() => toast.error('Failed'))} className="flex items-center gap-1.5 px-3 py-2 bg-error text-white rounded-lg text-sm font-medium hover:bg-error/90">
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </>
          )}
          {driver.status === 'approved' && (
            <button onClick={handleSuspend} className="px-3 py-2 bg-error/10 text-error border border-error/20 rounded-lg text-sm font-medium hover:bg-error/20">Suspend</button>
          )}
          {driver.status === 'suspended' && (
            <button onClick={handleApprove} className="px-3 py-2 bg-success/10 text-success border border-success/20 rounded-lg text-sm font-medium hover:bg-success/20">Reinstate</button>
          )}
          {driver.cashBalance > 0 && (
            <button onClick={handleReconcile} className="flex items-center gap-1.5 px-3 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90">
              <DollarSign className="w-4 h-4" /> Reconcile ${driver.cashBalance.toFixed(2)}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Rating', value: driver.metrics?.rating > 0 ? driver.metrics.rating.toFixed(1) : 'N/A', icon: Star, extra: driver.metrics?.ratingCount ? `(${driver.metrics.ratingCount} reviews)` : '' },
          { label: 'Deliveries', value: driver.metrics?.totalDeliveries || 0, icon: Package },
          { label: 'Cash Balance', value: `$${(driver.cashBalance || 0).toFixed(2)}`, icon: DollarSign },
          { label: 'Cash Collected', value: `$${(driver.cashCollected || 0).toFixed(2)}`, icon: DollarSign },
          { label: 'Cash Deposited', value: `$${(driver.cashDeposited || 0).toFixed(2)}`, icon: DollarSign },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4 text-text-tertiary" />
              <span className="text-sm text-text-secondary">{s.label}</span>
            </div>
            <div className="text-xl font-bold text-text-primary">{s.value}</div>
            {'extra' in s && s.extra && <div className="text-[11px] text-text-tertiary">{s.extra}</div>}
          </div>
        ))}
      </div>

      {/* Vehicle */}
      <div className="bg-surface border border-border rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Truck className="w-4 h-4 text-text-secondary" />
          <span className="text-sm font-medium text-text-secondary">Vehicle Information</span>
        </div>
        {driver.vehicle ? (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-text-tertiary">Type:</span> <span className="text-text-primary font-medium ml-2">{driver.vehicle.type || 'N/A'}</span></div>
            <div><span className="text-text-tertiary">Make/Model:</span> <span className="text-text-primary font-medium ml-2">{driver.vehicle.make || ''} {driver.vehicle.model || ''}</span></div>
            <div><span className="text-text-tertiary">Color:</span> <span className="text-text-primary font-medium ml-2">{driver.vehicle.color || 'N/A'}</span></div>
            <div><span className="text-text-tertiary">Plate:</span> <span className="text-text-primary font-medium ml-2">{driver.vehicle.plate || 'N/A'}</span></div>
            <div><span className="text-text-tertiary">Year:</span> <span className="text-text-primary font-medium ml-2">{driver.vehicle.year || 'N/A'}</span></div>
          </div>
        ) : (
          <p className="text-sm text-text-tertiary">No vehicle info</p>
        )}
      </div>

      {/* Recent Orders */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium text-text-secondary mb-3">Recent Orders</h3>
        {driver.recentOrders?.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="text-left text-[12px] text-text-tertiary">
                <th className="pb-2">Order #</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Total</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {driver.recentOrders.map((order: any) => (
                <tr key={order._id} className="text-sm border-t border-border hover:bg-surface-secondary/50 cursor-pointer" onClick={() => router.push(`/dashboard/orders/${order._id}`)}>
                  <td className="py-2 text-brand font-medium">{order.orderNumber}</td>
                  <td className="py-2">
                    <span className="text-[12px] px-2 py-0.5 rounded-full bg-surface-secondary text-text-secondary font-medium">{(ORDER_STATUS_LABELS as any)[order.status] || order.status}</span>
                  </td>
                  <td className="py-2 text-text-primary font-medium">${order.pricing?.total?.toFixed(2) || '0.00'}</td>
                  <td className="py-2 text-text-tertiary">{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-text-tertiary text-center py-4">No orders yet</p>
        )}
      </div>
    </div>
  );
}
