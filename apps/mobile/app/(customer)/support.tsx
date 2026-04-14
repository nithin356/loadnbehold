import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { toast } from 'sonner-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/lib/haptics';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { supportApi } from '@/lib/api';

type ViewMode = 'list' | 'detail' | 'create';

const CATEGORIES = [
  { value: 'order_issue', label: 'Order Issue' },
  { value: 'delivery', label: 'Delivery Problem' },
  { value: 'billing', label: 'Billing & Payments' },
  { value: 'account', label: 'Account Issue' },
  { value: 'other', label: 'Other' },
];

const STATUS_COLORS: Record<string, string> = {
  open: '#2563EB',
  in_progress: '#F59E0B',
  waiting_for_info: '#8B5CF6',
  resolved: '#10B981',
  closed: '#6B7280',
};

export default function SupportScreen() {
  const c = useThemeColors();
  const [view, setView] = useState<ViewMode>('list');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create form
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('order_issue');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);

  // Reply
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await supportApi.getTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const openTicket = async (ticketId: string) => {
    setLoadingDetail(true);
    setView('detail');
    try {
      const data = await supportApi.getTicket(ticketId);
      setSelectedTicket(data);
    } catch {
      toast.error('Failed to load ticket');
      setView('list');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    setCreating(true);
    try {
      await supportApi.createTicket({ subject: subject.trim(), category, message: message.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success('Ticket created');
      setSubject('');
      setMessage('');
      setView('list');
      fetchTickets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create ticket');
    } finally {
      setCreating(false);
    }
  };

  const handleReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    setSending(true);
    try {
      await supportApi.reply(selectedTicket._id, reply.trim());
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setReply('');
      // Refresh ticket
      const updated = await supportApi.getTicket(selectedTicket._id);
      setSelectedTicket(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const goBack = () => {
    if (view === 'list') {
      router.back();
    } else {
      setView('list');
      setSelectedTicket(null);
    }
  };

  // ─── List View ────────────────────────
  const renderList = () => (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>Support Tickets</Text>
        <TouchableOpacity
          onPress={() => setView('create')}
          style={{ backgroundColor: c.brand, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md }}
        >
          <Text style={{ color: '#fff', fontSize: fontSize.sm, fontWeight: '600' }}>New Ticket</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={c.brand} style={{ marginTop: spacing.xl }} />
      ) : tickets.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl * 2 }}>
          <Ionicons name="chatbubbles-outline" size={48} color={c.textTertiary} />
          <Text style={{ color: c.textSecondary, fontSize: fontSize.sm, marginTop: spacing.md }}>No support tickets yet</Text>
          <Text style={{ color: c.textTertiary, fontSize: fontSize.xs, marginTop: spacing.xs }}>Create one if you need help</Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => openTicket(item._id)}
              style={{
                backgroundColor: c.surface,
                borderRadius: radius.lg,
                padding: spacing.md,
                marginBottom: spacing.sm,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textPrimary, flex: 1 }} numberOfLines={1}>
                  {item.subject}
                </Text>
                <View style={{ backgroundColor: STATUS_COLORS[item.status] || c.textTertiary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{(item.status || '').replace(/_/g, ' ').toUpperCase()}</Text>
                </View>
              </View>
              <Text style={{ color: c.textTertiary, fontSize: fontSize.xs }}>{item.category?.replace(/_/g, ' ')} · {new Date(item.createdAt).toLocaleDateString()}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </>
  );

  // ─── Detail View ──────────────────────
  const renderDetail = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      {loadingDetail ? (
        <ActivityIndicator color={c.brand} style={{ marginTop: spacing.xl }} />
      ) : selectedTicket ? (
        <>
          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>{selectedTicket.subject}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.xs }}>
              <View style={{ backgroundColor: STATUS_COLORS[selectedTicket.status] || c.textTertiary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{(selectedTicket.status || '').replace(/_/g, ' ').toUpperCase()}</Text>
              </View>
              <Text style={{ color: c.textTertiary, fontSize: fontSize.xs }}>{selectedTicket.category?.replace(/_/g, ' ')}</Text>
            </View>
          </View>

          <ScrollView style={{ flex: 1, marginBottom: spacing.md }}>
            {selectedTicket.messages?.map((msg: any, i: number) => {
              const isAdmin = msg.senderRole === 'admin';
              return (
                <View key={i} style={{
                  alignSelf: isAdmin ? 'flex-start' : 'flex-end',
                  backgroundColor: isAdmin ? c.surfaceSecondary : c.brand,
                  borderRadius: radius.lg,
                  padding: spacing.sm,
                  marginBottom: spacing.sm,
                  maxWidth: '80%',
                }}>
                  <Text style={{ color: isAdmin ? c.textPrimary : '#fff', fontSize: fontSize.sm }}>{msg.message}</Text>
                  <Text style={{ color: isAdmin ? c.textTertiary : 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 4 }}>
                    {msg.senderRole === 'admin' ? 'Support' : 'You'} · {new Date(msg.createdAt).toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TextInput
                value={reply}
                onChangeText={setReply}
                placeholder="Type a reply..."
                placeholderTextColor={c.textTertiary}
                style={{
                  flex: 1,
                  backgroundColor: c.surfaceSecondary,
                  borderRadius: radius.lg,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  fontSize: fontSize.sm,
                  color: c.textPrimary,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              />
              <TouchableOpacity
                onPress={handleReply}
                disabled={sending || !reply.trim()}
                style={{
                  backgroundColor: c.brand,
                  borderRadius: radius.lg,
                  paddingHorizontal: spacing.md,
                  justifyContent: 'center',
                  opacity: sending || !reply.trim() ? 0.5 : 1,
                }}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : null}
    </KeyboardAvoidingView>
  );

  // ─── Create View ──────────────────────
  const renderCreate = () => (
    <ScrollView>
      <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary, marginBottom: spacing.lg }}>New Ticket</Text>

      <Text style={{ color: c.textSecondary, fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs }}>Category</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md }}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            onPress={() => { setCategory(cat.value); Haptics.selectionAsync(); }}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: category === cat.value ? c.brand : c.surfaceSecondary,
              borderWidth: 1,
              borderColor: category === cat.value ? c.brand : c.border,
            }}
          >
            <Text style={{ color: category === cat.value ? '#fff' : c.textPrimary, fontSize: fontSize.sm, fontWeight: '500' }}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={{ color: c.textSecondary, fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs }}>Subject</Text>
      <TextInput
        value={subject}
        onChangeText={setSubject}
        placeholder="Brief description of your issue"
        placeholderTextColor={c.textTertiary}
        style={{
          backgroundColor: c.surfaceSecondary,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          fontSize: fontSize.sm,
          color: c.textPrimary,
          borderWidth: 1,
          borderColor: c.border,
          marginBottom: spacing.md,
        }}
      />

      <Text style={{ color: c.textSecondary, fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs }}>Message</Text>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Describe your issue in detail..."
        placeholderTextColor={c.textTertiary}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        style={{
          backgroundColor: c.surfaceSecondary,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          fontSize: fontSize.sm,
          color: c.textPrimary,
          borderWidth: 1,
          borderColor: c.border,
          minHeight: 140,
          marginBottom: spacing.lg,
        }}
      />

      <TouchableOpacity
        onPress={handleCreate}
        disabled={creating}
        style={{
          backgroundColor: c.brand,
          borderRadius: radius.lg,
          paddingVertical: spacing.md,
          alignItems: 'center',
          opacity: creating ? 0.6 : 1,
        }}
      >
        {creating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontSize: fontSize.base, fontWeight: '700' }}>Submit Ticket</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <TouchableOpacity onPress={goBack} style={{ padding: spacing.xs }}>
          <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary, marginLeft: spacing.sm }}>
          {view === 'list' ? 'Support' : view === 'create' ? 'New Ticket' : 'Ticket Detail'}
        </Text>
      </View>

      <View style={{ flex: 1, padding: spacing.md }}>
        {view === 'list' && renderList()}
        {view === 'detail' && renderDetail()}
        {view === 'create' && renderCreate()}
      </View>
    </SafeAreaView>
  );
}
