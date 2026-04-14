'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminUser {
  _id: string;
  phone: string;
  name: string;
  email?: string;
  role: string;
  adminRole?: string;
}

interface AuthState {
  user: AdminUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: AdminUser, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAdminAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      login: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken, isAuthenticated: true });
        document.cookie = 'loadnbehold-admin-auth=1; path=/; max-age=2592000; SameSite=Lax';
      },
      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        document.cookie = 'loadnbehold-admin-auth=; path=/; max-age=0';
      },
    }),
    { name: 'loadnbehold-admin-auth' }
  )
);
