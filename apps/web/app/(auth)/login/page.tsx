'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Phone, ArrowRight, Sparkles, Shield, Clock, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const phoneSchema = z.object({
  phone: z.string().regex(/^\+1\d{10}$/, 'Enter valid US phone: +1XXXXXXXXXX'),
});

const features = [
  { icon: Clock, label: 'Same-day pickup' },
  { icon: Truck, label: 'Free delivery $50+' },
  { icon: Shield, label: 'Insured garments' },
  { icon: Sparkles, label: 'Premium cleaning' },
];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '+1' },
  });

  const onSubmit = async (data: { phone: string }) => {
    setLoading(true);
    try {
      await api.sendOtp(data.phone);
      toast.success('OTP sent to your phone');
      router.push(`/verify?phone=${encodeURIComponent(data.phone)}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-background">
      {/* Gradient Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-sm mx-auto px-5"
      >
        {/* Brand Section */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white text-2xl font-black mb-5 shadow-xl animate-glow"
          >
            LNB
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-3xl font-black tracking-tight text-text-primary mb-1"
          >
            Load<span className="gradient-text">N</span>Behold
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-base text-text-secondary"
          >
            Fresh clothes, delivered to your door
          </motion.p>
        </div>

        {/* Feature Pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="flex flex-wrap justify-center gap-2 mb-8"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-full text-xs font-medium text-text-secondary"
            >
              <f.icon className="w-3 h-3 text-brand" strokeWidth={2} />
              {f.label}
            </motion.div>
          ))}
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="bg-surface border border-border rounded-2xl p-6 shadow-lg"
        >
          <h2 className="text-lg font-bold text-text-primary mb-1">Welcome back</h2>
          <p className="text-sm text-text-secondary mb-5">Enter your phone to continue</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-text-tertiary" />
                  <div className="w-px h-4 bg-border" />
                </div>
                <input
                  {...register('phone')}
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  className="w-full h-12 pl-14 pr-4 bg-surface-secondary border border-border rounded-xl text-base text-text-primary placeholder:text-text-tertiary transition-all hover:border-border-hover focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-error mt-1.5 ml-1">{errors.phone.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-brand/20 transition-all hover:shadow-xl hover:shadow-brand/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Get Started <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          {/* Social login buttons removed — requires OAuth provider setup (Google/Apple API keys) */}
        </motion.div>

        {/* Terms */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-[11px] text-text-tertiary text-center mt-6 leading-relaxed"
        >
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-brand hover:underline">Terms of Service</a>
          {' '}&{' '}
          <a href="/privacy" className="text-brand hover:underline">Privacy Policy</a>
        </motion.p>
      </motion.div>
    </div>
  );
}
