import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, Share, Animated, Easing, RefreshControl, Platform,
} from 'react-native';
import { toast } from 'sonner-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/lib/haptics';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ordersApi } from '@/lib/api';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '@loadnbehold/constants';

interface OrderItem {
  _id: string;
  orderNumber: string;
  status: string;
  pricing: { total: number };
  createdAt: string;
  items: { service: string; quantity: number }[];
}

// ─── Status helpers ───────────────────────────────────────────
const TRACKABLE = ['placed', 'confirmed', 'driver_assigned', 'pickup_enroute', 'picked_up', 'processing', 'out_for_delivery'];
const CANCELLABLE = ['placed', 'confirmed', 'driver_assigned', 'pickup_enroute'];
const ACTIVE_STATUSES = ['placed', 'confirmed', 'driver_assigned', 'pickup_enroute', 'picked_up', 'at_laundry', 'processing', 'quality_check', 'ready_for_delivery', 'out_for_delivery'];
const PAST_STATUSES = ['delivered', 'completed', 'cancelled'];

const STATUS_STEPS = ORDER_STATUSES.filter((s) => s !== 'cancelled') as string[];
function getProgress(status: string): number {
  const idx = STATUS_STEPS.indexOf(status);
  if (idx < 0) return 0;
  return (idx + 1) / STATUS_STEPS.length;
}

// ─── Service icons ────────────────────────────────────────────
const SERVICE_ICONS: Record<string, { icon: string; bg: string; fg: string }> = {
  'wash_fold':     { icon: 'water-outline',      bg: '#DBEAFE', fg: '#2563EB' },
  'dry_cleaning':  { icon: 'sparkles-outline',    bg: '#F3E8FF', fg: '#7C3AED' },
  'iron_only':     { icon: 'flash-outline',       bg: '#FEF3C7', fg: '#D97706' },
  'stain_removal': { icon: 'color-wand-outline',  bg: '#FCE7F3', fg: '#DB2777' },
  'bedding':       { icon: 'bed-outline',         bg: '#D1FAE5', fg: '#059669' },
};
function getServiceMeta(name: string) {
  const key = name.toLowerCase().replace(/[\s&]+/g, '_');
  return SERVICE_ICONS[key] || { icon: 'shirt-outline', bg: '#F1F5F9', fg: '#64748B' };
}

// ─── Status accent colors ─────────────────────────────────────
function getAccentColor(status: string): string {
  if (['delivered', 'completed'].includes(status)) return '#16A34A';
  if (status === 'cancelled') return '#DC2626';
  if (['out_for_delivery', 'pickup_enroute', 'picked_up'].includes(status)) return '#F59E0B';
  return '#2563EB';
}

// ─── Relative time ────────────────────────────────────────────
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Pulsing dot animation ────────────────────────────────────
function PulseDot({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, opacity: anim }} />
      <View style={{ position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }} />
    </View>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────
