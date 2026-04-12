'use client';

import { useState, useEffect, useRef } from 'react';
import { HeadphonesIcon, MessageSquare, Clock, CheckCircle, ArrowLeft, Send, AlertTriangle, User, ChevronDown, Lock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: 'text-error', bg: 'bg-error-light text-error' },
  in_progress: { label: 'In Progress', color: 'text-warning', bg: 'bg-warning-light text-warning' },
  waiting_for_info: { label: 'Waiting for Info', color: 'text-blue-500', bg: 'bg-blue-500/10 text-blue-500' },
  resolved: { label: 'Resolved', color: 'text-success', bg: 'bg-success-light text-success' },
  closed: { label: 'Closed', color: 'text-text-tertiary', bg: 'bg-surface-secondary text-text-secondary' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'text-error font-bold' },
  high: { label: 'High', color: 'text-error' },
  medium: { label: 'Medium', color: 'text-warning' },
  low: { label: 'Low', color: 'text-text-secondary' },
};

const CATEGORY_LABELS: Record<string, string> = {
  order_issue: 'Order Issue',
  payment: 'Payment',
  delivery: 'Delivery',
  quality: 'Quality',
  account: 'Account',
  general: 'General',
};

// Valid status transitions (Jira-like)
const STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress', 'waiting_for_info', 'resolved', 'closed'],
  in_progress: ['waiting_for_info', 'resolved', 'closed'],
  waiting_for_info: ['in_progress', 'resolved', 'closed'],
  resolved: ['in_progress', 'closed'],
  closed: ['open'],
};

