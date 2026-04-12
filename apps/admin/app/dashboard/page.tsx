'use client';

import { useState, useEffect } from 'react';
import {
  ShoppingBag, DollarSign, Truck, AlertCircle, TrendingUp, TrendingDown,
  Users, Ban, Activity, Clock, CreditCard, Wallet, ArrowRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
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

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const formatCurrency = (v: number) => `$${v.toFixed(2)}`;
const formatShortDate = (d: string) => {
  const [, m, day] = d.split('-');
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m)]} ${parseInt(day)}`;
};

export default function DashboardPage() {
  const { accessToken } = useAdminAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, ordersRes, overviewRes] = await Promise.all([
          adminApi.getDashboardStats(accessToken),
          adminApi.getOrders(accessToken, 'limit=5'),
          adminApi.getReport(accessToken, 'overview'),
        ]);

        setStats(statsRes.data);
        setRecentOrders(ordersRes.data || []);
        setOverview(overviewRes.data);
      } catch (err: any) {
        toast.error(err.message || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [accessToken]);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-1">Dashboard</h1>
        <p className="text-sm text-text-secondary mb-6">Welcome back, Admin</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-lg p-5 shadow-sm">
              <div className="animate-pulse">
                <div className="h-4 bg-surface-secondary rounded w-24 mb-3" />
                <div className="h-8 bg-surface-secondary rounded w-16" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-lg p-5 shadow-sm">
              <div className="animate-pulse">
                <div className="h-4 bg-surface-secondary rounded w-32 mb-4" />
                <div className="h-48 bg-surface-secondary rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const orderChange = stats?.orderChangePercent || 0;
  const revenueChange = stats?.revenueChangePercent || 0;

  const statCards = [
    {
      label: 'Orders Today',
      value: stats?.ordersToday || 0,
      change: orderChange !== 0 ? `${Math.abs(orderChange)}%` : null,
      up: orderChange >= 0,
      icon: ShoppingBag,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Revenue Today',
      value: formatCurrency(stats?.revenueToday || 0),
      change: revenueChange !== 0 ? `${Math.abs(revenueChange)}%` : null,
      up: revenueChange >= 0,
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Active Orders',
      value: stats?.activeOrders || 0,
      change: null,
      up: true,
      icon: Activity,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Cancelled Today',
      value: stats?.cancelledToday || 0,
      change: null,
      up: false,
      icon: Ban,
      color: 'bg-red-50 text-red-600',
    },
  ];

  const secondaryStats = [
    { label: 'Total Customers', value: stats?.totalCustomers || 0, icon: Users },
    { label: 'Total Orders', value: stats?.totalOrders || 0, icon: ShoppingBag },
    { label: 'Drivers Online', value: stats?.driversOnline || 0, icon: Truck },
    { label: 'Open Tickets', value: stats?.openTickets || 0, icon: AlertCircle },
  ];

  const dailyRevenue = overview?.dailyRevenue || [];
  const paymentMethods = overview?.paymentMethods || [];
  const topServices = overview?.topServices || [];
  const hourlyDist = overview?.hourlyDistribution || [];

  // Format hourly data
  const hourlyData = hourlyDist.map((h: any) => ({
    hour: h.hour < 12 ? `${h.hour || 12}AM` : `${h.hour === 12 ? 12 : h.hour - 12}PM`,
    orders: h.count,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Dashboard</h1>
          <p className="text-sm text-text-secondary">Real-time overview of your business</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Clock className="w-4 h-4" />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Primary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-surface border border-border rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-text-secondary">{stat.label}</span>
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', stat.color)}>
                <stat.icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </div>
            </div>
            <div className="text-[28px] font-bold text-text-primary">{stat.value}</div>
            {stat.change && (
              <div className={cn('flex items-center gap-1 text-[13px] font-medium mt-1', stat.up ? 'text-success' : 'text-error')}>
                {stat.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {stat.change} vs yesterday
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Secondary Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {secondaryStats.map((stat) => (
          <div key={stat.label} className="bg-surface border border-border rounded-lg px-4 py-3 shadow-sm flex items-center gap-3">
            <stat.icon className="w-4 h-4 text-text-tertiary" strokeWidth={1.75} />
            <div>
              <p className="text-xs text-text-tertiary">{stat.label}</p>
              <p className="text-lg font-semibold text-text-primary">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart - 2 cols */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary">Revenue Trend</h3>
            <span className="text-xs text-text-tertiary">Last 30 days</span>
          </div>
          {dailyRevenue.length === 0 ? (
            <div className="h-56 bg-surface-secondary rounded-lg flex items-center justify-center text-sm text-text-tertiary">
              No revenue data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <AreaChart data={dailyRevenue}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickFormatter={formatShortDate} interval="preserveStartEnd" />
                <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  labelFormatter={formatShortDate}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payment Methods Pie */}
        <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold text-text-primary mb-4">Payment Methods</h3>
          {paymentMethods.length === 0 ? (
            <div className="h-56 bg-surface-secondary rounded-lg flex items-center justify-center text-sm text-text-tertiary">
              No data yet
            </div>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    dataKey="count"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {paymentMethods.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {paymentMethods.map((pm: any, i: number) => (
                  <div key={pm.method} className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="capitalize">{pm.method === 'cod' ? 'COD' : pm.method}</span>
                    <span className="font-medium text-text-primary">({pm.count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Orders by Hour */}
        <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold text-text-primary mb-4">Orders by Hour of Day</h3>
          {hourlyData.length === 0 ? (
            <div className="h-48 bg-surface-secondary rounded-lg flex items-center justify-center text-sm text-text-tertiary">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <BarChart data={hourlyData}>
                <XAxis dataKey="hour" stroke="#9ca3af" fontSize={10} interval={2} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                />
                <Bar dataKey="orders" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Services */}
        <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold text-text-primary mb-4">Top Services</h3>
          {topServices.length === 0 ? (
            <div className="h-48 bg-surface-secondary rounded-lg flex items-center justify-center text-sm text-text-tertiary">
              No data yet
            </div>
          ) : (
            <div className="space-y-4">
              {topServices.map((svc: any, i: number) => {
                const maxRevenue = topServices[0]?.revenue || 1;
                const pct = Math.round((svc.revenue / maxRevenue) * 100);
                return (
                  <div key={svc.service}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-text-primary">{svc.service}</span>
                      <span className="text-sm text-text-secondary">{formatCurrency(svc.revenue)}</span>
                    </div>
                    <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                    </div>
                    <p className="text-xs text-text-tertiary mt-0.5">{svc.orders} orders</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-surface border border-border rounded-lg shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-semibold text-text-primary">Recent Orders</h3>
          <a href="/dashboard/orders" className="text-sm text-brand hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-secondary">
                <th className="text-left text-[13px] font-medium text-text-secondary px-5 py-3">Order #</th>
                <th className="text-left text-[13px] font-medium text-text-secondary px-5 py-3">Customer</th>
                <th className="text-left text-[13px] font-medium text-text-secondary px-5 py-3">Status</th>
                <th className="text-left text-[13px] font-medium text-text-secondary px-5 py-3">Total</th>
                <th className="text-left text-[13px] font-medium text-text-secondary px-5 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-text-tertiary">
                    No recent orders
                  </td>
                </tr>
              ) : (
                recentOrders.map((order: any) => (
                  <tr key={order._id} className="border-b border-border last:border-none hover:bg-surface-secondary transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-text-primary">{order.orderNumber}</td>
                    <td className="px-5 py-3.5 text-sm text-text-primary">{order.customerId?.name || 'N/A'}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center h-[22px] px-2 rounded-full text-[12px] font-semibold', statusColors[order.status] || 'bg-surface-secondary text-text-secondary')}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-text-primary">${order.pricing?.total?.toFixed(2) || '0.00'}</td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">{new Date(order.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
