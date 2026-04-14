import { useAuthStore } from './store';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

interface FetchOptions extends RequestInit {
  token?: string;
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  const { refreshToken, login, logout, user } = useAuthStore.getState();
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

async function fetchWithRetry(url: string, init: RequestInit, retries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      // Don't retry client errors (4xx) — only retry network failures and server errors (5xx)
      if (res.ok || res.status < 500) return res;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
    }
  }
  // Unreachable, but satisfies TS
  throw new Error('Request failed after retries');
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

  const res = await fetchWithRetry(`${API_BASE}${endpoint}`, { headers, ...rest });

  // Handle 401 — try token refresh once
  if (res.status === 401 && token) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = tryRefreshToken().finally(() => { isRefreshing = false; });
    }
    const newToken = await refreshPromise;
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      const retryRes = await fetchWithRetry(`${API_BASE}${endpoint}`, { headers, ...rest });
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

export const api = {
  // Auth
  sendOtp: (phone: string) =>
    fetchApi('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),

  verifyOtp: (phone: string, code: string) =>
    fetchApi('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, code }) }),

  refreshToken: (refreshToken: string) =>
    fetchApi('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),

  // Customer
  getProfile: (token: string) =>
    fetchApi('/customer/profile', { token }),

  updateProfile: (token: string, data: Record<string, unknown>) =>
    fetchApi('/customer/profile', { method: 'PUT', token, body: JSON.stringify(data) }),

  addAddress: (token: string, data: Record<string, unknown>) =>
    fetchApi('/customer/addresses', { method: 'POST', token, body: JSON.stringify(data) }),

  getAddresses: (token: string) =>
    fetchApi('/customer/addresses', { token }),

  getNearbyOutlets: (token: string, lat: number, lng: number) =>
    fetchApi(`/customer/nearby-outlets?latitude=${lat}&longitude=${lng}`, { token }),

  getOrderConfig: (token: string) =>
    fetchApi('/customer/order-config', { token }),

  getServices: (token: string) =>
    fetchApi('/customer/services', { token }),

  // Orders
  createOrder: (token: string, data: Record<string, unknown>) =>
    fetchApi('/orders', { method: 'POST', token, body: JSON.stringify(data) }),

  getOrders: (token: string, page = 1, limit = 20) =>
    fetchApi(`/orders?page=${page}&limit=${limit}`, { token }),

  getOrder: (token: string, id: string) =>
    fetchApi(`/orders/${id}`, { token }),

  cancelOrder: (token: string, id: string, data?: { reason?: string; refundMethod?: string }) =>
    fetchApi(`/orders/${id}/cancel`, { method: 'PUT', token, body: JSON.stringify(data || {}) }),

  rateOrder: (token: string, id: string, data: Record<string, unknown>) =>
    fetchApi(`/orders/${id}/rate`, { method: 'POST', token, body: JSON.stringify(data) }),

  getInvoice: (token: string, id: string) =>
    fetchApi(`/orders/${id}/invoice`, { token }),

  getTracking: (token: string, id: string) =>
    fetchApi(`/orders/${id}/track`, { token }),

  reorder: (token: string, id: string) =>
    fetchApi(`/orders/${id}/reorder`, { method: 'POST', token }),

  dispute: (token: string, id: string, reason: string, photos?: string[]) =>
    fetchApi(`/orders/${id}/dispute`, { method: 'POST', token, body: JSON.stringify({ reason, photos }) }),

  // Wallet
  getWalletBalance: (token: string) =>
    fetchApi('/wallet/balance', { token }),

  topUpWallet: (token: string, amount: number, opts?: { savedPaymentMethodId?: string; saveCard?: boolean }) =>
    fetchApi('/wallet/topup', { method: 'POST', token, body: JSON.stringify({ amount, ...opts }) }),

  confirmWalletTopup: (token: string, amount: number, paymentIntentId: string) =>
    fetchApi('/wallet/topup/confirm', { method: 'POST', token, body: JSON.stringify({ amount, paymentIntentId }) }),

  getWalletTransactions: (token: string, page = 1) =>
    fetchApi(`/wallet/transactions?page=${page}`, { token }),

  // Support
  createTicket: (token: string, data: Record<string, unknown>) =>
    fetchApi('/support/tickets', { method: 'POST', token, body: JSON.stringify(data) }),

  getTickets: (token: string) =>
    fetchApi('/support/tickets', { token }),

  getTicketById: (token: string, id: string) =>
    fetchApi(`/support/tickets/${id}`, { token }),

  replyToTicket: (token: string, id: string, message: string, attachments?: string[]) =>
    fetchApi(`/support/tickets/${id}/reply`, { method: 'POST', token, body: JSON.stringify({ message, attachments }) }),

  uploadTicketAttachment: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/support/tickets/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Upload failed');
    return data;
  },

  // FAQ
  getFaq: (token: string) =>
    fetchApi('/support/faq', { token }),

  // Address Management
  deleteAddress: (token: string, id: string) =>
    fetchApi(`/customer/addresses/${id}`, { method: 'DELETE', token }),

  updateAddress: (token: string, id: string, data: Record<string, unknown>) =>
    fetchApi(`/customer/addresses/${id}`, { method: 'PUT', token, body: JSON.stringify(data) }),

  // Banners & Recommendations
  getBanners: (token: string) =>
    fetchApi('/customer/banners', { token }),

  getRecommendations: (token: string) =>
    fetchApi('/customer/recommendations', { token }),

  // Referrals
  getReferralCode: (token: string) =>
    fetchApi('/referral/code', { token }),

  applyReferralCode: (token: string, code: string) =>
    fetchApi('/referral/apply', { method: 'POST', token, body: JSON.stringify({ code }) }),

  getReferralHistory: (token: string) =>
    fetchApi('/referral/history', { token }),

  // Payments
  createPaymentIntent: (token: string, orderId: string, amount: number, opts?: { saveCard?: boolean; savedPaymentMethodId?: string }) =>
    fetchApi('/payments/create-intent', { method: 'POST', token, body: JSON.stringify({ orderId, amount, ...opts }) }),

  confirmPayment: (token: string, paymentIntentId: string, orderId: string, saveCard?: boolean) =>
    fetchApi('/payments/confirm', { method: 'POST', token, body: JSON.stringify({ paymentIntentId, orderId, saveCard }) }),

  // Saved Payment Methods
  getSavedPaymentMethods: (token: string) =>
    fetchApi('/payments/saved-methods', { token }),

  deleteSavedPaymentMethod: (token: string, id: string) =>
    fetchApi(`/payments/saved-methods/${id}`, { method: 'DELETE', token }),

  setDefaultPaymentMethod: (token: string, id: string) =>
    fetchApi(`/payments/saved-methods/${id}/default`, { method: 'PUT', token }),
};
