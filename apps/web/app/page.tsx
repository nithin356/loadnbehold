'use client';

import { useAuthStore } from '@/lib/store';
import { redirect } from 'next/navigation';

export default function RootPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    redirect('/home');
  } else {
    redirect('/login');
  }
}
