'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingBag, ChevronRight, Package, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_VARIANT } from '@loadnbehold/constants';
import { cn } from '@/lib/utils';

const badgeColors: Record<string, string> = {
  info: 'bg-brand-light text-brand',
  warning: 'bg-warning-light text-warning',
  success: 'bg-success-light text-success',
  error: 'bg-error-light text-error',
  neutral: 'bg-surface-secondary text-text-secondary',
};

type FilterTab = 'all' | 'active' | 'completed' | 'cancelled';

const FILTER_TABS: { key: FilterTab; label: string; short: string }[] = [
  { key: 'all', label: 'All', short: 'All' },
  { key: 'active', label: 'Active', short: 'Active' },
  { key: 'completed', label: 'Completed', short: 'Done' },
  { key: 'cancelled', label: 'Cancelled', short: 'Cancelled' },
];

const ACTIVE_STATUSES = ['placed', 'confirmed', 'driver_assigned', 'pickup_enroute', 'picked_up', 'at_laundry', 'processing', 'quality_check', 'ready_for_delivery', 'out_for_delivery'];

export default function OrdersPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');

  useEffect(() => {
    if (!token) return;
    api.getOrders(token).then((res: any) => {
      setOrders(res.data || []);
    }).finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    if (filter === 'active') return orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
    if (filter === 'completed') return orders.filter((o) => o.status === 'delivered');
    if (filter === 'cancelled') return orders.filter((o) => o.status === 'cancelled');
    return orders;
  }, [orders, filter]);

  const counts = useMemo(() => ({
    all: orders.length,
    active: orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
    completed: orders.filter((o) => o.status === 'delivered').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  }), [orders]);

  if (loading) {
    return (
      <div className="py-6 space-y-4">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-10 w-full rounded-lg" />
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-text-primary">Your Orders</h1>
        <p className="text-sm text-text-secondary mt-0.5">Track and manage your laundry orders</p>
      </div>

      {orders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-surface border border-border rounded-2xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-brand" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-1">No orders yet</h3>
          <p className="text-sm text-text-secondary mb-5 max-w-[240px] mx-auto">Place your first order and get 20% off with code FIRST20</p>
          <Link href="/order" className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl shadow-xl shadow-brand/20 hover:shadow-2xl hover:-translate-y-0.5 transition-all">
            Start an Order <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      ) : (
        <>
          {/* Filter Tabs */}
          <div className="flex gap-1 mb-6 bg-surface-secondary p-1 rounded-xl overflow-x-auto no-scrollbar">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  'flex-1 min-w-0 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1 whitespace-nowrap',
                  filter === tab.key
                    ? 'bg-surface text-text-primary shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary'
                )}
              >
                <span className="sm:hidden">{tab.short}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                  filter === tab.key ? 'bg-brand text-white' : 'bg-surface text-text-tertiary'
                )}>
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Desktop Table (lg+) */}
          <div className="hidden lg:block bg-surface border border-border rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-secondary">
                  <th className="text-left text-[13px] font-semibold text-text-secondary px-5 py-3">Order #</th>
                  <th className="text-left text-[13px] font-semibold text-text-secondary px-5 py-3">Services</th>
                  <th className="text-left text-[13px] font-semibold text-text-secondary px-5 py-3">Status</th>
                  <th className="text-left text-[13px] font-semibold text-text-secondary px-5 py-3">Date</th>
                  <th className="text-right text-[13px] font-semibold text-text-secondary px-5 py-3">Total</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const variant = ORDER_STATUS_BADGE_VARIANT[order.status] || 'neutral';
                  return (
                    <tr key={order._id} className="border-t border-border hover:bg-surface-secondary/50 transition-colors">
                      <td className="px-5 py-4">
                        <Link href={`/orders/${order._id}`} className="text-sm font-bold text-text-primary hover:text-brand transition-colors">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-sm text-text-secondary">
                        {order.items?.length || 0} service(s)
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn('inline-flex items-center h-[22px] px-2.5 rounded-full text-[10px] font-bold uppercase tracking-wide', badgeColors[variant])}>
                          {ORDER_STATUS_LABELS[order.status] || order.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-text-secondary">
                        {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-text-primary text-right">
                        ${order.pricing?.total?.toFixed(2)}
                      </td>
                      <td className="pr-4 py-4">
                        <Link href={`/orders/${order._id}`} className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-tertiary hover:text-text-primary transition-colors inline-flex">
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-text-tertiary">
                      No {filter !== 'all' ? filter : ''} orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (<lg) */}
          <div className="lg:hidden space-y-3">
            {filtered.map((order, i) => {
              const variant = ORDER_STATUS_BADGE_VARIANT[order.status] || 'neutral';
              return (
                <motion.div key={order._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link href={`/orders/${order._id}`} className="block bg-surface border border-border rounded-2xl p-4 hover:shadow-md hover:border-border-hover hover:-translate-y-0.5 transition-all">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-sm font-bold text-text-primary">{order.orderNumber}</span>
                      <span className={cn('inline-flex items-center h-[22px] px-2.5 rounded-full text-[10px] font-bold uppercase tracking-wide', badgeColors[variant])}>
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">{order.items?.length || 0} service(s) &middot; {new Date(order.createdAt).toLocaleDateString()}</span>
                      <span className="font-bold text-text-primary">${order.pricing?.total?.toFixed(2)}</span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 bg-surface border border-border rounded-2xl text-sm text-text-tertiary">
                No {filter !== 'all' ? filter : ''} orders found
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
