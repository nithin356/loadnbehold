'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, ShoppingBag, Wallet, Shield, ShieldOff, CreditCard, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@loadnbehold/constants';
import { useAdminAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAdminAuthStore();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accessToken && id) fetchCustomer();
  }, [accessToken, id]);

  const fetchCustomer = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await adminApi.getCustomerById(accessToken, id);
      setCustomer(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch customer');
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!accessToken || !customer) return;
    try {
      await adminApi.blockCustomer(accessToken, id, !customer.isBlocked);
      toast.success(customer.isBlocked ? 'Customer unblocked' : 'Customer blocked');
      fetchCustomer();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    }
  };

  const handleCredit = async () => {
    const amountStr = window.prompt('Enter amount to credit:');
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) { toast.error('Invalid amount'); return; }
    if (!accessToken) return;
    try {
      await adminApi.creditCustomer(accessToken, id, amount, 'Admin credit');
      toast.success(`Credited $${amount.toFixed(2)}`);
      fetchCustomer();
    } catch (err: any) {
      toast.error(err.message || 'Failed to credit');
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

  if (!customer) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
        <p className="text-text-secondary">Customer not found</p>
        <button onClick={() => router.push('/dashboard/customers')} className="mt-4 text-brand text-sm font-medium">Back to Customers</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/dashboard/customers')} className="p-2 hover:bg-surface-secondary rounded-lg">
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text-primary">{customer.name || 'Unnamed Customer'}</h1>
          <p className="text-sm text-text-secondary mt-0.5">{customer.phone} {customer.email ? `· ${customer.email}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCredit} className="flex items-center gap-1.5 px-3 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90">
            <CreditCard className="w-4 h-4" /> Credit Wallet
          </button>
          <button onClick={handleBlock} className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border', customer.isBlocked ? 'bg-success/10 text-success border-success/20 hover:bg-success/20' : 'bg-error/10 text-error border-error/20 hover:bg-error/20')}>
            {customer.isBlocked ? <><Shield className="w-4 h-4" /> Unblock</> : <><ShieldOff className="w-4 h-4" /> Block</>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Orders', value: customer.totalOrders || customer.orderCount || 0, icon: ShoppingBag },
          { label: 'Wallet Balance', value: `$${(customer.walletBalance || 0).toFixed(2)}`, icon: Wallet },
          { label: 'Status', value: customer.isBlocked ? 'Blocked' : 'Active', icon: Shield },
          { label: 'Joined', value: new Date(customer.createdAt).toLocaleDateString(), icon: User },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4 text-text-tertiary" />
              <span className="text-sm text-text-secondary">{s.label}</span>
            </div>
            <div className="text-xl font-bold text-text-primary">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Profile */}
      <div className="bg-surface border border-border rounded-lg p-4 mb-4">
        <h3 className="text-sm font-medium text-text-secondary mb-3">Profile Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-text-tertiary">Name:</span> <span className="text-text-primary font-medium ml-2">{customer.name || 'N/A'}</span></div>
          <div><span className="text-text-tertiary">Phone:</span> <span className="text-text-primary font-medium ml-2">{customer.phone}</span></div>
          <div><span className="text-text-tertiary">Email:</span> <span className="text-text-primary font-medium ml-2">{customer.email || 'N/A'}</span></div>
          <div><span className="text-text-tertiary">Role:</span> <span className="text-text-primary font-medium ml-2">{customer.role}</span></div>
          <div><span className="text-text-tertiary">Referral Code:</span> <span className="text-brand font-medium ml-2">{customer.referralCode || 'N/A'}</span></div>
          <div><span className="text-text-tertiary">Last Login:</span> <span className="text-text-primary font-medium ml-2">{customer.lastLoginAt ? new Date(customer.lastLoginAt).toLocaleString() : 'Never'}</span></div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-surface border border-border rounded-lg p-4 mb-4">
        <h3 className="text-sm font-medium text-text-secondary mb-3">Recent Orders</h3>
        {customer.recentOrders?.length > 0 ? (
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
              {customer.recentOrders.map((order: any) => (
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

      {/* Wallet Transactions */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium text-text-secondary mb-3">Recent Wallet Transactions</h3>
        {customer.recentWalletTransactions?.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="text-left text-[12px] text-text-tertiary">
                <th className="pb-2">Type</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Balance</th>
                <th className="pb-2">Description</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {customer.recentWalletTransactions.map((tx: any) => (
                <tr key={tx._id} className="text-sm border-t border-border">
                  <td className="py-2 text-text-primary font-medium capitalize">{tx.type}</td>
                  <td className={cn('py-2 font-medium', tx.amount >= 0 ? 'text-success' : 'text-error')}>
                    {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                  </td>
                  <td className="py-2 text-text-secondary">${(tx.balance || 0).toFixed(2)}</td>
                  <td className="py-2 text-text-tertiary text-[12px]">{tx.description || '-'}</td>
                  <td className="py-2 text-text-tertiary">{new Date(tx.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-text-tertiary text-center py-4">No wallet transactions</p>
        )}
      </div>
    </div>
  );
}
