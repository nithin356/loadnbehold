import { Platform } from 'react-native';
import { useAuthStore } from './store';

const ENV_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';
// On web, always use localhost (10.0.2.2 is Android emulator only)
const API_BASE = Platform.OS === 'web' ? 'http://localhost:5001/api/v1' : ENV_URL;

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const json = await res.json();

  if (!res.ok) {
    // Try token refresh on 401
    if (res.status === 401 && useAuthStore.getState().refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return request<T>(path, options);
      }
    }
    const details = json.error?.details;
    let msg = json.error?.message || 'Request failed';
    if (details && typeof details === 'object') {
      const fields = Object.entries(details).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ');
      if (fields) msg += ` (${fields})`;
    }
    throw new Error(msg);
  }

  return json.data;
}

async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      logout();
      return false;
    }

    const json = await res.json();
    setTokens(json.data.accessToken, json.data.refreshToken);
    return true;
  } catch {
    logout();
    return false;
  }
}

// ─── Auth ──────────────────────────────────────
export const authApi = {
  sendOtp: (phone: string) =>
    request<null>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, code: string) =>
    request<{
      accessToken: string;
      refreshToken: string;
      user: { _id: string; phone: string; name: string; role: string; isNewUser: boolean };
    }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),

  logout: () => request<null>('/auth/logout', { method: 'POST' }),
};

// ─── Customer ──────────────────────────────────
export const customerApi = {
  getProfile: () => request<any>('/customer/profile'),

  updateProfile: (data: { name?: string; email?: string }) =>
    request<any>('/customer/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getAddresses: () => request<any[]>('/customer/addresses'),

  addAddress: (address: any) =>
    request<any>('/customer/addresses', {
      method: 'POST',
      body: JSON.stringify(address),
    }),

  deleteAddress: (id: string) =>
    request<null>(`/customer/addresses/${id}`, { method: 'DELETE' }),

  getNearbyOutlets: (lat: number, lng: number) =>
    request<any[]>(`/customer/nearby-outlets?lat=${lat}&lng=${lng}`),

  getBanners: () =>
    request<any[]>('/customer/banners'),

  getServices: () =>
    request<any[]>('/customer/services'),

  getOrderConfig: () =>
    request<any>('/customer/order-config'),

  registerPushToken: (pushToken: string) =>
    request<null>('/customer/push-token', {
      method: 'PUT',
      body: JSON.stringify({ pushToken }),
    }),
};

// ─── Orders ────────────────────────────────────
export const ordersApi = {
  create: (data: any) =>
    request<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (page = 1, limit = 20) =>
    request<any>(`/orders?page=${page}&limit=${limit}`),

  getById: (id: string) => request<any>(`/orders/${id}`),

  cancel: (id: string, reason?: string, refundMethod?: 'wallet' | 'original_payment') =>
    request<any>(`/orders/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason, refundMethod }),
    }),

  rate: (id: string, service: number, driver: number, review?: string) =>
    request<any>(`/orders/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ service, driver, review }),
    }),

  track: (id: string) => request<any>(`/orders/${id}/track`),

  reorder: (id: string) =>
    request<any>(`/orders/${id}/reorder`, { method: 'POST' }),

  dispute: (id: string, reason: string, photos?: string[]) =>
    request<any>(`/orders/${id}/dispute`, {
      method: 'POST',
      body: JSON.stringify({ reason, photos }),
    }),

  getInvoice: (id: string) => request<any>(`/orders/${id}/invoice`),
};

// ─── Wallet ────────────────────────────────────
export const walletApi = {
  getBalance: () => request<{ balance: number }>('/wallet/balance'),

  topup: (amount: number, opts?: { savedPaymentMethodId?: string; saveCard?: boolean }) =>
    request<{
      balance?: number;
      clientSecret?: string;
      approvalUrl?: string;
      gateway?: string;
      transactionId?: string;
      amount: number;
      requiresConfirmation: boolean;
    }>('/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ amount, ...opts }),
    }),

  confirmTopup: (amount: number, paymentIntentId: string) =>
    request<{ balance: number }>('/wallet/topup/confirm', {
      method: 'POST',
      body: JSON.stringify({ amount, paymentIntentId }),
    }),

  transactions: (page = 1) =>
    request<any>(`/wallet/transactions?page=${page}`),
};

// ─── Payments ─────────────────────────────────
export const paymentApi = {
  getSavedMethods: () =>
    request<any[]>('/payments/saved-methods'),

  deleteSavedMethod: (id: string) =>
    request<null>(`/payments/saved-methods/${id}`, { method: 'DELETE' }),

  setDefaultMethod: (id: string) =>
    request<null>(`/payments/saved-methods/${id}/default`, { method: 'PUT' }),
};

// ─── Support ───────────────────────────────────
export const supportApi = {
  createTicket: (data: { subject: string; category: string; message: string; orderId?: string }) =>
    request<any>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTickets: () => request<any[]>('/support/tickets'),

  getTicket: (id: string) => request<any>(`/support/tickets/${id}`),

  reply: (id: string, message: string) =>
    request<any>(`/support/tickets/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
};

// ─── Driver ───────────────────────────────────
export const driverApi = {
  register: (data: { name: string; phone: string; email?: string; vehicle: { type: string; make: string; model: string; plate: string; color: string } }) =>
    request<any>('/driver/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getProfile: () => request<any>('/driver/profile'),

  toggleStatus: () =>
    request<any>('/driver/status', { method: 'PUT' }),

  updateLocation: (location: { type: string; coordinates: [number, number] }) =>
    request<any>('/driver/location', {
      method: 'PUT',
      body: JSON.stringify({ location }),
    }),

  getOrders: () => request<any[]>('/driver/orders'),

  getCompletedOrders: (page = 1) =>
    request<any[]>(`/driver/orders/completed?page=${page}`),

  acceptOrder: (id: string) =>
    request<any>(`/driver/orders/${id}/accept`, { method: 'PUT' }),

  rejectOrder: (id: string) =>
    request<any>(`/driver/orders/${id}/reject`, { method: 'PUT' }),

  updateOrderStatus: (id: string, status: string, note?: string) =>
    request<any>(`/driver/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, note }),
    }),

  getEarnings: () => request<any>('/driver/earnings'),

  getTaxSummary: (year?: number) =>
    request<any>(`/driver/earnings/tax-summary${year ? `?year=${year}` : ''}`),

  collectCod: (orderId: string, amount: number) =>
    request<any>('/driver/cod/collect', {
      method: 'POST',
      body: JSON.stringify({ orderId, amount }),
    }),

  depositCash: (amount: number) =>
    request<any>('/driver/cod/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  uploadProof: (orderId: string, imageUri: string, type: 'pickup' | 'delivery') => {
    const formData = new FormData();
    formData.append('type', type);
    formData.append('image', {
      uri: imageUri,
      name: `proof_${type}.jpg`,
      type: 'image/jpeg',
    } as any);
    const token = useAuthStore.getState().accessToken;
    return fetch(`${API_BASE}/driver/orders/${orderId}/proof`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    }).then(async (res) => {
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Upload failed');
      return json.data;
    });
  },

  verifyOtp: (orderId: string, otp: string) =>
    request<any>(`/driver/orders/${orderId}/verify-otp`, {
      method: 'POST',
      body: JSON.stringify({ otp }),
    }),
};
