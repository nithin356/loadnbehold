'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Send, MessageSquare, AlertCircle, CheckCircle2,
  User, Shield, Paperclip, X, Image as ImageIcon, FileText,
  Clock, ChevronRight, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: 'text-warning', bg: 'bg-warning-light' },
  in_progress: { label: 'In Progress', color: 'text-brand', bg: 'bg-brand-light' },
  waiting_for_info: { label: 'Awaiting Reply', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  resolved: { label: 'Resolved', color: 'text-success', bg: 'bg-success-light' },
  closed: { label: 'Closed', color: 'text-text-secondary', bg: 'bg-surface-secondary' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-text-tertiary' },
  medium: { label: 'Medium', color: 'text-warning' },
  high: { label: 'High', color: 'text-orange-500' },
  urgent: { label: 'Urgent', color: 'text-error' },
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTicket = async () => {
    if (!token || !id) return;
    try {
      const res: any = await api.getTicketById(token, id);
      setTicket(res.data);
    } catch {
      toast.error('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTicket(); }, [token, id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024;
    const validFiles = files.filter((f) => {
      if (f.size > maxSize) { toast.error(`${f.name} is too large (max 10MB)`); return false; }
      return true;
    });
    setAttachments((prev) => [...prev, ...validFiles].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendReply = async () => {
    if (!token || !id || (!reply.trim() && attachments.length === 0)) return;
    setSending(true);
    try {
      let uploadedUrls: string[] = [];
      if (attachments.length > 0) {
        setUploading(true);
        const uploads = await Promise.all(attachments.map((file) => api.uploadTicketAttachment(token, file)));
        uploadedUrls = uploads.map((u: any) => u.data.url);
        setUploading(false);
      }
      await api.replyToTicket(token, id, reply.trim() || '(attachment)', uploadedUrls.length > 0 ? uploadedUrls : undefined);
      setReply('');
      setAttachments([]);
      await fetchTicket();
      toast.success('Reply sent');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100dvh-8rem)]">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="w-8 h-8 rounded-full bg-surface-secondary animate-pulse" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-40 bg-surface-secondary rounded animate-pulse" />
            <div className="h-3 w-24 bg-surface-secondary rounded animate-pulse" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn('h-16 bg-surface-secondary rounded-2xl animate-pulse', i % 2 === 0 ? 'w-3/4 ml-auto' : 'w-3/4')} />
          ))}
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-8rem)] text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-surface-secondary flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-text-tertiary" strokeWidth={1.5} />
        </div>
        <h2 className="text-base font-bold text-text-primary mb-1">Ticket Not Found</h2>
        <p className="text-sm text-text-secondary mb-5">This ticket may have been deleted.</p>
        <button
          onClick={() => router.push('/support')}
          className="h-10 px-6 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors"
        >
          Back to Support
        </button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const priorityConfig = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  const isClosed = ['resolved', 'closed'].includes(ticket.status);
  const visibleMessages = (ticket.messages || []).filter((m: any) => !m.isInternal);
  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|webp|gif)$/i.test(url);

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] -mx-4 -mt-0 sm:mx-0 sm:my-4 sm:h-auto sm:min-h-[calc(100dvh-10rem)] sm:max-w-3xl sm:mx-auto">
      {/* ── Sticky Header ── */}
      <div className="sticky top-14 z-10 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.push('/support')}
            className="p-1.5 -ml-1.5 rounded-xl hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-text-primary truncate leading-tight">{ticket.subject}</h1>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[10px] text-text-tertiary font-mono">{ticket.ticketNumber}</span>
              <span className={cn('inline-flex items-center h-[18px] px-1.5 rounded-full text-[9px] font-bold uppercase tracking-wide', statusConfig.bg, statusConfig.color)}>
                {statusConfig.label}
              </span>
              <span className={cn('text-[10px] font-semibold', priorityConfig.color)}>{priorityConfig.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Waiting for info banner */}
      {ticket.status === 'waiting_for_info' && (
        <div className="mx-3 mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Please reply with the requested info</p>
        </div>
      )}

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Date/info chip */}
        <div className="flex justify-center mb-3">
          <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary bg-surface-secondary px-3 py-1 rounded-full">
            <Clock className="w-3 h-3" />
            {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            <span className="mx-0.5">·</span>
            <span className="capitalize">{(ticket.category || 'general').replace(/_/g, ' ')}</span>
          </div>
        </div>

        {visibleMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="w-10 h-10 text-text-tertiary mb-2" strokeWidth={1.5} />
            <p className="text-sm text-text-secondary">No messages yet</p>
          </div>
        ) : (
          visibleMessages.map((msg: any, i: number) => {
            const isCustomer = msg.senderRole === 'customer';
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className={cn('flex flex-col', isCustomer ? 'items-end' : 'items-start')}
              >
                {/* Sender + time */}
                <div className={cn('flex items-center gap-1 px-2 mb-0.5', isCustomer ? 'flex-row-reverse' : '')}>
                  {isCustomer ? (
                    <User className="w-2.5 h-2.5 text-text-tertiary" />
                  ) : (
                    <Shield className="w-2.5 h-2.5 text-brand" />
                  )}
                  <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">
                    {isCustomer ? 'You' : 'Support'}
                  </span>
                  <span className="text-[9px] text-text-tertiary">
                    {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>

                {/* Bubble */}
                <div className={cn(
                  'max-w-[82%] rounded-2xl px-3.5 py-2.5',
                  isCustomer
                    ? 'bg-brand text-white rounded-br-md'
                    : 'bg-surface-secondary border border-border rounded-bl-md'
                )}>
                  <p className={cn('text-[13px] leading-relaxed whitespace-pre-wrap', isCustomer ? 'text-white' : 'text-text-primary')}>
                    {msg.message}
                  </p>

                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {msg.attachments.map((url: string, j: number) => (
                        isImageUrl(url) ? (
                          <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="block">
                            <img src={url} alt="Attachment" className="max-w-[180px] rounded-lg border border-white/20" />
                          </a>
                        ) : (
                          <a
                            key={j}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              'inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg transition-colors',
                              isCustomer ? 'bg-white/15 text-white/90' : 'bg-surface border border-border text-brand'
                            )}
                          >
                            <FileText className="w-3 h-3" /> Attachment {j + 1}
                          </a>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Reply / Closed ── */}
      {isClosed ? (
        <div className="border-t border-border bg-background px-4 py-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <p className="text-sm font-semibold text-text-primary">
              Ticket {ticket.status === 'resolved' ? 'resolved' : 'closed'}
            </p>
          </div>
          {ticket.resolution && (
            <p className="text-xs text-text-secondary mb-2">{ticket.resolution}</p>
          )}
          <button
            onClick={() => router.push('/support')}
            className="text-xs text-brand font-semibold hover:underline inline-flex items-center gap-0.5"
          >
            Back to Support <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="border-t border-border bg-background px-3 py-3 safe-area-bottom">
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-surface-secondary border border-border rounded-lg px-2 py-1.5 max-w-[160px]">
                  {file.type.startsWith('image/') ? (
                    <ImageIcon className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                  )}
                  <span className="text-[11px] text-text-primary truncate">{file.name}</span>
                  <button onClick={() => removeAttachment(i)} className="p-0.5 text-text-tertiary hover:text-error flex-shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Attach button */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-text-tertiary hover:text-brand hover:bg-surface-secondary transition-colors flex-shrink-0"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Text input */}
            <div className="flex-1 relative">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply..."
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); }
                }}
                onInput={(e) => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                }}
                className="w-full px-3.5 py-2.5 bg-surface-secondary border border-border rounded-2xl text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all leading-snug"
                style={{ maxHeight: '120px' }}
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSendReply}
              disabled={sending || (!reply.trim() && attachments.length === 0)}
              className="w-10 h-10 bg-brand text-white rounded-full flex items-center justify-center hover:bg-brand-hover transition-colors disabled:opacity-40 flex-shrink-0"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 ml-0.5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
