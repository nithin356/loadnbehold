import React from 'react';

// Stub for web — Stripe native SDK is not available
export function StripeProvider({ children }: { children: React.ReactNode; [key: string]: any }) {
  return children as React.ReactElement;
}

export const useConfirmPayment = () => ({
  confirmPayment: async () => ({ error: { message: 'Stripe is not available on web' } }),
  loading: false,
});