function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, { toValue: progress, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [progress]);
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      <Animated.View
        style={{
          height: 4, borderRadius: 2, backgroundColor: color,
          width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

type FilterTab = 'active' | 'past' | 'all';

export default function OrdersScreen() {
  const c = useThemeColors();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('active');
  const [ratingOrder, setRatingOrder] = useState<OrderItem | null>(null);
  const [serviceRating, setServiceRating] = useState(5);
  const [driverRating, setDriverRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [disputeOrder, setDisputeOrder] = useState<OrderItem | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [cancelOrder, setCancelOrder] = useState<OrderItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [reorderTarget, setReorderTarget] = useState<OrderItem | null>(null);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    try {
      const data = await ordersApi.list();
      setOrders(Array.isArray(data) ? data : data?.items || []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }, []);

  // ─── Filter logic ───────────────────────────────────────────
  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const pastOrders = orders.filter((o) => PAST_STATUSES.includes(o.status));
  const filtered = filter === 'active' ? activeOrders : filter === 'past' ? pastOrders : orders;

  // Auto-select tab with content on first load
  useEffect(() => {
    if (!loading && orders.length > 0) {
      if (activeOrders.length === 0 && pastOrders.length > 0) setFilter('past');
    }
  }, [loading]);

  // ─── Handlers (unchanged logic) ─────────────────────────────
  const openRatingModal = (order: OrderItem) => {
    setRatingOrder(order);
    setServiceRating(5);
    setDriverRating(5);
    setReviewText('');
  };

  const handleSubmitRating = async () => {
    if (!ratingOrder) return;
    setSubmittingRating(true);
    try {
      await ordersApi.rate(ratingOrder._id, serviceRating, driverRating, reviewText.trim() || undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRatingOrder(null);
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelOrder) return;
    setSubmittingCancel(true);
    try {
      const result = await ordersApi.cancel(cancelOrder._id, cancelReason.trim() || undefined, 'wallet');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCancelOrder(null);
      setCancelReason('');
      const refundMsg = result?.refundAmount > 0 ? ` Refund: $${result.refundAmount.toFixed(2)} to wallet.` : '';
      const feeMsg = result?.fee > 0 ? ` Cancellation fee: $${result.fee.toFixed(2)}.` : '';
      toast.success(`Order cancelled.${refundMsg}${feeMsg}`);
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel order');
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleReorder = (order: OrderItem) => {
    setReorderTarget(order);
  };

  const confirmReorder = async () => {
    if (!reorderTarget) return;
    const order = reorderTarget;
    setReorderTarget(null);
    try {
      await ordersApi.reorder(order._id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success('Reorder placed successfully!');
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reorder');
    }
  };

  const handleDispute = async () => {
    if (!disputeOrder || !disputeReason.trim()) {
      toast.error('Please describe the issue');
      return;
    }
    setSubmittingDispute(true);
    try {
      await ordersApi.dispute(disputeOrder._id, disputeReason.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDisputeOrder(null);
      setDisputeReason('');
      toast.success('Your dispute has been filed. Our team will review it shortly.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to file dispute');
    } finally {
      setSubmittingDispute(false);
    }
  };

  const handleInvoice = async (order: OrderItem) => {
    try {
      const invoice = await ordersApi.getInvoice(order._id);
      const text = `Invoice: ${invoice.invoiceNumber}\nOrder: ${invoice.order.orderNumber}\nTotal: $${invoice.order.pricing.total.toFixed(2)}\nDate: ${new Date(invoice.date).toLocaleDateString()}`;
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(text);
        toast.success('Invoice details copied to clipboard');
      } else {
        await Share.share({ message: text, title: `Invoice ${invoice.invoiceNumber}` });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to get invoice');
    }
  };

  // ─── Tab counts ─────────────────────────────────────────────
  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'active', label: 'Active', count: activeOrders.length },
    { key: 'past', label: 'Past', count: pastOrders.length },
    { key: 'all', label: 'All', count: orders.length },
  ];

  // ─── Loading skeleton ──────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
        <View style={{ padding: spacing.xl }}>
          <Text style={{ fontSize: fontSize['2xl'], fontWeight: '800', color: c.textPrimary, letterSpacing: -0.5 }}>Orders</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.xl }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ height: 36, flex: 1, borderRadius: radius.full, backgroundColor: c.surfaceSecondary }} />
            ))}
          </View>
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ height: 140, borderRadius: radius.xl, backgroundColor: c.surfaceSecondary, marginBottom: spacing.md, opacity: 0.6 }} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render an order card ───────────────────────────────────
  const renderOrder = ({ item }: { item: OrderItem }) => {
    const isActive = ACTIVE_STATUSES.includes(item.status);
    const isCancelled = item.status === 'cancelled';
    const accent = getAccentColor(item.status);
    const progress = getProgress(item.status);
    const statusLabel = (ORDER_STATUS_LABELS as Record<string, string>)[item.status] || item.status;

    return (
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/(customer)/track', params: { orderId: item._id } })}
        activeOpacity={0.7}
      >
        <View style={{
          backgroundColor: c.surface,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: c.border,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}>
          {/* Accent bar + content */}
          <View style={{ flexDirection: 'row' }}>
            {/* Left accent strip */}
            <View style={{ width: 4, backgroundColor: accent }} />

            <View style={{ flex: 1, padding: spacing.lg }}>
              {/* Top row: order number + time | status */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {isActive && <PulseDot color={accent} />}
                    <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.3 }}>
                      {item.orderNumber}
                    </Text>
                  </View>
                  <Text style={{ fontSize: fontSize.xs, color: c.textTertiary, marginTop: 2, marginLeft: isActive ? 16 : 0 }}>
                    {relativeTime(item.createdAt)}
                  </Text>
                </View>

                {/* Status pill */}
                <View style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 4,
                  borderRadius: radius.full,
                  backgroundColor: isCancelled ? '#FEF2F2' : isActive ? `${accent}18` : '#F0FDF4',
                }}>
                  <Text style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: accent,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}>
                    {statusLabel}
                  </Text>
                </View>
              </View>

              {/* Progress bar for active orders */}
              {isActive && (
                <View style={{ marginTop: spacing.md }}>
                  <ProgressBar progress={progress} color={accent} />
                  <Text style={{ fontSize: 10, color: c.textTertiary, marginTop: 4 }}>
                    Step {STATUS_STEPS.indexOf(item.status) + 1} of {STATUS_STEPS.length}
                  </Text>
                </View>
              )}

              {/* Service items */}
              {item.items && item.items.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md }}>
                  {item.items.slice(0, 4).map((svc, idx) => {
                    const meta = getServiceMeta(svc.service);
                    return (
                      <View key={idx} style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 3,
                        borderRadius: radius.full,
                        backgroundColor: meta.bg,
                      }}>
                        <Ionicons name={meta.icon as any} size={11} color={meta.fg} />
                        <Text style={{ fontSize: 10, fontWeight: '600', color: meta.fg }}>
                          {svc.service}{svc.quantity > 1 ? ` x${svc.quantity}` : ''}
                        </Text>
                      </View>
                    );
                  })}
                  {item.items.length > 4 && (
                    <View style={{
                      paddingHorizontal: spacing.sm, paddingVertical: 3,
                      borderRadius: radius.full, backgroundColor: c.surfaceSecondary,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: c.textTertiary }}>
                        +{item.items.length - 4} more
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Price row */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: spacing.md,
                paddingTop: spacing.md,
                borderTopWidth: 1,
                borderTopColor: c.border,
              }}>
                <Text style={{ fontSize: fontSize.sm, color: c.textSecondary }}>
                  {item.items?.length || 0} service{(item.items?.length || 0) !== 1 ? 's' : ''}
                </Text>
                <Text style={{ fontSize: fontSize.lg, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.5 }}>
                  ${item.pricing?.total?.toFixed(2) || '0.00'}
                </Text>
              </View>

              {/* ─── Action buttons ─────────────────────────── */}

              {/* Track button for active orders */}
              {TRACKABLE.includes(item.status) && (
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); router.push({ pathname: '/(customer)/track', params: { orderId: item._id } }); }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: spacing.md,
                    height: 44,
                    borderRadius: radius.lg,
                    backgroundColor: accent,
                    gap: 8,
                    shadowColor: accent,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Ionicons name="navigate" size={16} color="#FFF" />
                  <Text style={{ fontSize: fontSize.sm, fontWeight: '700', color: '#FFF' }}>Track Order</Text>
                  <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              )}

              {/* Cancel for cancellable orders */}
              {CANCELLABLE.includes(item.status) && (
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); setCancelOrder(item); setCancelReason(''); }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: spacing.xs,
                    height: 36,
                    borderRadius: radius.lg,
                    gap: 4,
                  }}
                >
                  <Ionicons name="close-circle-outline" size={14} color={c.error} />
                  <Text style={{ fontSize: fontSize.xs, fontWeight: '600', color: c.error }}>Cancel Order</Text>
                </TouchableOpacity>
              )}

              {/* Completed order actions */}
              {['delivered', 'completed'].includes(item.status) && (
                <>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); openRatingModal(item); }}
                      style={{
                        flex: 1, height: 40, flexDirection: 'row',
                        alignItems: 'center', justifyContent: 'center',
                        borderRadius: radius.lg, backgroundColor: '#FFFBEB', gap: 5,
                      }}
                    >
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: '#D97706' }}>Rate</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); handleReorder(item); }}
                      style={{
                        flex: 1, height: 40, flexDirection: 'row',
                        alignItems: 'center', justifyContent: 'center',
                        borderRadius: radius.lg, backgroundColor: '#EFF6FF', gap: 5,
                      }}
                    >
                      <Ionicons name="refresh" size={14} color="#2563EB" />
                      <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: '#2563EB' }}>Reorder</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); handleInvoice(item); }}
                      style={{
                        flex: 1, height: 40, flexDirection: 'row',
                        alignItems: 'center', justifyContent: 'center',
                        borderRadius: radius.lg, backgroundColor: c.surfaceSecondary, gap: 5,
                      }}
                    >
                      <Ionicons name="document-text-outline" size={14} color={c.textSecondary} />
                      <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: c.textSecondary }}>Invoice</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); setDisputeOrder(item); setDisputeReason(''); }}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs, paddingVertical: spacing.xs, gap: 4 }}
                  >
                    <Ionicons name="flag-outline" size={11} color={c.textTertiary} />
                    <Text style={{ fontSize: 10, color: c.textTertiary }}>Report an issue</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: fontSize['2xl'], fontWeight: '800', color: c.textPrimary, letterSpacing: -0.5 }}>Orders</Text>
          {orders.length > 0 && (
            <View style={{ backgroundColor: c.brand, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFF' }}>{orders.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      {orders.length > 0 && (
        <View style={{ flexDirection: 'row', paddingHorizontal: spacing.xl, gap: spacing.sm, marginBottom: spacing.md }}>
          {tabs.map((tab) => {
            const isSelected = filter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => { setFilter(tab.key); Haptics.selectionAsync(); }}
                style={{
                  flex: 1,
                  height: 38,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radius.full,
                  backgroundColor: isSelected ? c.brand : c.surfaceSecondary,
                  gap: 5,
                }}
              >
                <Text style={{
                  fontSize: fontSize.xs,
                  fontWeight: '700',
                  color: isSelected ? '#FFF' : c.textSecondary,
                }}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={{
                    minWidth: 18, height: 18, borderRadius: 9,
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : c.border,
                    alignItems: 'center', justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}>
                    <Text style={{
                      fontSize: 10, fontWeight: '700',
                      color: isSelected ? '#FFF' : c.textTertiary,
                    }}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Content */}
      {orders.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['3xl'] }}>
          <View style={{
            width: 96, height: 96, borderRadius: 48,
            backgroundColor: c.brandLight,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: spacing.xl,
          }}>
            <Ionicons name="receipt-outline" size={44} color={c.brand} />
          </View>
          <Text style={{ fontSize: fontSize.xl, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.3 }}>
            No orders yet
          </Text>
          <Text style={{ fontSize: fontSize.base, color: c.textSecondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 }}>
            Your laundry orders will show up here.{'\n'}Let's get started!
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(customer)/home')}
            style={{
              marginTop: spacing.xl,
              height: 48,
              paddingHorizontal: spacing['3xl'],
              borderRadius: radius.full,
              backgroundColor: c.brand,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              shadowColor: c.brand,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#FFF' }}>Place First Order</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['3xl'] }}>
          <Ionicons name={filter === 'active' ? 'hourglass-outline' : 'checkmark-done-circle-outline'} size={48} color={c.textTertiary} />
          <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: c.textSecondary, marginTop: spacing.md }}>
            No {filter} orders
          </Text>
          <Text style={{ fontSize: fontSize.sm, color: c.textTertiary, marginTop: spacing.xs }}>
            {filter === 'active' ? 'All your orders have been completed.' : 'Your completed orders will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.md, paddingBottom: 100 }}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} />}
          showsVerticalScrollIndicator={false}
          renderItem={renderOrder}
        />
      )}

      {/* ─── Cancel Order Modal ──────────────────────────────── */}
      <Modal visible={!!cancelOrder} transparent animationType="slide" onRequestClose={() => setCancelOrder(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl }}>
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: spacing.lg }} />
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
                <Ionicons name="close-circle" size={28} color={c.error} />
              </View>
              <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>Cancel Order</Text>
              {cancelOrder && (
                <Text style={{ fontSize: fontSize.sm, color: c.textSecondary, marginTop: spacing.xs }}>{cancelOrder.orderNumber}</Text>
              )}
            </View>

            <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textSecondary, marginBottom: spacing.xs }}>Reason (optional)</Text>
            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Why are you cancelling?"
              placeholderTextColor={c.textTertiary}
              multiline
              numberOfLines={3}
              style={{
                borderWidth: 1, borderColor: c.border, borderRadius: radius.lg,
                padding: spacing.md, fontSize: fontSize.base, color: c.textPrimary,
                backgroundColor: c.surfaceSecondary, marginBottom: spacing.md,
                minHeight: 80, textAlignVertical: 'top',
              }}
            />

            {cancelOrder?.status === 'pickup_enroute' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.warningLight, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md }}>
                <Ionicons name="warning" size={16} color={c.warning} />
                <Text style={{ fontSize: fontSize.xs, color: c.warning, marginLeft: spacing.xs, flex: 1 }}>
                  A $5.00 cancellation fee applies since driver is already on the way.
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleCancelOrder}
              disabled={submittingCancel}
              style={{ height: 52, borderRadius: radius.xl, backgroundColor: c.error, alignItems: 'center', justifyContent: 'center', opacity: submittingCancel ? 0.6 : 1 }}
            >
              {submittingCancel ? <ActivityIndicator size="small" color="#FFF" /> : (
                <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#FFF' }}>Confirm Cancellation</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setCancelOrder(null)} style={{ alignItems: 'center', marginTop: spacing.md }}>
              <Text style={{ fontSize: fontSize.sm, color: c.textTertiary }}>Keep Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Dispute Modal ───────────────────────────────────── */}
      <Modal visible={!!disputeOrder} transparent animationType="slide" onRequestClose={() => setDisputeOrder(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl }}>
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: spacing.lg }} />
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
                <Ionicons name="flag" size={24} color="#D97706" />
              </View>
              <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>Report an Issue</Text>
              {disputeOrder && (
                <Text style={{ fontSize: fontSize.sm, color: c.textSecondary, marginTop: spacing.xs }}>{disputeOrder.orderNumber}</Text>
              )}
            </View>

            <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textSecondary, marginBottom: spacing.xs }}>What went wrong?</Text>
            <TextInput
              value={disputeReason}
              onChangeText={setDisputeReason}
              placeholder="Describe the issue with your order..."
              placeholderTextColor={c.textTertiary}
              multiline
              numberOfLines={4}
              style={{
                borderWidth: 1, borderColor: c.border, borderRadius: radius.lg,
                padding: spacing.md, fontSize: fontSize.base, color: c.textPrimary,
                backgroundColor: c.surfaceSecondary, marginBottom: spacing.xl,
                minHeight: 100, textAlignVertical: 'top',
              }}
            />

            <TouchableOpacity
              onPress={handleDispute}
              disabled={submittingDispute}
              style={{ height: 52, borderRadius: radius.xl, backgroundColor: c.error, alignItems: 'center', justifyContent: 'center', opacity: submittingDispute ? 0.6 : 1 }}
            >
              {submittingDispute ? <ActivityIndicator size="small" color="#FFF" /> : (
                <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#FFF' }}>Submit Dispute</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setDisputeOrder(null)} style={{ alignItems: 'center', marginTop: spacing.md }}>
              <Text style={{ fontSize: fontSize.sm, color: c.textTertiary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Rating Modal ────────────────────────────────────── */}
      <Modal visible={!!ratingOrder} transparent animationType="slide" onRequestClose={() => setRatingOrder(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl }}>
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: spacing.lg }} />
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFBEB', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
                <Ionicons name="star" size={28} color="#F59E0B" />
              </View>
              <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>Rate Your Order</Text>
              {ratingOrder && (
                <Text style={{ fontSize: fontSize.sm, color: c.textSecondary, marginTop: spacing.xs }}>{ratingOrder.orderNumber}</Text>
              )}
            </View>

            <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textSecondary, marginBottom: spacing.xs, textAlign: 'center' }}>Service Quality</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => { setServiceRating(star); Haptics.selectionAsync(); }}>
                  <Ionicons name={star <= serviceRating ? 'star' : 'star-outline'} size={36} color={star <= serviceRating ? '#F59E0B' : c.border} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textSecondary, marginBottom: spacing.xs, textAlign: 'center' }}>Driver</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => { setDriverRating(star); Haptics.selectionAsync(); }}>
                  <Ionicons name={star <= driverRating ? 'star' : 'star-outline'} size={36} color={star <= driverRating ? '#F59E0B' : c.border} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textSecondary, marginBottom: spacing.xs }}>Review (optional)</Text>
            <TextInput
              value={reviewText}
              onChangeText={setReviewText}
              placeholder="How was your experience?"
              placeholderTextColor={c.textTertiary}
              multiline
              numberOfLines={3}
              style={{
                borderWidth: 1, borderColor: c.border, borderRadius: radius.lg,
                padding: spacing.md, fontSize: fontSize.base, color: c.textPrimary,
                backgroundColor: c.surfaceSecondary, marginBottom: spacing.xl,
                minHeight: 80, textAlignVertical: 'top',
              }}
            />

            <TouchableOpacity
              onPress={handleSubmitRating}
              disabled={submittingRating}
              style={{ height: 52, borderRadius: radius.xl, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', opacity: submittingRating ? 0.6 : 1 }}
            >
              {submittingRating ? <ActivityIndicator size="small" color="#FFF" /> : (
                <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#FFF' }}>Submit Rating</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setRatingOrder(null)} style={{ alignItems: 'center', marginTop: spacing.md }}>
              <Text style={{ fontSize: fontSize.sm, color: c.textTertiary }}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!reorderTarget}
        title="Reorder"
        message={`Place the same order as ${reorderTarget?.orderNumber}?`}
        confirmLabel="Reorder"
        onConfirm={confirmReorder}
        onCancel={() => setReorderTarget(null)}
      />
    </SafeAreaView>
  );
}
