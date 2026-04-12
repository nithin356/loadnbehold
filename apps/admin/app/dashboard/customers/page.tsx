'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Search, Shield, ShieldOff, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

export default function CustomersPage() {
  const router = useRouter();
  const { accessToken } = useAdminAuthStore();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!accessToken) return;
    fetchCustomers();
  }, [accessToken, page]);

  const fetchCustomers = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await adminApi.getCustomers(accessToken, page);
      setCustomers(res.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (userId: string, currentlyBlocked: boolean) => {
    if (!accessToken) return;
    try {
      await adminApi.blockCustomer(accessToken, userId, !currentlyBlocked);
      toast.success(currentlyBlocked ? 'Customer unblocked' : 'Customer blocked');
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update customer');
    }
  };

  const handleCreditWallet = async (userId: string) => {
    const amountStr = window.prompt('Enter amount to credit:');
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount');
      return;
    }
    if (!accessToken) return;
    try {
      await adminApi.creditCustomer(accessToken, userId, amount, 'Admin credit');
      toast.success(`Credited $${amount.toFixed(2)}`);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to credit wallet');
    }
  };

  const filtered = customers.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  );

  const stats = [
    { label: 'Total Customers', value: customers.filter((c) => !c.isBlocked).length },
    { label: 'New This Month', value: customers.filter((c) => {
      const joined = new Date(c.createdAt);
      const now = new Date();
      return joined.getMonth() === now.getMonth() && joined.getFullYear() === now.getFullYear();
    }).length },
    { label: 'Avg. Order Value', value: '$32.80' },
    { label: 'Blocked', value: customers.filter((c) => c.isBlocked).length },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Customers</h1>
          <p className="text-sm text-text-secondary mt-0.5">View and manage customer accounts</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-lg p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-surface-secondary rounded w-24 mb-2" />
                <div className="h-8 bg-surface-secondary rounded w-12" />
              </div>
            </div>
          ))
        ) : (
          stats.map((s) => (
            <div key={s.label} className="bg-surface border border-border rounded-lg p-4">
              <div className="text-sm text-text-secondary">{s.label}</div>
              <div className="text-2xl font-bold text-text-primary mt-1">{s.value}</div>
            </div>
          ))
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-4 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-secondary">
              {['Customer', 'Orders', 'Total Spent', 'Wallet', 'Status', 'Joined', 'Actions'].map((h) => (
                <th key={h} className="text-left text-[13px] font-medium text-text-secondary px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8">
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse h-12 bg-surface-secondary rounded" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-text-tertiary">
                  No customers found
                </td>
              </tr>
            ) : (
              filtered.map((customer) => (
                <tr key={customer._id} onClick={() => router.push(`/dashboard/customers/${customer._id}`)} className="border-t border-border hover:bg-surface-secondary/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-light text-brand flex items-center justify-center text-xs font-bold">
                        {customer.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-text-primary">{customer.name || 'N/A'}</div>
                        <div className="text-[12px] text-text-tertiary">{customer.phone || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary">{customer.orderCount || 0}</td>
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">${(customer.totalSpent || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-text-primary">${(customer.walletBalance || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {customer.isBlocked ? (
                      <span className="inline-flex h-[22px] px-2 rounded-full text-[12px] font-semibold items-center bg-error-light text-error">Blocked</span>
                    ) : (
                      <span className="inline-flex h-[22px] px-2 rounded-full text-[12px] font-semibold items-center bg-success-light text-success">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{new Date(customer.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCreditWallet(customer._id)}
                        className="p-1.5 text-text-secondary hover:text-brand hover:bg-brand-light rounded"
                        title="Credit Wallet"
                      >
                        <CreditCard className="w-4 h-4" />
                      </button>
                      {customer.isBlocked ? (
                        <button
                          onClick={() => handleBlock(customer._id, true)}
                          className="p-1.5 text-success hover:bg-success-light rounded"
                          title="Unblock"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBlock(customer._id, false)}
                          className="p-1.5 text-error hover:bg-error-light rounded"
                          title="Block"
                        >
                          <ShieldOff className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
