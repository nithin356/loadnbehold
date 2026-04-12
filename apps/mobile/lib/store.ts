import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

// ─── Auth Store ────────────────────────────────
interface AuthState {
  user: {
    _id: string;
    phone: string;
    name: string;
    email?: string;
    role: string;
  } | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthState['user']) => void;
  setTokens: (access: string, refresh: string) => void;
  login: (user: AuthState['user'], accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user }),

  setTokens: (accessToken, refreshToken) => {
    SecureStore.setItemAsync('accessToken', accessToken);
    SecureStore.setItemAsync('refreshToken', refreshToken);
    set({ accessToken, refreshToken });
  },

  login: (user, accessToken, refreshToken) => {
    SecureStore.setItemAsync('accessToken', accessToken);
    SecureStore.setItemAsync('refreshToken', refreshToken);
    SecureStore.setItemAsync('user', JSON.stringify(user));
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },

  logout: () => {
    SecureStore.deleteItemAsync('accessToken');
    SecureStore.deleteItemAsync('refreshToken');
    SecureStore.deleteItemAsync('user');
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  setLoading: (isLoading) => set({ isLoading }),

  hydrate: async () => {
    try {
      const [accessToken, refreshToken, userStr] = await Promise.all([
        SecureStore.getItemAsync('accessToken'),
        SecureStore.getItemAsync('refreshToken'),
        SecureStore.getItemAsync('user'),
      ]);

      if (accessToken && refreshToken && userStr) {
        const user = JSON.parse(userStr);
        set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));

// ─── Order Cart Store ──────────────────────────
interface CartItem {
  service: string;
  label: string;
  quantity: number;
  unitPrice: number;
}

interface CartState {
  items: CartItem[];
  pickupDate: string | null;
  pickupSlot: string | null;
  deliveryDate: string | null;
  deliverySlot: string | null;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    coordinates?: [number, number];
    instructions?: string;
  } | null;
  paymentMethod: 'online' | 'wallet' | 'cod';
  promoCode: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (service: string) => void;
  updateQuantity: (service: string, qty: number) => void;
  setSchedule: (pickup: { date: string; slot: string }, delivery: { date: string; slot: string }) => void;
  setAddress: (addr: CartState['address']) => void;
  setPaymentMethod: (method: CartState['paymentMethod']) => void;
  setPromoCode: (code: string | null) => void;
  clearCart: () => void;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  pickupDate: null,
  pickupSlot: null,
  deliveryDate: null,
  deliverySlot: null,
  address: null,
  paymentMethod: 'online',
  promoCode: null,

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.service === item.service);
      if (existing) {
        return { items: state.items.map((i) => (i.service === item.service ? { ...i, quantity: i.quantity + 1 } : i)) };
      }
      return { items: [...state.items, item] };
    }),

  removeItem: (service) =>
    set((state) => ({ items: state.items.filter((i) => i.service !== service) })),

  updateQuantity: (service, qty) =>
    set((state) => ({
      items: qty <= 0
        ? state.items.filter((i) => i.service !== service)
        : state.items.map((i) => (i.service === service ? { ...i, quantity: qty } : i)),
    })),

  setSchedule: (pickup, delivery) =>
    set({
      pickupDate: pickup.date,
      pickupSlot: pickup.slot,
      deliveryDate: delivery.date,
      deliverySlot: delivery.slot,
    }),

  setAddress: (address) => set({ address }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setPromoCode: (promoCode) => set({ promoCode }),

  clearCart: () =>
    set({
      items: [],
      pickupDate: null,
      pickupSlot: null,
      deliveryDate: null,
      deliverySlot: null,
      address: null,
      paymentMethod: 'online',
      promoCode: null,
    }),

  getSubtotal: () => get().items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
}));
