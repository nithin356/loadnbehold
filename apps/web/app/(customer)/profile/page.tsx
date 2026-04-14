'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, MapPin, CreditCard, HelpCircle, LogOut, ChevronRight, Moon, Sun, Share2, Bell, Mail, Phone, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const menuSections = [
  {
    title: 'Account',
    items: [
      { label: 'Manage Addresses', icon: MapPin, href: '/profile/addresses', desc: 'Add or edit delivery addresses' },
      { label: 'Payment Methods', icon: CreditCard, href: '/profile/payments', desc: 'Wallet & payment options' },
      { label: 'Notifications', icon: Bell, href: '/profile/notifications', desc: 'Manage alert preferences' },
    ],
  },
  {
    title: 'More',
    items: [
      { label: 'Help & FAQ', icon: HelpCircle, href: '/support', desc: 'Get help with your orders' },
      { label: 'Refer a Friend', icon: Share2, href: '/profile/referral', desc: 'Earn rewards for referrals' },
    ],
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const token = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSaveProfile = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await api.updateProfile(token, { name: editName, email: editEmail || undefined });
      updateUser({ name: editName, email: editEmail || undefined });
      toast.success('Profile updated');
      setEditing(false);
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-text-primary">Profile</h1>
        <p className="text-sm text-text-secondary mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Profile Card + Actions */}
        <div className="space-y-4">
          {/* Profile Header */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            {!editing ? (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-2xl font-black text-white shadow-lg flex-shrink-0">
                  {user?.name?.charAt(0) || <User className="w-7 h-7" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-black text-text-primary truncate">{user?.name || 'Set up profile'}</h2>
                  <p className="text-sm text-text-secondary flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-3 h-3 flex-shrink-0" /> {user?.phone}
                  </p>
                  {user?.email ? (
                    <p className="text-xs text-text-tertiary flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3 h-3 flex-shrink-0" /> {user.email}
                    </p>
                  ) : null}
                </div>
                <button
                  onClick={() => { setEditName(user?.name || ''); setEditEmail(user?.email || ''); setEditing(true); }}
                  className="p-2 rounded-xl bg-brand-light text-brand hover:bg-brand hover:text-white transition-colors flex-shrink-0"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-text-primary">Edit Profile</span>
                  <button onClick={() => setEditing(false)} className="text-xs text-text-tertiary hover:text-text-primary transition-colors">Cancel</button>
                </div>
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your name"
                    className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none transition-all"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving || !editName.trim()}
                  className="w-full h-10 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover transition-all disabled:opacity-40 flex items-center justify-center"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save'}
                </button>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          {mounted && (
            <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-2xl">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="w-5 h-5 text-brand" /> : <Sun className="w-5 h-5 text-brand" />}
                <div>
                  <span className="text-sm font-semibold text-text-primary">Appearance</span>
                  <p className="text-[11px] text-text-tertiary capitalize">{theme} mode</p>
                </div>
              </div>
              <div className="flex bg-surface-secondary rounded-xl p-0.5">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize',
                      theme === t ? 'bg-surface shadow-sm text-brand' : 'text-text-tertiary hover:text-text-secondary'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="bg-surface border border-border rounded-2xl p-4">
            <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3">Contact Us</p>
            <div className="flex gap-3">
              <a href="mailto:support@loadnbehold.com" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-surface-secondary rounded-xl text-xs font-medium text-text-secondary hover:text-brand transition-colors">
                <Mail className="w-3.5 h-3.5" /> Email
              </a>
              <a href="tel:+13135550100" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-surface-secondary rounded-xl text-xs font-medium text-text-secondary hover:text-brand transition-colors">
                <Phone className="w-3.5 h-3.5" /> Call
              </a>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-4 bg-surface border border-border rounded-2xl hover:bg-error-light hover:border-error/20 transition-all text-error font-semibold text-sm"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
            Log Out
          </button>

          {/* Footer Links */}
          <div className="flex justify-center gap-4 text-[11px] text-text-tertiary">
            <a href="/terms" className="hover:text-brand transition-colors">Terms</a>
            <span>&middot;</span>
            <a href="/privacy" className="hover:text-brand transition-colors">Privacy</a>
            <span>&middot;</span>
            <span>v1.0.0</span>
          </div>
        </div>

        {/* Right Column — Menu Sections */}
        <div className="lg:col-span-2 space-y-6">
          {menuSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">{section.title}</h3>
              <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
                {section.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => router.push(item.href)}
                    className="w-full flex items-center justify-between p-4 hover:bg-surface-secondary transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-brand" strokeWidth={1.75} />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-text-primary block">{item.label}</span>
                        <span className="text-[11px] text-text-tertiary">{item.desc}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-tertiary" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
