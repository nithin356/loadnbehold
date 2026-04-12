import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  _id: string;
  phone: string;
  name: string;
  email?: string;
  role: string;
  preferences?: {
    notifications?: {
      push?: boolean;
      sms?: boolean;
      email?: boolean;
    };
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      login: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
      updateUser: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),
    }),
    { name: 'loadnbehold-auth' }
  )
);

interface SavedAddress {
  _id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  location: { type: 'Point'; coordinates: [number, number] };
}

interface LocationState {
  selectedAddress: SavedAddress | null;
  currentCoords: { lat: number; lng: number } | null;
  serviceable: boolean | null; // null = not checked yet
  nearestOutlet: { name: string; distance: number } | null;
  setSelectedAddress: (addr: SavedAddress | null) => void;
  setCurrentCoords: (coords: { lat: number; lng: number } | null) => void;
  setServiceability: (serviceable: boolean, outlet?: { name: string; distance: number } | null) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      selectedAddress: null,
      currentCoords: null,
      serviceable: null,
      nearestOutlet: null,
      setSelectedAddress: (addr) => set({ selectedAddress: addr }),
      setCurrentCoords: (coords) => set({ currentCoords: coords }),
      setServiceability: (serviceable, outlet) => set({ serviceable, nearestOutlet: outlet || null }),
    }),
    { name: 'loadnbehold-location' }
  )
);

interface AppState {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'loadnbehold-app' }
  )
);
