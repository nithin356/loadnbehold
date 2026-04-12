'use client';

import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="bg-error-light rounded-full p-4 mb-4">
        <AlertTriangle className="w-8 h-8 text-error" />
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-2">Something went wrong</h2>
      <p className="text-sm text-text-secondary mb-6 text-center max-w-md">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors"
        >
          Try Again
        </button>
        <a
          href="/dashboard"
          className="px-4 py-2 bg-surface border border-border text-text-primary rounded-lg text-sm font-medium hover:bg-surface-secondary transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