export default function SupportPage() {
  const { accessToken } = useAdminAuthStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accessToken) return;
    fetchTickets();
  }, [accessToken]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.messages]);

  const fetchTickets = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await adminApi.getSupportTickets(accessToken);
      setTickets(res.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const openTicket = async (id: string) => {
    if (!accessToken) return;
    setDetailLoading(true);
    try {
      const res = await adminApi.getTicketById(accessToken, id);
      setSelectedTicket(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load ticket');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!accessToken || !selectedTicket) return;
    try {
      const res = await adminApi.updateTicketStatus(accessToken, selectedTicket._id, newStatus);
      setSelectedTicket(res.data);
      setTickets((prev) => prev.map((t) => t._id === selectedTicket._id ? { ...t, status: newStatus } : t));
      toast.success(`Status changed to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
    setStatusDropdownOpen(false);
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!accessToken || !selectedTicket) return;
    try {
      const res = await adminApi.updateTicketPriority(accessToken, selectedTicket._id, newPriority);
      setSelectedTicket(res.data);
      setTickets((prev) => prev.map((t) => t._id === selectedTicket._id ? { ...t, priority: newPriority } : t));
      toast.success(`Priority changed to ${newPriority}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update priority');
    }
    setPriorityDropdownOpen(false);
  };

  const handleSendComment = async () => {
    if (!accessToken || !selectedTicket || !comment.trim()) return;
    setSending(true);
    try {
      const res = await adminApi.addTicketComment(accessToken, selectedTicket._id, comment.trim(), isInternal);
      setSelectedTicket(res.data);
      setComment('');
      setIsInternal(false);
      // Update ticket status in list if it changed
      if (res.data?.status) {
        setTickets((prev) => prev.map((t) => t._id === selectedTicket._id ? { ...t, status: res.data.status } : t));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send comment');
    } finally {
      setSending(false);
    }
  };

  const stats = [
    { label: 'Open', value: tickets.filter((t) => t.status === 'open').length, icon: MessageSquare, color: 'text-error bg-error-light' },
    { label: 'In Progress', value: tickets.filter((t) => t.status === 'in_progress').length, icon: Clock, color: 'text-warning bg-warning-light' },
    { label: 'Waiting', value: tickets.filter((t) => t.status === 'waiting_for_info').length, icon: AlertTriangle, color: 'text-blue-500 bg-blue-500/10' },
    { label: 'Resolved Today', value: tickets.filter((t) => {
      if (t.status !== 'resolved') return false;
      const resolved = new Date(t.resolvedAt || t.updatedAt);
      const today = new Date();
      return resolved.toDateString() === today.toDateString();
    }).length, icon: CheckCircle, color: 'text-success bg-success-light' },
  ];

  // Detail view
  if (selectedTicket) {
    const ticket = selectedTicket;
    const statusConf = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
    const priorityConf = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
    const transitions = STATUS_TRANSITIONS[ticket.status] || [];

    return (
      <div className="flex flex-col h-[calc(100vh-80px)]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-border flex-shrink-0">
          <button onClick={() => setSelectedTicket(null)} className="p-2 rounded-lg hover:bg-surface-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-brand">{ticket.ticketNumber || ticket._id.slice(-8)}</span>
              <span className={cn('inline-flex h-[22px] px-2 rounded-full text-[11px] font-semibold items-center', statusConf.bg)}>
                {statusConf.label}
              </span>
              <span className={cn('text-[11px] font-semibold', priorityConf.color)}>
                {priorityConf.label}
              </span>
            </div>
            <h2 className="text-lg font-bold text-text-primary truncate">{ticket.subject}</h2>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 mt-4 gap-4">
          {/* Left: Conversation Thread */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {ticket.messages?.map((msg: any, i: number) => {
                const isAdmin = msg.senderRole === 'admin';
                const isSystem = msg.isInternal;
                return (
                  <div key={i} className={cn(
                    'rounded-xl p-3',
                    isSystem
                      ? 'bg-surface-secondary/50 border border-dashed border-border mx-8'
                      : isAdmin
                        ? 'bg-brand-light/40 border border-brand/20 ml-8'
                        : 'bg-surface border border-border mr-8'
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
                        isSystem ? 'bg-surface-secondary text-text-tertiary'
                        : isAdmin ? 'bg-brand text-white' : 'bg-text-primary text-background'
                      )}>
                        {isSystem ? <Lock className="w-3 h-3" /> : isAdmin ? 'A' : 'C'}
                      </div>
                      <span className="text-[11px] font-semibold text-text-primary">
                        {isSystem ? 'System' : isAdmin ? 'Support Agent' : ticket.customerId?.name || 'Customer'}
                      </span>
                      {isSystem && <span className="text-[10px] text-text-tertiary bg-surface-secondary px-1.5 py-0.5 rounded">Internal Note</span>}
                      <span className="text-[10px] text-text-tertiary ml-auto">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary leading-relaxed pl-8">{msg.message}</p>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Comment Input */}
            {!['closed'].includes(ticket.status) && (
              <div className="mt-3 border-t border-border pt-3 flex-shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <label className="flex items-center gap-1.5 text-[11px] text-text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-border text-brand accent-[var(--brand)]"
                    />
                    <Lock className="w-3 h-3" />
                    Internal note (not visible to customer)
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendComment()}
                    placeholder={isInternal ? 'Add internal note...' : 'Reply to customer...'}
                    className={cn(
                      'flex-1 h-10 px-4 border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 transition-all',
                      isInternal
                        ? 'bg-surface-secondary border-dashed border-border focus:ring-text-tertiary/20'
                        : 'bg-surface border-border focus:ring-brand/30'
                    )}
                  />
                  <button
                    onClick={handleSendComment}
                    disabled={sending || !comment.trim()}
                    className="h-10 px-4 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                  >
                    {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Send</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Ticket Details Sidebar */}
          <div className="w-72 flex-shrink-0 space-y-4 overflow-y-auto">
            {/* Status */}
            <div className="bg-surface border border-border rounded-lg p-4">
              <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-2">Status</p>
              <div className="relative">
                <button
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className={cn('w-full flex items-center justify-between h-9 px-3 rounded-lg text-sm font-semibold', statusConf.bg)}
                >
                  {statusConf.label}
                  <ChevronDown className="w-4 h-4" />
                </button>
                {statusDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                    {transitions.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-surface-secondary transition-colors flex items-center gap-2"
                      >
                        <span className={cn('w-2 h-2 rounded-full', STATUS_CONFIG[s]?.color.replace('text-', 'bg-'))} />
                        {STATUS_CONFIG[s]?.label || s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Priority */}
            <div className="bg-surface border border-border rounded-lg p-4">
              <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-2">Priority</p>
              <div className="relative">
                <button
                  onClick={() => setPriorityDropdownOpen(!priorityDropdownOpen)}
                  className="w-full flex items-center justify-between h-9 px-3 rounded-lg text-sm font-semibold bg-surface-secondary text-text-primary"
                >
                  <span className={priorityConf.color}>{priorityConf.label}</span>
                  <ChevronDown className="w-4 h-4 text-text-tertiary" />
                </button>
                {priorityDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                    {['urgent', 'high', 'medium', 'low'].map((p) => (
                      <button
                        key={p}
                        onClick={() => handlePriorityChange(p)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-surface-secondary transition-colors"
                      >
                        <span className={PRIORITY_CONFIG[p]?.color}>{PRIORITY_CONFIG[p]?.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-surface border border-border rounded-lg p-4">
              <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-2">Customer</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center">
                  <User className="w-4 h-4 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{ticket.customerId?.name || ticket.customerId?.phone || 'Unknown'}</p>
                  <p className="text-[11px] text-text-secondary">{ticket.customerId?.phone || ''}</p>
                </div>
              </div>
              {ticket.customerId?.email && (
                <p className="text-[11px] text-text-tertiary">{ticket.customerId.email}</p>
              )}
            </div>

            {/* Details */}
            <div className="bg-surface border border-border rounded-lg p-4 space-y-2">
              <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-2">Details</p>
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Category</span>
                <span className="text-text-primary font-medium">{CATEGORY_LABELS[ticket.category] || ticket.category || 'General'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Created</span>
                <span className="text-text-primary">{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
              {ticket.slaDeadline && (
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">SLA Deadline</span>
                  <span className={cn('font-medium', new Date(ticket.slaDeadline) < new Date() && ticket.status !== 'resolved' && ticket.status !== 'closed' ? 'text-error' : 'text-text-primary')}>
                    {new Date(ticket.slaDeadline).toLocaleString()}
                  </span>
                </div>
              )}
              {ticket.orderId && (
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">Order</span>
                  <span className="text-brand font-medium">{ticket.orderId.orderNumber || ticket.orderId._id?.slice(-6)}</span>
                </div>
              )}
              {ticket.assignedTo && (
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">Assigned to</span>
                  <span className="text-text-primary font-medium">{ticket.assignedTo.name || 'Staff'}</span>
                </div>
              )}
              {ticket.resolvedAt && (
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">Resolved</span>
                  <span className="text-success">{new Date(ticket.resolvedAt).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            {!['resolved', 'closed'].includes(ticket.status) && (
              <div className="bg-surface border border-border rounded-lg p-4">
                <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-2">Quick Actions</p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleStatusChange('resolved')}
                    className="w-full h-9 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Resolve
                  </button>
                  {ticket.status !== 'waiting_for_info' && (
                    <button
                      onClick={() => handleStatusChange('waiting_for_info')}
                      className="w-full h-9 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-500/90 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" /> Request Info
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-1">Support</h1>
      <p className="text-sm text-text-secondary mb-6">Manage customer support tickets</p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-lg p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-surface-secondary rounded w-24 mb-2" />
                <div className="h-8 bg-surface-secondary rounded w-12" />
              </div>
            </div>
          ))
        ) : (
          stats.map((s) => (
            <div key={s.label} className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">{s.label}</span>
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', s.color)}>
                  <s.icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-text-primary">{s.value}</div>
            </div>
          ))
        )}
      </div>

      {/* Tickets Table */}
      <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-secondary">
              {['Ticket #', 'Subject', 'Customer', 'Category', 'Priority', 'Status', 'SLA', 'Created'].map((h) => (
                <th key={h} className="text-left text-[13px] font-medium text-text-secondary px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8">
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse h-12 bg-surface-secondary rounded" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-text-tertiary">
                  No tickets found
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => {
                const sConf = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                const pConf = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
                const slaBreached = ticket.slaBreached || (ticket.slaDeadline && new Date(ticket.slaDeadline) < new Date() && !['resolved', 'closed'].includes(ticket.status));
                return (
                  <tr
                    key={ticket._id}
                    onClick={() => openTicket(ticket._id)}
                    className="border-t border-border hover:bg-surface-secondary/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-mono font-medium text-brand">{ticket.ticketNumber || ticket._id.slice(-8)}</td>
                    <td className="px-4 py-3 text-sm text-text-primary max-w-[200px] truncate">{ticket.subject}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{ticket.customerId?.name || ticket.customerId?.phone || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] px-2 py-0.5 bg-surface-secondary rounded text-text-secondary font-medium">
                        {CATEGORY_LABELS[ticket.category] || ticket.category || 'General'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm font-medium', pConf.color)}>{pConf.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex h-[22px] px-2 rounded-full text-[12px] font-semibold items-center', sConf.bg)}>
                        {sConf.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {slaBreached ? (
                        <span className="text-[11px] px-2 py-0.5 bg-error-light text-error rounded-full font-semibold">BREACHED</span>
                      ) : ticket.slaDeadline ? (
                        <span className="text-[11px] text-text-tertiary">{new Date(ticket.slaDeadline).toLocaleString()}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-text-tertiary whitespace-nowrap">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
