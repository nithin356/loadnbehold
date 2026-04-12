'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Search, CheckCircle, XCircle, MapPin, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

const statusMap: Record<string, { label: string; color: string }> = {
  approved: { label: 'Approved', color: 'bg-success-light text-success' },
  pending: { label: 'Pending Review', color: 'bg-warning-light text-warning' },
  suspended: { label: 'Suspended', color: 'bg-error-light text-error' },
  rejected: { label: 'Rejected', color: 'bg-error-light text-error' },
};

export default function DriversPage() {
  const router = useRouter();
  const { accessToken } = useAdminAuthStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    fetchDrivers();
  }, [accessToken]);

  const fetchDrivers = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await adminApi.getDrivers(accessToken);
      setDrivers(res.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!accessToken) return;
    try {
      await adminApi.approveDriver(accessToken, id, true);
      toast.success('Driver approved');
      fetchDrivers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve driver');
    }
  };

  const handleReject = async (id: string) => {
    if (!accessToken) return;
    try {
      await adminApi.approveDriver(accessToken, id, false);
      toast.success('Driver rejected');
      fetchDrivers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject driver');
    }
  };

  const handleSuspend = async (id: string) => {
    if (!accessToken) return;
    try {
      await adminApi.suspendDriver(accessToken, id);
      toast.success('Driver suspended');
      fetchDrivers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to suspend driver');
    }
  };

  const filtered = drivers.filter((d) => {
    const matchSearch = !search || d.userId?.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || d.status === filter || (filter === 'online' && d.isOnline);
    return matchSearch && matchFilter;
  });

  const stats = [
    { label: 'Total Drivers', value: drivers.length, color: 'text-brand' },
    { label: 'Online Now', value: drivers.filter((d) => d.isOnline).length, color: 'text-success' },
    { label: 'Pending Approval', value: drivers.filter((d) => d.status === 'pending').length, color: 'text-warning' },
    { label: 'Suspended', value: drivers.filter((d) => d.status === 'suspended').length, color: 'text-error' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Drivers</h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage driver accounts, approvals, and performance</p>
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
              <div className={cn('text-2xl font-bold mt-1', s.color)}>{s.value}</div>
            </div>
          ))
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search drivers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-10 px-3 bg-surface border border-border rounded-lg text-sm text-text-primary"
        >
          <option value="all">All Drivers</option>
          <option value="online">Online</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-secondary">
              {['Driver', 'Status', 'Online', 'Vehicle', 'Rating', 'Deliveries', 'Cash Balance', 'Actions'].map((h) => (
                <th key={h} className="text-left text-[13px] font-medium text-text-secondary px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8">
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse h-12 bg-surface-secondary rounded" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-text-tertiary">
                  No drivers found
                </td>
              </tr>
            ) : (
              filtered.map((driver) => (
                <tr key={driver._id} onClick={() => router.push(`/dashboard/drivers/${driver._id}`)} className="border-t border-border hover:bg-surface-secondary/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold">
                        {driver.userId?.name?.split(' ').map((n: string) => n[0]).join('') || 'D'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-text-primary">{driver.userId?.name || 'N/A'}</div>
                        <div className="text-[12px] text-text-tertiary">{driver.userId?.phone || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex h-[22px] px-2 rounded-full text-[12px] font-semibold items-center', statusMap[driver.status]?.color)}>
                      {statusMap[driver.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-1 text-sm font-medium', driver.isOnline ? 'text-success' : 'text-text-tertiary')}>
                      <span className={cn('w-2 h-2 rounded-full', driver.isOnline ? 'bg-success' : 'bg-text-tertiary')} />
                      {driver.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {driver.vehicle?.type || 'N/A'} {driver.vehicle?.plate ? `· ${driver.vehicle.plate}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                      <span className="font-medium text-text-primary">{driver.metrics?.rating > 0 ? driver.metrics.rating.toFixed(1) : 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary">{driver.metrics?.totalDeliveries || 0}</td>
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">${(driver.cashBalance || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {driver.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(driver._id)}
                            className="p-1.5 text-success hover:bg-success-light rounded"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(driver._id)}
                            className="p-1.5 text-error hover:bg-error-light rounded"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {driver.status === 'approved' && (
                        <button
                          onClick={() => handleSuspend(driver._id)}
                          className="text-[12px] px-2 py-1 text-error hover:bg-error-light rounded font-medium"
                        >
                          Suspend
                        </button>
                      )}
                      {driver.status === 'suspended' && (
                        <button
                          onClick={() => handleApprove(driver._id)}
                          className="text-[12px] px-2 py-1 text-success hover:bg-success-light rounded font-medium"
                        >
                          Reinstate
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
