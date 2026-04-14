import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { toast } from 'sonner-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/lib/haptics';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { SkeletonCard } from '@/components/Skeleton';
import { driverApi } from '@/lib/api';
import { ORDER_STATUS_LABELS, WS_EVENTS } from '@loadnbehold/constants';
import { getSocket } from '@/lib/socket';

type Tab = 'active' | 'completed';

interface OrderItem {
  _id: string;
  orderNumber: string;
  status: string;
  customerId?: { name: string; phone: string };
  pickupAddress?: { label?: string; line1?: string; city?: string };
  deliveryAddress?: { label?: string; line1?: string; city?: string };
  pricing?: { total: number };
  createdAt: string;
}

export default function DeliveriesScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('active');
  const [activeOrders, setActiveOrders] = useState<OrderItem[]>([]);
  const [completedOrders, setCompletedOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [active, completed] = await Promise.all([
        driverApi.getOrders().catch(() => []),
        driverApi.getCompletedOrders().catch(() => []),
      ]);
      setActiveOrders(Array.isArray(active) ? active : []);
      setCompletedOrders(Array.isArray(completed) ? completed : []);
    } catch {
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh on socket events (new order assigned / status change)
  useEffect(() => {
    const socket = getSocket();
    const handleNewOrder = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      loadData();
    };
    const handleStatusChange = () => { loadData(); };

    socket.on(WS_EVENTS.DRIVER_NEW_ORDER, handleNewOrder);
    socket.on(WS_EVENTS.ORDER_STATUS, handleStatusChange);

    return () => {
      socket.off(WS_EVENTS.DRIVER_NEW_ORDER, handleNewOrder);
      socket.off(WS_EVENTS.ORDER_STATUS, handleStatusChange);
    };
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const orders = tab === 'active' ? activeOrders : completedOrders;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ padding: spacing.xl, paddingBottom: 0 }}>
        <Text style={{ fontSize: fontSize['2xl'], fontWeight: '700', color: c.textPrimary, marginBottom: spacing.lg }}>
          Deliveries
        </Text>

        {/* Tabs */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: c.surfaceSecondary,
            borderRadius: radius.lg,
            padding: 3,
            marginBottom: spacing.lg,
          }}
        >
          {(['active', 'completed'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => { setTab(t); Haptics.selectionAsync(); }}
              style={{
                flex: 1,
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: tab === t ? c.surface : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: fontSize.sm,
                  fontWeight: '600',
                  color: tab === t ? c.textPrimary : c.textTertiary,
                }}
              >
                {t === 'active' ? `Active (${activeOrders.length})` : `Completed (${completedOrders.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingTop: 0 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} />}
      >
        {loading ? (
          <View>
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} style={{ marginBottom: spacing.md }} />
            ))}
          </View>
        ) : orders.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing['4xl'] }}>
            <Ionicons
              name={tab === 'active' ? 'bicycle-outline' : 'checkmark-circle-outline'}
              size={64}
              color={c.textTertiary}
            />
            <Text style={{ fontSize: fontSize.lg, fontWeight: '600', color: c.textPrimary, marginTop: spacing.lg }}>
              {tab === 'active' ? 'No active deliveries' : 'No completed deliveries'}
            </Text>
            <Text style={{ fontSize: fontSize.base, color: c.textSecondary, marginTop: spacing.sm, textAlign: 'center' }}>
              {tab === 'active'
                ? 'New delivery assignments will appear here.'
                : 'Your completed deliveries will show up here.'}
            </Text>
          </View>
        ) : (
          orders.map((order) => (
            <TouchableOpacity
              key={order._id}
              onPress={() => tab === 'active' && router.push(`/(driver)/order/${order._id}`)}
              activeOpacity={tab === 'active' ? 0.7 : 1}
            >
              <Card style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textPrimary }}>
                    {order.orderNumber}
                  </Text>
                  <StatusBadge status={order.status} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                  <Ionicons name="location" size={14} color={c.brand} />
                  <Text style={{ fontSize: fontSize.sm, color: c.textSecondary, marginLeft: 4, flex: 1 }} numberOfLines={1}>
                    {order.pickupAddress?.line1 || order.pickupAddress?.label || 'Pickup'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="flag" size={14} color={c.success} />
                  <Text style={{ fontSize: fontSize.sm, color: c.textSecondary, marginLeft: 4, flex: 1 }} numberOfLines={1}>
                    {order.deliveryAddress?.line1 || order.deliveryAddress?.label || 'Delivery'}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: spacing.md,
                    paddingTop: spacing.md,
                    borderTopWidth: 1,
                    borderTopColor: c.border,
                  }}
                >
                  <Text style={{ fontSize: fontSize.sm, color: c.textSecondary }}>
                    {(order.customerId as any)?.name || 'Customer'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: c.textPrimary }}>
                      ${order.pricing?.total?.toFixed(2) || '0.00'}
                    </Text>
                    {tab === 'active' && <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />}
                  </View>
                </View>
                {tab === 'completed' && (
                  <Text style={{ fontSize: fontSize.xs, color: c.textTertiary, marginTop: spacing.xs }}>
                    {ORDER_STATUS_LABELS[order.status] || order.status} · {new Date(order.createdAt).toLocaleDateString()}
                  </Text>
                )}
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
