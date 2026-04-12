import { useAdminAuthStore } from './store';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

interface FetchOptions extends RequestInit {
  token?: string;
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  const { refreshToken, login, logout, user } = useAdminAuthStore.getState();
  if (!refreshToken) { logout(); return null; }

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();
    if (!res.ok || !data.data?.accessToken) { logout(); return null; }

    const { accessToken: newAccess, refreshToken: newRefresh } = data.data;
    login(user!, newAccess, newRefresh || refreshToken);
    return newAccess;
  } catch {
    logout();
    return null;
  }
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders as Record<string, string>,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, { headers, ...rest });

  // Handle 401 — try token refresh once
  if (res.status === 401 && token) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = tryRefreshToken().finally(() => { isRefreshing = false; });
    }
    const newToken = await refreshPromise;
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      const retryRes = await fetch(`${API_BASE}${endpoint}`, { headers, ...rest });
      const retryData = await retryRes.json();
      if (!retryRes.ok) throw new Error(retryData.error?.message || 'Something went wrong');
      return retryData;
    }
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || 'Something went wrong');
  }

  return data;
}

export const adminApi = {
  // Auth
  sendOtp: (phone: string) =>
    fetchApi<any>('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),

  verifyOtp: (phone: string, code: string) =>
    fetchApi<any>('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, code }) }),

  // Dashboard
  getDashboardStats: (token: string) =>
    fetchApi<any>('/admin/dashboard', { token }),

  // Orders
  getOrders: (token: string, params = '') =>
    fetchApi<any>(`/admin/orders${params ? '?' + params : ''}`, { token }),

  getOrderById: (token: string, id: string) =>
    fetchApi<any>(`/admin/orders/${id}`, { token }),

  updateOrder: (token: string, id: string, data: Record<string, unknown>) =>
    fetchApi<any>(`/admin/orders/${id}`, { method: 'PUT', token, body: JSON.stringify(data) }),

  assignDriverToOrder: (token: string, orderId: string, driverId: string) =>
    fetchApi<any>(`/admin/orders/${orderId}/assign-driver`, { method: 'PUT', token, body: JSON.stringify({ driverId }) }),

  adjustOrderPrice: (token: string, orderId: string, data: Record<string, unknown>) =>
    fetchApi<any>(`/admin/orders/${orderId}/adjust-price`, { method: 'PUT', token, body: JSON.stringify(data) }),

  // Drivers
  getDrivers: (token: string) =>
    fetchApi<any>('/admin/drivers', { token }),

  getDriverById: (token: string, id: string) =>
    fetchApi<any>(`/admin/drivers/${id}`, { token }),

  approveDriver: (token: string, id: string, approve: boolean) =>
    fetchApi<any>(`/admin/drivers/${id}/approve`, { method: 'PUT', token, body: JSON.stringify({ approve }) }),

  // Customers
  getCustomers: (token: string, page = 1) =>
    fetchApi<any>(`/admin/customers?page=${page}`, { token }),

  getCustomerById: (token: string, id: string) =>
    fetchApi<any>(`/admin/customers/${id}`, { token }),

  // Outlets
  getOutlets: (token: string) =>
    fetchApi<any>('/admin/outlets', { token }),

  createOutlet: (token: string, data: Record<string, unknown>) =>
    fetchApi<any>('/admin/outlets', { method: 'POST', token, body: JSON.stringify(data) }),

  // Offers
  getOffers: (token: string) =>
    fetchApi<any>('/admin/offers', { token }),

  // Banners
  getBanners: (token: string) =>
    fetchApi<any>('/admin/banners', { token }),

  // Services
  getServices: (token: string) =>
    fetchApi<any>('/admin/services', { token }),

  createService: (token: string, data: Record<string, unknown>) =>
    fetchApi<any>('/admin/services', { method: 'POST', token, body: JSON.stringify(data) }),

  updateService: (token: string, id: string, data: Record<string, unknown>) =>
    fetchApi<any>(`/admin/services/${id}`, { method: 'PUT', token, body: JSON.stringify(data) }),

  deleteService: (token: string, id: string) =>
    fetchApi<any>(`/admin/services/${id}`, { method: 'DELETE', token }),

  seedServices: (token: string) =>
    fetchApi<any>('/admin/services/seed', { method: 'POST', token }),

  // Config
  getConfig: (token: string) =>
    fetchApi<any>('/admin/config', { token }),

  updateConfig: (token: string, data: Record<string, unknown>) =>
    fetchApi<any>('/admin/config', { method: 'PUT', token, body: JSON.stringify(data) }),

  // COD
  getCodDashboard: (token: string) =>
    fetchApi<any>('/admin/cod/dashboard', { token }),

  // Reports
  getReport: (token: string, type: string, params = '') =>
    fetchApi<any>(`/admin/reports/${type}${params ? '?' + params : ''}`, { token }),

  // Support
  getSupportTickets: (token: string) =>
    fetchApi<any>('/admin/support/tickets', { token }),

  // Payment Health
  getPaymentHealth: (token: string) =>
    fetchApi<any>('/payments/health', { token }),

  // Audit Logs
  getAuditLogs: (token: string) =>
    fetchApi<any>('/admin/audit-logs', { token }),

  // Missing methods based on server routes
  suspendDriver: (token: string, id: string) =>
    fetchApi<any>(`/admin/drivers/${id}/suspend`, { method: 'PUT', token }),

  blockCustomer: (token: string, id: string, blocked: boolean) =>
    fetchApi<any>(`/admin/customers/${id}/block`, { method: 'PUT', token, body: JSON.stringify({ blocked }) }),

  creditCustomer: (token: string, userId: string, amount: number, reason: string) =>
    fetchApi<any>(`/admin/wallet/${userId}/credit`, { method: 'POST', token, body: JSON.stringify({ amount, reason }) }),

  createOffer: (token: string, data: Record<string, unknown>) =>
    fetchApi<any>('/admin/offers', { method: 'POST', token, body: JSON.stringify(data) }),

  updateOffer: (token: string, id: string, data: Record<string, unknown>) =>
    fetchApi<any>(`/admin/offers/${id}`, { method: 'PUT', token, body: JSON.stringify(data) }),

  deleteOffer: (token: string, id: string) =>
    fetchApi<any>(`/admin/offers/${id}`, { method: 'DELETE', token }),

  createBanner: (token: string, data: Record<string, unknown>) =>
    fetchApi<any>('/admin/banners', { method: 'POST', token, body: JSON.stringify(data) }),

  updateBanner: (token: string, id: string, data: Record<string, unknown>) =>
    fetchApi<any>(`/admin/banners/${id}`, { method: 'PUT', token, body: JSON.stringify(data) }),

  deleteBanner: (token: string, id: string) =>
    fetchApi<any>(`/admin/banners/${id}`, { method: 'DELETE', token }),

  sendNotification: (token: string, data: Record<string, unknown>) =>
    fetchApi<any>('/admin/notifications/send', { method: 'POST', token, body: JSON.stringify(data) }),

  getNotificationHistory: (token: string, page = 1) =>
    fetchApi<any>(`/admin/notifications/history?page=${page}`, { token }),

  getCodDriverLedger: (token: string) =>
    fetchApi<any>('/admin/cod/drivers', { token }),

  reconcileDriverCash: (token: string, driverId: string) =>
    fetchApi<any>(`/admin/cod/drivers/${driverId}/reconcile`, { method: 'PUT', token }),

  resolveTicket: (token: string, id: string, resolution: string) =>
    fetchApi<any>(`/admin/support/tickets/${id}/resolve`, { method: 'PUT', token, body: JSON.stringify({ resolution }) }),

  assignTicket: (token: string, id: string, staffId: string) =>
    fetchApi<any>(`/admin/support/tickets/${id}/assign`, { method: 'PUT', token, body: JSON.stringify({ staffId }) }),

  getTicketById: (token: string, id: string) =>
    fetchApi<any>(`/admin/support/tickets/${id}`, { token }),

  updateTicketStatus: (token: string, id: string, status: string, note?: string) =>
    fetchApi<any>(`/admin/support/tickets/${id}/status`, { method: 'PUT', token, body: JSON.stringify({ status, note }) }),

  addTicketComment: (token: string, id: string, message: string, isInternal?: boolean) =>
    fetchApi<any>(`/admin/support/tickets/${id}/comment`, { method: 'POST', token, body: JSON.stringify({ message, isInternal }) }),

  updateTicketPriority: (token: string, id: string, priority: string) =>
    fetchApi<any>(`/admin/support/tickets/${id}/priority`, { method: 'PUT', token, body: JSON.stringify({ priority }) }),

  deleteOutlet: (token: string, id: string) =>
    fetchApi<any>(`/admin/outlets/${id}`, { method: 'DELETE', token }),

  updateOutlet: (token: string, id: string, data: Record<string, unknown>) =>
    fetchApi<any>(`/admin/outlets/${id}`, { method: 'PUT', token, body: JSON.stringify(data) }),

  refundOrder: (token: string, id: string, data: Record<string, unknown>) =>
    fetchApi<any>(`/admin/orders/${id}/refund`, { method: 'POST', token, body: JSON.stringify(data) }),
};
