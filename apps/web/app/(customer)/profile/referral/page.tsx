'use client';

import { useState, useEffect } from 'react';
import { Share2, Copy, Users, DollarSign, ChevronLeft, Check, Clock, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ReferralData {
  code: string;
  referralCount: number;
  bonusPerReferral: number;
  totalEarned: number;
}

interface ReferralHistoryItem {
  name: string;
  phone: string;
  joinedAt: string;
  status: 'completed' | 'pending';
}

export default function ReferralPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, [token]);

  const fetchReferralData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const [codeRes, historyRes]: any[] = await Promise.all([
        api.getReferralCode(token),
        api.getReferralHistory(token),
      ]);
      setReferralData(codeRes.data);
      setHistory(historyRes.data || []);
    } catch (err: any) {
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!referralData?.code) return;

    try {
      await navigator.clipboard.writeText(referralData.code);
      setCopied(true);
      toast.success('Referral code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
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
        <h1 className="text-2xl font-semibold text-text-primary">Refer a Friend</h1>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-brand to-brand/80 rounded-lg p-6 mb-6 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Share2 className="w-6 h-6" />
          <h2 className="text-xl font-semibold">Share the Love!</h2>
        </div>
        <p className="text-sm opacity-90 mb-4">
          Share your code and both you and your friend get <strong>$5 wallet credit</strong> when
          they complete their first order!
        </p>
      </div>

      {/* Referral Code Card */}
      {loading ? (
        <div className="bg-surface border border-border rounded-lg p-6 mb-6 animate-pulse">
          <div className="h-6 bg-surface-secondary rounded w-32 mb-3" />
          <div className="h-12 bg-surface-secondary rounded" />
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg p-6 mb-6">
          <p className="text-sm text-text-tertiary mb-2">Your Referral Code</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 px-4 py-3 bg-background border border-border rounded-lg font-mono text-xl font-bold text-brand tracking-wider">
              {referralData?.code || 'LOADING'}
            </div>
            <button
              onClick={handleCopy}
              className="px-4 py-3 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2 text-text-secondary">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium">Total Referrals</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {loading ? '...' : referralData?.referralCount || 0}
          </p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2 text-text-secondary">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium">Earnings</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {loading ? '...' : `$${(referralData?.totalEarned || 0).toFixed(2)}`}
          </p>
        </div>
      </div>

      {/* Referral History */}
      {history.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4 mb-6">
          <h3 className="font-medium text-text-primary mb-3">Referral History</h3>
          <div className="space-y-3">
            {history.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center">
                    <Users className="w-4 h-4 text-text-tertiary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{item.name}</p>
                    <p className="text-xs text-text-tertiary">{item.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.status === 'completed' ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs font-medium text-green-600">Earned ${referralData?.bonusPerReferral || 5}</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-medium text-amber-600">Pending</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-surface border border-border rounded-lg p-4 mb-6">
        <h3 className="font-medium text-text-primary mb-3">How It Works</h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              1
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Share your code</p>
              <p className="text-xs text-text-secondary">
                Send your referral code to friends and family
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              2
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">They sign up</p>
              <p className="text-xs text-text-secondary">
                Your friend creates an account using your code
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              3
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Both get rewarded</p>
              <p className="text-xs text-text-secondary">
                You both receive $5 wallet credit after their first order
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="p-4 bg-surface-secondary rounded-lg">
        <p className="text-xs text-text-tertiary leading-relaxed">
          <strong className="text-text-secondary">Terms:</strong> Referral credit is added to
          your wallet after the referred user completes their first order. Credit cannot be
          withdrawn as cash. Offer subject to change or cancellation at any time.
        </p>
      </div>
    </div>
  );
}
