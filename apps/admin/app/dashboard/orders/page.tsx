'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Search, Filter, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
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

export default function OrdersPage() {
  const router = useRouter();
  const { accessToken } = useAdminAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!accessToken) return;

    const timeoutId = setTimeout(() => {
      fetchOrders();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [accessToken, search, statusFilter, page]);

  const fetchOrders = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '10');
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await adminApi.getOrders(accessToken, params.toString());
      setOrders(res.data || []);
      setTotal(res.total || res.data?.length || 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Orders</h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage and track all customer orders</p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search orders or customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="all">All Statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{(ORDER_STATUS_LABELS as Record<string, string>)[s] || s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-secondary">
                {['Order #', 'Customer', 'Status', 'Items', 'Total', 'Payment', 'Driver', 'Outlet', 'Date'].map((h) => (
                  <th key={h} className="text-left text-[13px] font-medium text-text-secondary px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8">
                    <div className="flex flex-col gap-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse h-12 bg-surface-secondary rounded" />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-text-tertiary">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order: any) => (
                  <tr key={order._id} onClick={() => router.push(`/dashboard/orders/${order._id}`)} className="border-t border-border hover:bg-surface-secondary/50 transition-colors cursor-pointer">
                    <td className="px-4 py-3 text-sm font-medium text-brand">{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-text-primary">{order.customerId?.name || 'N/A'}</div>
                      <div className="text-[12px] text-text-tertiary">{order.customerId?.phone || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center h-[22px] px-2 rounded-full text-[12px] font-semibold', statusColors[order.status] || 'bg-surface-secondary text-text-secondary')}>
                        {(ORDER_STATUS_LABELS as Record<string, string>)[order.status] || order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">{order.items?.length || 0}</td>
                    <td className="px-4 py-3 text-sm font-medium text-text-primary">${order.pricing?.total?.toFixed(2) || '0.00'}</td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] px-2 py-0.5 rounded bg-surface-secondary text-text-secondary font-medium uppercase">{order.paymentMethod || 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{order.driverId?.userId?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{order.outletId?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-[12px] text-text-tertiary whitespace-nowrap">{new Date(order.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-sm text-text-secondary">Showing {orders.length} of {total} orders</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 text-text-tertiary hover:text-text-primary disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-sm font-medium text-brand bg-brand-light rounded">{page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={orders.length < 10}
              className="p-2 text-text-tertiary hover:text-text-primary disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
