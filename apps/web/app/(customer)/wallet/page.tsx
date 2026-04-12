'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Sparkles, CreditCard, X, Check, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { WALLET_TOPUP_AMOUNTS } from '@loadnbehold/constants';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// ─── Stripe Card Form for Wallet Top-Up ─────────────────────
function WalletStripeForm({ clientSecret, amount, transactionId, token, saveCard, onSaveCardChange, onSuccess, onCancel }: {
  clientSecret: string;
  amount: number;
  transactionId: string;
  token: string;
  saveCard: boolean;
  onSaveCardChange: (v: boolean) => void;
  onSuccess: (balance: number) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    setPaying(true);
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (error) {
        toast.error(error.message || 'Payment failed');
        setPaying(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        const confirmRes: any = await api.confirmWalletTopup(token, amount, transactionId);
        const newBalance = confirmRes.data?.balance;
        onSuccess(newBalance);
        toast.success(`$${amount.toFixed(2)} added to wallet`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 bg-surface border border-border rounded-xl p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <CreditCard className="w-4 h-4 text-brand" />
          Enter Card Details
        </div>
        <button onClick={onCancel} className="text-text-tertiary hover:text-text-primary transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-text-secondary">
        You will be charged ${amount.toFixed(2)}
      </p>
      <div className="bg-background border border-border rounded-lg p-4">
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#e2e8f0',
              '::placeholder': { color: '#64748b' },
            },
            invalid: { color: '#f87171' },
          },
        }} />
      </div>
      <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-surface-secondary transition-colors border border-border bg-surface">
        <input
          type="checkbox"
          checked={saveCard}
          onChange={(e) => onSaveCardChange(e.target.checked)}
          className="w-4 h-4 rounded border-border text-brand focus:ring-brand accent-[var(--brand)]"
        />
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand" />
          <span className="text-sm text-text-primary font-medium">Save card for future use</span>
        </div>
      </label>
      <button
        onClick={handlePay}
        disabled={paying || !stripe}
        className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl shadow-xl shadow-brand/20 hover:shadow-2xl hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
      >
        {paying ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Sparkles className="w-4 h-4" /> Pay ${amount.toFixed(2)}
          </>
        )}
      </button>
    </motion.div>
  );
}

