'use client';

import { Toaster } from 'sonner';
import { useTheme } from 'next-themes';

export function ThemeToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      position="top-right"
      theme={(theme as 'light' | 'dark') || 'system'}
      toastOptions={{
        className: 'border !border-border !bg-surface !text-text-primary shadow-lg rounded-lg',
      }}
    />
  );
}
