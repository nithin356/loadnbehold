'use client';

import { useState, useEffect } from 'react';
import { Bell, Send } from 'lucide-react';
import { useAdminAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const { accessToken } = useAdminAuthStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (accessToken) fetchHistory();
  }, [accessToken]);

  const fetchHistory = async () => {
    if (!accessToken) return;
    setLoadingHistory(true);
    try {
      const res = await adminApi.getNotificationHistory(accessToken);
      setHistory(res.data || []);
    } catch {
      // Non-critical — show empty state
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSend = async () => {
    if (!accessToken) return;
    if (!title || !body) {
      toast.error('Title and message are required');
      return;
    }
    setSending(true);
    try {
      await adminApi.sendNotification(accessToken, { title, body, audience });
      toast.success('Notification sent successfully');
      setTitle('');
      setBody('');
      fetchHistory();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-1">Notifications</h1>
      <p className="text-sm text-text-secondary mb-6">Send push notifications to customers and drivers</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <div className="bg-surface border border-border rounded-lg shadow-sm p-5">
          <h3 className="font-semibold text-text-primary mb-4">Compose Notification</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary"
              >
                <option value="all">Everyone</option>
                <option value="customers">All Customers</option>
                <option value="drivers">All Drivers</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title..."
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Message *</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                rows={4}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary resize-none"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send Notification'}
            </button>
          </div>
        </div>

        {/* Recent */}
        <div className="bg-surface border border-border rounded-lg shadow-sm p-5">
          <h3 className="font-semibold text-text-primary mb-4">Recent Notifications</h3>
          <div className="space-y-3">
            {loadingHistory ? (
              [1, 2].map((i) => (
                <div key={i} className="p-3 bg-surface-secondary rounded-lg animate-pulse">
                  <div className="h-4 bg-surface rounded w-32 mb-2" />
                  <div className="h-3 bg-surface rounded w-48 mb-2" />
                  <div className="h-3 bg-surface rounded w-24" />
                </div>
              ))
            ) : history.length === 0 ? (
              <p className="text-sm text-text-tertiary text-center py-4">No notifications sent yet</p>
            ) : (
              history.map((n: any, idx: number) => (
                <div key={idx} className="p-3 bg-surface-secondary rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Bell className="w-3.5 h-3.5 text-brand" />
                    <span className="text-sm font-medium text-text-primary">{n.title}</span>
                  </div>
                  <p className="text-sm text-text-secondary mb-2">{n.body}</p>
                  <div className="flex items-center gap-3 text-[12px] text-text-tertiary">
                    <span>{n.sentAt ? new Date(n.sentAt).toLocaleString() : 'N/A'}</span>
                    <span>{n.channel || 'push'}</span>
                    <span>{n.count || 0} recipients</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