export default function WalletPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [savedMethods, setSavedMethods] = useState<any[]>([]);
  const [selectedSavedMethod, setSelectedSavedMethod] = useState<string | null>(null);
  const [saveCard, setSaveCard] = useState(false);
  const [paymentState, setPaymentState] = useState<{
    clientSecret: string;
    transactionId: string;
    amount: number;
  } | null>(null);
  const [processingTopUp, setProcessingTopUp] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  const loadData = () => {
    if (!token) return;
    Promise.all([
      api.getWalletBalance(token),
      api.getWalletTransactions(token),
      api.getSavedPaymentMethods(token),
    ]).then(([balRes, txRes, methodsRes]: any[]) => {
      setBalance(balRes.data?.balance || 0);
      setTransactions(txRes.data || []);
      const methods = methodsRes.data || [];
      setSavedMethods(methods);
      // Auto-select default
      const defaultMethod = methods.find((m: any) => m.isDefault);
      if (defaultMethod) setSelectedSavedMethod(defaultMethod._id);
    }).finally(() => setLoading(false));
  };

  const handleTopUp = async (amount: number) => {
    if (!token) return;
    if (balance + amount > 10_000) {
      toast.error('Wallet balance cannot exceed $10,000');
      return;
    }

    setProcessingTopUp(true);
    try {
      const intentRes: any = await api.topUpWallet(token, amount, {
        savedPaymentMethodId: selectedSavedMethod || undefined,
        saveCard: !selectedSavedMethod && saveCard ? true : undefined,
      });
      const data = intentRes.data || {};

      if (data.requiresConfirmation && data.clientSecret) {
        if (selectedSavedMethod) {
          // Saved card used — Stripe auto-confirms with the saved payment method
          // The payment intent should already be confirmed or require server confirmation
          const confirmRes: any = await api.confirmWalletTopup(token, amount, data.transactionId || '');
          setBalance(confirmRes.data?.balance || balance + amount);
          toast.success(`$${amount.toFixed(2)} added to wallet`);
          setTopUpAmount(null);
          setCustomAmount('');
          loadData();
        } else {
          // New card — show Stripe card form
          setPaymentState({
            clientSecret: data.clientSecret,
            transactionId: data.transactionId || '',
            amount,
          });
        }
      } else if (data.requiresConfirmation && data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        setBalance(data.balance ?? balance + amount);
        toast.success(`$${amount.toFixed(2)} added to wallet`);
        setTopUpAmount(null);
        setCustomAmount('');
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessingTopUp(false);
    }
  };

  const handlePaymentSuccess = (newBalance: number) => {
    setBalance(newBalance);
    setPaymentState(null);
    setTopUpAmount(null);
    setCustomAmount('');
    loadData();
  };

  const handleDeleteCard = async (id: string) => {
    if (!token) return;
    try {
      await api.deleteSavedPaymentMethod(token, id);
      setSavedMethods((prev) => prev.filter((m) => m._id !== id));
      if (selectedSavedMethod === id) setSelectedSavedMethod(null);
      toast.success('Card removed');
    } catch {
      toast.error('Failed to remove card');
    }
  };

  if (loading) {
    return (
      <div className="py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="skeleton h-36 w-full rounded-2xl" />
            <div className="skeleton h-8 w-40" />
            <div className="skeleton h-12 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-3 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-text-primary">Wallet</h1>
        <p className="text-sm text-text-secondary mt-0.5">Manage your balance and view transactions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column — Balance + Top Up */}
        <div className="lg:col-span-2">
          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white mb-6 relative overflow-hidden shadow-xl"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-sm" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3 text-white/70">
                <Wallet className="w-5 h-5" /> Wallet Balance
              </div>
              <div className="text-4xl font-black tabular-nums">${balance.toFixed(2)}</div>
              <p className="text-sm text-white/60 mt-1">Available for orders</p>
            </div>
          </motion.div>

          {/* Top Up */}
          <section>
            <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand" /> Add Money
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {WALLET_TOPUP_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  disabled={!!paymentState}
                  onClick={() => { setTopUpAmount(amount); setCustomAmount(''); }}
                  className={cn(
                    'h-12 rounded-xl font-bold text-sm transition-all',
                    topUpAmount === amount && !customAmount
                      ? 'bg-brand text-white shadow-brand scale-[1.02]'
                      : 'bg-surface border border-border text-text-primary hover:border-brand hover:bg-brand-light/30',
                    paymentState && 'opacity-40 pointer-events-none'
                  )}
                >
                  ${amount}
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="mt-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary font-bold text-sm">$</span>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="0.01"
                  value={customAmount}
                  disabled={!!paymentState}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    const val = parseFloat(e.target.value);
                    if (val > 0 && val <= 10_000) {
                      setTopUpAmount(val);
                    } else {
                      setTopUpAmount(null);
                    }
                  }}
                  placeholder="Enter custom amount (max $10,000)"
                  className="w-full h-12 pl-7 pr-4 bg-surface-secondary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all disabled:opacity-40"
                />
              </div>
            </div>

            {/* Saved Cards */}
            {savedMethods.length > 0 && !paymentState && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Payment Method</p>
                {savedMethods.map((method: any) => {
                  const isSelected = selectedSavedMethod === method._id;
                  return (
                    <div key={method._id} className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedSavedMethod(isSelected ? null : method._id)}
                        className={cn(
                          'flex-1 flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                          isSelected ? 'border-brand bg-brand-light/30 shadow-sm' : 'border-border bg-surface hover:border-border-hover'
                        )}
                      >
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', isSelected ? 'bg-brand text-white' : 'bg-surface-secondary text-text-tertiary')}>
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary capitalize">{method.card?.brand || method.gateway} ****{method.card?.last4}</p>
                          <p className="text-xs text-text-secondary">Expires {method.card?.expMonth}/{method.card?.expYear}</p>
                        </div>
                        {method.isDefault && (
                          <span className="text-[10px] font-bold text-brand bg-brand-light px-2 py-0.5 rounded-full">DEFAULT</span>
                        )}
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteCard(method._id)}
                        className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-text-tertiary hover:text-error hover:border-error/30 transition-colors flex-shrink-0"
                        title="Remove card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {selectedSavedMethod ? (
                  <p className="text-xs text-text-tertiary">Using saved card. Click again to enter a new card.</p>
                ) : (
                  <p className="text-xs text-text-tertiary">Select a card or enter a new one below.</p>
                )}
              </div>
            )}

            {/* Payment State: Show Stripe Card Form */}
            {paymentState && stripePromise ? (
              <Elements stripe={stripePromise} options={{ clientSecret: paymentState.clientSecret }}>
                <WalletStripeForm
                  clientSecret={paymentState.clientSecret}
                  amount={paymentState.amount}
                  transactionId={paymentState.transactionId}
                  token={token!}
                  saveCard={saveCard}
                  onSaveCardChange={setSaveCard}
                  onSuccess={handlePaymentSuccess}
                  onCancel={() => setPaymentState(null)}
                />
              </Elements>
            ) : paymentState && !stripePromise ? (
              <div className="mt-4 bg-surface border border-border rounded-xl p-4 text-center">
                <p className="text-sm text-text-secondary">Payment gateway not configured. Contact support.</p>
                <button onClick={() => setPaymentState(null)} className="mt-2 text-sm text-brand hover:underline">Cancel</button>
              </div>
            ) : null}

            {/* Add Money Button */}
            {!paymentState && topUpAmount && topUpAmount > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleTopUp(topUpAmount)}
                disabled={processingTopUp}
                className="w-full mt-3 h-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl shadow-xl shadow-brand/20 hover:shadow-2xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {processingTopUp ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {selectedSavedMethod
                      ? `Pay $${topUpAmount.toFixed(2)} with saved card`
                      : `Add $${topUpAmount.toFixed(2)} to Wallet`
                    }
                  </>
                )}
              </motion.button>
            )}
          </section>
        </div>

        {/* Right Column — Transactions */}
        <div className="lg:col-span-3">
          <h3 className="text-base font-bold text-text-primary mb-4">Recent Transactions</h3>
          {transactions.length === 0 ? (
            <div className="text-center py-12 bg-surface border border-border rounded-2xl">
              <Wallet className="w-10 h-10 text-text-tertiary mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-text-secondary">No transactions yet</p>
              <p className="text-xs text-text-tertiary mt-1">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx: any, i: number) => (
                <motion.div
                  key={tx._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between p-4 bg-surface border border-border rounded-xl hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', tx.amount > 0 ? 'bg-success-light' : 'bg-error-light')}>
                      {tx.amount > 0 ? <ArrowDownLeft className="w-4 h-4 text-success" /> : <ArrowUpRight className="w-4 h-4 text-error" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary capitalize">{tx.type}</p>
                      <p className="text-[11px] text-text-tertiary">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={cn('font-bold tabular-nums', tx.amount > 0 ? 'text-success' : 'text-error')}>
                    {tx.amount > 0 ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
