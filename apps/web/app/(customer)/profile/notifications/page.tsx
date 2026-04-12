'use client';

import { useState, useEffect } from 'react';
import { Bell, Smartphone, Mail, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NotificationPreferences {
  push: boolean;
  sms: boolean;
  email: boolean;
}

export default function NotificationsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push: true,
    sms: true,
    email: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load from user preferences if available
    if (user?.preferences?.notifications) {
      setPreferences({
        push: user.preferences.notifications.push ?? true,
        sms: user.preferences.notifications.sms ?? true,
        email: user.preferences.notifications.email ?? true,
      });
    }
  }, [user]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    if (!token) return;

    try {
      setSaving(true);
      await api.updateProfile(token, {
        preferences: {
          notifications: preferences,
        },
      });
      toast.success('Notification preferences saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
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
        <h1 className="text-2xl font-semibold text-text-primary">Notifications</h1>
      </div>

      {/* Description */}
      <p className="text-sm text-text-secondary mb-6">
        Choose how you want to receive updates about your orders, deliveries, and promotions.
      </p>

      {/* Notification Settings */}
      <div className="space-y-3 mb-6">
        {/* Push Notifications */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-text-primary">Push Notifications</p>
                <p className="text-sm text-text-secondary">
                  Get instant updates on your device
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('push')}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors',
                preferences.push ? 'bg-brand' : 'bg-border'
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                  preferences.push ? 'left-5' : 'left-0.5'
                )}
              />
            </button>
          </div>
        </div>

        {/* SMS Updates */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-text-primary">SMS Updates</p>
                <p className="text-sm text-text-secondary">
                  Receive text messages for key updates
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('sms')}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors',
                preferences.sms ? 'bg-brand' : 'bg-border'
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                  preferences.sms ? 'left-5' : 'left-0.5'
                )}
              />
            </button>
          </div>
        </div>

        {/* Email Receipts */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-text-primary">Email Receipts</p>
                <p className="text-sm text-text-secondary">
                  Get order confirmations and receipts
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('email')}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors',
                preferences.email ? 'bg-brand' : 'bg-border'
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                  preferences.email ? 'left-5' : 'left-0.5'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          'w-full py-3 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors font-medium',
          saving && 'opacity-50 cursor-not-allowed'
        )}
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>

      {/* Information */}
      <div className="mt-6 p-4 bg-surface-secondary rounded-lg">
        <p className="text-xs text-text-tertiary leading-relaxed">
          <strong className="text-text-secondary">Note:</strong> You'll still receive critical
          updates about your active orders (like pickup and delivery notifications) even if you
          disable certain notification types.
        </p>
      </div>
    </div>
  );
}
