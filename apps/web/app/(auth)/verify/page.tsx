'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const login = useAuthStore((s) => s.login);

  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (newOtp.every((d) => d) && newOtp.join('').length === 6) handleVerify(newOtp.join(''));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      const digits = text.split('');
      setOtp(digits);
      inputRefs.current[5]?.focus();
      handleVerify(text);
    }
  };

  const handleVerify = async (code: string) => {
    setLoading(true);
    try {
      const result: any = await api.verifyOtp(phone, code);
      login(result.data.user, result.data.accessToken, result.data.refreshToken);
      toast.success('Welcome to LoadNBehold!');
      router.push('/home');
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP');
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.sendOtp(phone);
      setCountdown(60);
      toast.success('OTP resent');
    } catch {
      toast.error('Failed to resend OTP');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background px-4">
      {/* Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-sm"
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Security Badge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="flex items-center justify-center mb-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-xl animate-glow">
            <Shield className="w-7 h-7 text-white" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-black tracking-tight text-text-primary mb-1">Verify your number</h1>
          <p className="text-sm text-text-secondary">
            Enter the 6-digit code sent to <span className="font-semibold text-text-primary">{phone}</span>
          </p>
        </motion.div>

        {/* OTP Inputs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface border border-border rounded-2xl p-6 shadow-lg mb-6"
        >
          <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-bold bg-surface-secondary border-2 border-border rounded-xl focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none transition-all text-text-primary"
              />
            ))}
          </div>

          {/* Countdown / Resend */}
          <div className="text-center text-sm text-text-secondary mb-6">
            {countdown > 0 ? (
              <span>Resend code in <span className="font-semibold text-brand tabular-nums">0:{countdown.toString().padStart(2, '0')}</span></span>
            ) : (
              <button onClick={handleResend} className="text-brand font-medium hover:underline">
                Resend code
              </button>
            )}
          </div>

          <button
            onClick={() => handleVerify(otp.join(''))}
            disabled={loading || otp.some((d) => !d)}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-brand/20 transition-all hover:shadow-xl hover:shadow-brand/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Verify & Continue'
            )}
          </button>
        </motion.div>

        <p className="text-[11px] text-text-tertiary text-center leading-relaxed">
          Didn't receive it? Check your SMS inbox or try resending.
          <br />Standard messaging rates may apply.
        </p>
      </motion.div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <VerifyForm />
    </Suspense>
  );
}
