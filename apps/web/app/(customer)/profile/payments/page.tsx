'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Wallet, DollarSign, ShieldCheck, ChevronLeft, Trash2, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function PaymentsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedMethods, setSavedMethods] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBalance();
    fetchSavedMethods();
  }, [token]);

  const fetchBalance = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response: any = await api.getWalletBalance(token);
      setBalance(response.data?.balance || 0);
    } catch (err: any) {
      toast.error('Failed to load wallet balance');
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedMethods = async () => {
    if (!token) return;
    try {
      const res: any = await api.getSavedPaymentMethods(token);
      setSavedMethods(res.data || []);
    } catch {
      // Silent fail
    }
  };

  const handleDeleteMethod = async (id: string) => {
    if (!token) return;
    setDeletingId(id);
    try {
      await api.deleteSavedPaymentMethod(token, id);
      setSavedMethods((prev) => prev.filter((m) => m._id !== id));
      toast.success('Card removed');
    } catch {
      toast.error('Failed to remove card');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!token) return;
    try {
      await api.setDefaultPaymentMethod(token, id);
      setSavedMethods((prev) =>
        prev.map((m) => ({ ...m, isDefault: m._id === id }))
      );
      toast.success('Default card updated');
    } catch {
      toast.error('Failed to update default');
    }
  };

  return (
    <div className="py-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-surface-secondary rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <h1 className="text-2xl font-semibold text-text-primary">Payment Methods</h1>
      </div>

      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-br from-brand to-brand/80 rounded-lg p-6 mb-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-5 h-5" />
          <span className="text-sm font-medium opacity-90">Wallet Balance</span>
        </div>
        {loading ? (
          <div className="h-10 bg-white/20 rounded animate-pulse w-32" />
        ) : (
          <p className="text-3xl font-bold">${balance?.toFixed(2) || '0.00'}</p>
        )}
        <Link
          href="/wallet"
          className="inline-flex items-center gap-1 mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
        >
          <DollarSign className="w-4 h-4" />
          Top Up Wallet
        </Link>
      </div>

      {/* Security Notice */}
      <div className="bg-surface border border-border rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-success" />
          </div>
          <div>
            <h3 className="font-medium text-text-primary mb-1">Secure Payments</h3>
            <p className="text-sm text-text-secondary">
              Cards are processed securely via our payment partners (Stripe, Square, PayPal). Your
              card details are never stored on our servers &mdash; only a secure token is saved for
              future payments.
            </p>
          </div>
        </div>
      </div>

      {/* Saved Cards */}
      {savedMethods.length > 0 && (
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-medium text-text-tertiary uppercase tracking-wider">
            Saved Cards
          </h3>
          {savedMethods.map((method: any) => (
            <div key={method._id} className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-text-primary capitalize">
                      {method.card?.brand || 'Card'} ****{method.card?.last4}
                    </p>
                    {method.isDefault && (
                      <span className="text-[10px] font-bold text-brand bg-brand-light px-2 py-0.5 rounded-full">DEFAULT</span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary">
                    Expires {method.card?.expMonth}/{method.card?.expYear} &middot; via {method.gateway}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {!method.isDefault && (
                    <button
                      onClick={() => handleSetDefault(method._id)}
                      title="Set as default"
                      className="p-2 rounded-lg hover:bg-surface-secondary text-text-tertiary hover:text-brand transition-colors"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteMethod(method._id)}
                    disabled={deletingId === method._id}
                    title="Remove card"
                    className="p-2 rounded-lg hover:bg-surface-secondary text-text-tertiary hover:text-error transition-colors disabled:opacity-50"
                  >
                    {deletingId === method._id ? (
                      <div className="w-4 h-4 border-2 border-error border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Methods */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-text-tertiary uppercase tracking-wider">
          Accepted Methods
        </h3>

        {/* Card Payment */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-text-primary">Credit / Debit Card</p>
              <p className="text-sm text-text-secondary">Visa, Mastercard, Amex</p>
            </div>
          </div>
          <p className="text-xs text-text-tertiary mt-3 pl-[52px]">
            Add your card details securely at checkout. Cards are processed via Stripe.
          </p>
        </div>

        {/* Wallet Balance */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center">
              <Wallet className="w-5 h-5 text-brand" />
            </div>
            <div>
              <p className="font-medium text-text-primary">Wallet Balance</p>
              <p className="text-sm text-text-secondary">
                Current balance: ${balance?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
          <p className="text-xs text-text-tertiary mt-3 pl-[52px]">
            Top up your wallet and pay instantly without entering card details every time.
          </p>
        </div>

        {/* Cash on Delivery */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-text-primary">Cash on Delivery</p>
              <p className="text-sm text-text-secondary">Pay when your laundry is delivered</p>
            </div>
          </div>
          <p className="text-xs text-text-tertiary mt-3 pl-[52px]">
            Pay in cash when the driver delivers your fresh laundry. Available in select areas.
          </p>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-6 p-4 bg-surface-secondary rounded-lg">
        <p className="text-xs text-text-tertiary leading-relaxed">
          <strong className="text-text-secondary">Note:</strong> Payment is collected after your
          laundry is processed. You'll receive a detailed breakdown of charges before payment is
          collected.
        </p>
      </div>
    </div>
  );
}
