'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Auth section error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-8 h-8 text-error" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Something went wrong</h2>
        <p className="text-sm text-text-secondary mb-6">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 h-11 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/login"
            className="flex items-center gap-2 px-5 h-11 border border-border rounded-xl text-sm font-semibold text-text-secondary hover:bg-surface-secondary transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
