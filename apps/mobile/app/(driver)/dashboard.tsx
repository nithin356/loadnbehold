import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, RefreshControl, Modal, ActivityIndicator } from 'react-native';
import { toast } from 'sonner-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/lib/haptics';
import * as Location from '@/lib/location';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthStore } from '@/lib/store';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { driverApi } from '@/lib/api';
import { WS_EVENTS } from '@loadnbehold/constants';

interface AssignedOrder {
  _id: string;
  orderNumber: string;
  status: string;
  customerId?: { name: string; phone: string };
  pickupAddress?: { label?: string; line1?: string; city?: string };
  deliveryAddress?: { label?: string; line1?: string; city?: string };
  pricing?: { total: number };
}

export default function DriverDashboard() {
  const c = useThemeColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [isOnline, setIsOnline] = useState(false);
  const [assignedOrders, setAssignedOrders] = useState<AssignedOrder[]>([]);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [locationWatcher, setLocationWatcher] = useState<Location.LocationSubscription | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [incomingOrder, setIncomingOrder] = useState<any>(null);
  const [respondingToOrder, setRespondingToOrder] = useState(false);

  // Fetch driver profile + orders
  const loadData = useCallback(async () => {
    try {
      const [profile, orders] = await Promise.all([
        driverApi.getProfile().catch(() => null),
        driverApi.getOrders().catch(() => []),
      ]);
      if (profile) setDriverProfile(profile);
      setAssignedOrders(Array.isArray(orders) ? orders : []);
    } catch {
      toast.error('Failed to load dashboard data');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for new order assignments via socket
  useEffect(() => {
    if (!isOnline) return;
    const socket = getSocket();
    const handleNewOrder = (data: any) => {
      if (data?.order) {
        setIncomingOrder(data.order);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      loadData();
    };
    const handleStatusUpdate = () => loadData();
    socket.on(WS_EVENTS.DRIVER_NEW_ORDER, handleNewOrder);
    socket.on(WS_EVENTS.ORDER_STATUS, handleStatusUpdate);
    return () => {
      socket.off(WS_EVENTS.DRIVER_NEW_ORDER, handleNewOrder);
      socket.off(WS_EVENTS.ORDER_STATUS, handleStatusUpdate);
    };
  }, [isOnline, loadData]);

  const handleAcceptOrder = async (orderId: string) => {
    setRespondingToOrder(true);
    try {
      await driverApi.acceptOrder(orderId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIncomingOrder(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept order');
    } finally {
      setRespondingToOrder(false);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    setRespondingToOrder(true);
    try {
      await driverApi.rejectOrder(orderId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIncomingOrder(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject order');
    } finally {
      setRespondingToOrder(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const toggleOnline = async () => {
    const newStatus = !isOnline;

    if (newStatus) {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Location permission is needed to go online');
        return;
      }

      // Connect socket FIRST
      connectSocket();

      // Get driver profile for driverId
      let driverId = driverProfile?._id;
      if (!driverId) {
        try {
          const profile = await driverApi.getProfile();
          setDriverProfile(profile);
          driverId = profile._id;
        } catch {
          toast.error('Could not load driver profile');
          return;
        }
      }

      // Toggle status on server
      try {
        await driverApi.toggleStatus();
      } catch {
        toast.warning('Could not update online status on server');
      }

      // Start location tracking AFTER socket is connected
      const watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location: Location.LocationObject) => {
          const socket = getSocket();
          if (socket.connected) {
            socket.emit(WS_EVENTS.DRIVER_LOCATION, {
              driverId,
              location: {
                type: 'Point',
                coordinates: [location.coords.longitude, location.coords.latitude],
              },
              speed: location.coords.speed ?? undefined,
              heading: location.coords.heading ?? undefined,
            });
          }
        }
      );
      setLocationWatcher(watcher);

      // Refresh orders
      loadData();
    } else {
      // Going offline
      locationWatcher?.remove();
      setLocationWatcher(null);
      try {
        await driverApi.toggleStatus();
      } catch {
        toast.warning('Could not update offline status on server');
      }
      disconnectSocket();
    }

    setIsOnline(newStatus);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const todayDeliveries = driverProfile?.metrics?.totalDeliveries || 0;
  const rating = driverProfile?.metrics?.rating?.toFixed(1) || '5.0';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} />}
      >
        <View style={{ padding: spacing.xl }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
            <View>
              <Text style={{ fontSize: fontSize.sm, color: c.textSecondary }}>Welcome back</Text>
              <Text style={{ fontSize: fontSize.xl, fontWeight: '700', color: c.textPrimary }}>
                {user?.name || 'Driver'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: isOnline ? c.success : c.textTertiary }}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
              <Switch
                value={isOnline}
                onValueChange={toggleOnline}
                trackColor={{ false: c.border, true: c.success }}
                thumbColor="#FFF"
              />
            </View>
          </View>

          {/* Status Banner */}
          <View
            style={{
              borderRadius: radius.xl,
              padding: spacing.xl,
              backgroundColor: isOnline ? c.success : c.surfaceSecondary,
              marginBottom: spacing.xl,
              alignItems: 'center',
            }}
          >
            <Ionicons
              name={isOnline ? 'radio-outline' : 'power-outline'}
              size={40}
              color={isOnline ? '#FFF' : c.textTertiary}
            />
            <Text
              style={{
                fontSize: fontSize.lg,
                fontWeight: '700',
                color: isOnline ? '#FFF' : c.textSecondary,
                marginTop: spacing.sm,
              }}
            >
              {isOnline ? "You're online!" : 'Go online to receive orders'}
            </Text>
            {isOnline && (
              <Text style={{ fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
                GPS is broadcasting your location
              </Text>
            )}
          </View>

          {/* Quick Stats */}
          <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl }}>
            {[
              { label: 'Deliveries', value: String(todayDeliveries), icon: 'bicycle-outline' as const },
              { label: 'Earnings', value: `$${driverProfile?.cashBalance?.toFixed(0) || '0'}`, icon: 'cash-outline' as const },
              { label: 'Rating', value: rating, icon: 'star-outline' as const },
            ].map((stat) => (
              <Card key={stat.label} style={{ flex: 1, alignItems: 'center' }}>
                <Ionicons name={stat.icon} size={22} color={c.brand} />
                <Text style={{ fontSize: fontSize.xl, fontWeight: '700', color: c.textPrimary, marginTop: spacing.xs }}>
                  {stat.value}
                </Text>
                <Text style={{ fontSize: fontSize.xs, color: c.textSecondary }}>{stat.label}</Text>
              </Card>
            ))}
          </View>

          {/* Assigned Orders */}
          <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary, marginBottom: spacing.md }}>
            Active Orders
          </Text>

          {assignedOrders.length === 0 ? (
            <Card>
              <View style={{ alignItems: 'center', padding: spacing.xl }}>
                <Ionicons name="documents-outline" size={40} color={c.textTertiary} />
                <Text style={{ color: c.textSecondary, marginTop: spacing.sm }}>
                  {isOnline ? 'No active orders. Hang tight!' : 'Go online to start receiving orders'}
                </Text>
              </View>
            </Card>
          ) : (
            assignedOrders.map((order) => (
              <TouchableOpacity
                key={order._id}
                onPress={() => router.push(`/(driver)/order/${order._id}`)}
                activeOpacity={0.7}
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
                      <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Incoming Order Modal */}
      <Modal
        visible={!!incomingOrder}
        transparent
        animationType="slide"
        onRequestClose={() => setIncomingOrder(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl }}>
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: spacing.lg }} />
              <Ionicons name="notifications" size={32} color={c.brand} />
              <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary, marginTop: spacing.sm }}>
                New Order!
              </Text>
            </View>

            {incomingOrder && (
              <Card style={{ marginBottom: spacing.lg }}>
                <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textPrimary, marginBottom: spacing.sm }}>
                  {incomingOrder.orderNumber || 'Order'}
                </Text>
                {incomingOrder.pickupAddress?.line1 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                    <Ionicons name="location" size={14} color={c.brand} />
                    <Text style={{ fontSize: fontSize.sm, color: c.textSecondary, marginLeft: 4, flex: 1 }} numberOfLines={1}>
                      {incomingOrder.pickupAddress.line1}
                    </Text>
                  </View>
                )}
                {incomingOrder.deliveryAddress?.line1 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                    <Ionicons name="flag" size={14} color={c.success} />
                    <Text style={{ fontSize: fontSize.sm, color: c.textSecondary, marginLeft: 4, flex: 1 }} numberOfLines={1}>
                      {incomingOrder.deliveryAddress.line1}
                    </Text>
                  </View>
                )}
                {incomingOrder.pricing?.total != null && (
                  <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary, marginTop: spacing.sm }}>
                    ${incomingOrder.pricing.total.toFixed(2)}
                  </Text>
                )}
              </Card>
            )}

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <TouchableOpacity
                onPress={() => incomingOrder && handleRejectOrder(incomingOrder._id)}
                disabled={respondingToOrder}
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: radius.xl,
                  borderWidth: 1.5,
                  borderColor: c.error,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: respondingToOrder ? 0.6 : 1,
                }}
              >
                {respondingToOrder ? (
                  <ActivityIndicator size="small" color={c.error} />
                ) : (
                  <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: c.error }}>Reject</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => incomingOrder && handleAcceptOrder(incomingOrder._id)}
                disabled={respondingToOrder}
                style={{
                  flex: 2,
                  height: 52,
                  borderRadius: radius.xl,
                  backgroundColor: c.success,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: respondingToOrder ? 0.6 : 1,
                }}
              >
                {respondingToOrder ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#FFF' }}>Accept Order</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setIncomingOrder(null)}
              style={{ alignItems: 'center', marginTop: spacing.md }}
            >
              <Text style={{ fontSize: fontSize.sm, color: c.textTertiary }}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
