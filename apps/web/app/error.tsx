'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-error-light flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-text-primary mb-2">Something went wrong</h1>
        <p className="text-sm text-text-secondary mb-6">
          An unexpected error occurred. Please try again or contact support if the issue persists.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-brand text-white font-bold rounded-xl hover:bg-brand-hover transition-colors"
          >
            Try Again
          </button>
          <a
            href="/"
            className="px-6 py-2.5 border border-border text-text-primary font-bold rounded-xl hover:bg-surface-secondary transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
