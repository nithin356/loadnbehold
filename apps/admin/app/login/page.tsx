'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAdminAuthStore();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone) return;

    setLoading(true);
    try {
      await adminApi.sendOtp(phone);
      toast.success('OTP sent! Check your phone.');
      setStep('otp');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otp) return;

    setLoading(true);
    try {
      const res = await adminApi.verifyOtp(phone, otp);
      const { accessToken, refreshToken, user } = res.data;

      if (user.role !== 'admin') {
        toast.error('Access denied. Admin accounts only.');
        return;
      }

      login(user, accessToken, refreshToken);
      toast.success(`Welcome, ${user.name || 'Admin'}!`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <img
              src="/logo.png"
              alt="LoadNBehold"
              className="w-16 h-16 rounded-2xl shadow-md"
              onError={(e) => {
                const el = e.currentTarget;
                el.style.display = 'none';
                (el.nextElementSibling as HTMLElement)?.style.setProperty('display', 'flex');
              }}
            />
            <div className="w-16 h-16 rounded-2xl bg-brand text-white items-center justify-center text-2xl font-bold absolute inset-0" style={{ display: 'none' }}>
              LNB
            </div>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">Sign in to manage LoadNBehold</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Admin Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+15550001111"
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text-primary placeholder:text-text-tertiary focus:ring-2 focus:ring-brand focus:border-brand outline-none"
                required
              />
              <p className="text-xs text-text-tertiary mt-1.5">US format: +1XXXXXXXXXX</p>
            </div>
            <button
              type="submit"
              disabled={loading || !phone}
              className="w-full py-3 rounded-xl bg-brand text-white font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>

            {/* Dev hint — only in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-3 rounded-lg bg-surface-secondary border border-border">
                <p className="text-xs font-medium text-text-secondary mb-1">Dev Test Accounts:</p>
                <div className="text-xs text-text-tertiary space-y-0.5">
                  <p><span className="font-mono">+15550001111</span> - Super Admin</p>
                  <p><span className="font-mono">+15550002222</span> - Support Staff</p>
                  <p>OTP bypass code: <span className="font-mono font-bold">123456</span></p>
                </div>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Enter OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text-primary text-center text-2xl tracking-[0.5em] font-mono placeholder:text-text-tertiary focus:ring-2 focus:ring-brand focus:border-brand outline-none"
                autoFocus
                required
              />
              <p className="text-xs text-text-tertiary mt-1.5">
                Sent to {phone} &mdash;{' '}
                <button type="button" onClick={() => setStep('phone')} className="text-brand hover:underline">
                  Change number
                </button>
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 rounded-xl bg-brand text-white font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors"
            >
              {loading ? 'Verifying...' : 'Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
