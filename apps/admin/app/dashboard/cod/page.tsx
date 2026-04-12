'use client';

import { useState, useEffect } from 'react';
import { DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

export default function CodPage() {
  const { accessToken } = useAdminAuthStore();
  const [summary, setSummary] = useState<any>(null);
  const [driverLedger, setDriverLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    fetchData();
  }, [accessToken]);

  const fetchData = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [summaryRes, ledgerRes] = await Promise.all([
        adminApi.getCodDashboard(accessToken),
        adminApi.getCodDriverLedger(accessToken),
      ]);
      setSummary(summaryRes.data || {});
      setDriverLedger(ledgerRes.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch COD data');
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async (driverId: string) => {
    if (!accessToken) return;
    try {
      await adminApi.reconcileDriverCash(accessToken, driverId);
      toast.success('Cash reconciled');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reconcile');
    }
  };

  const summaryCards = [
    { label: 'Total Collected', value: `$${(summary?.totalCollected || 0).toFixed(2)}`, icon: DollarSign, color: 'text-brand bg-brand-light' },
    { label: 'Pending Deposit', value: `$${(summary?.pendingDeposit || 0).toFixed(2)}`, icon: AlertTriangle, color: 'text-warning bg-warning-light' },
    { label: 'Deposited', value: `$${(summary?.deposited || 0).toFixed(2)}`, icon: CheckCircle, color: 'text-success bg-success-light' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-1">COD Management</h1>
      <p className="text-sm text-text-secondary mb-6">Track cash-on-delivery collections and driver deposits</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-lg p-5 shadow-sm">
              <div className="animate-pulse">
                <div className="h-4 bg-surface-secondary rounded w-24 mb-3" />
                <div className="h-8 bg-surface-secondary rounded w-20" />
              </div>
            </div>
          ))
        ) : (
          summaryCards.map((s) => (
            <div key={s.label} className="bg-surface border border-border rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-text-secondary">{s.label}</span>
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', s.color)}>
                  <s.icon className="w-[18px] h-[18px]" />
                </div>
              </div>
              <div className="text-2xl font-bold text-text-primary">{s.value}</div>
            </div>
          ))
        )}
      </div>

      {/* Driver Ledger */}
      <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-text-primary">Driver Cash Ledger</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-surface-secondary">
              {['Driver', 'Total Collected', 'Deposited', 'Pending', 'Last Deposit', 'Actions'].map((h) => (
                <th key={h} className="text-left text-[13px] font-medium text-text-secondary px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8">
                  <div className="flex flex-col gap-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse h-12 bg-surface-secondary rounded" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : driverLedger.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-text-tertiary">
                  No COD data available
                </td>
              </tr>
            ) : (
              driverLedger.map((d) => (
                <tr key={d.driverId} className="border-t border-border">
                  <td className="px-5 py-3.5 text-sm font-medium text-text-primary">{d.driverName || 'N/A'}</td>
                  <td className="px-5 py-3.5 text-sm text-text-primary">${(d.totalCollected || 0).toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-sm text-success">${(d.deposited || 0).toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-sm font-medium text-warning">${(d.pending || 0).toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-sm text-text-secondary">
                    {d.lastDeposit ? new Date(d.lastDeposit).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    {d.pending > 0 && (
                      <button
                        onClick={() => handleReconcile(d.driverId)}
                        className="text-[12px] px-3 py-1 bg-brand text-white rounded font-medium hover:bg-brand/90"
                      >
                        Mark Deposited
                      </button>
                    )}
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
