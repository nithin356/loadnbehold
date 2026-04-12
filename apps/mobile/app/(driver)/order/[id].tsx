import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { driverApi } from '@/lib/api';
import { ORDER_STATUS_LABELS } from '@loadnbehold/constants';

// Driver can advance order through these statuses
const DRIVER_STATUS_FLOW: Record<string, { next: string; label: string; icon: string; color: string }> = {
  driver_assigned: { next: 'pickup_enroute', label: 'Start Pickup', icon: 'navigate', color: '#2563EB' },
  pickup_enroute: { next: 'picked_up', label: 'Confirm Pickup', icon: 'checkmark-circle', color: '#F59E0B' },
  picked_up: { next: 'at_laundry', label: 'Arrived at Laundry', icon: 'business', color: '#EC4899' },
  at_laundry: { next: 'processing', label: 'Hand Over to Facility', icon: 'swap-horizontal', color: '#8B5CF6' },
  ready_for_delivery: { next: 'out_for_delivery', label: 'Start Delivery', icon: 'navigate', color: '#2563EB' },
  out_for_delivery: { next: 'delivered', label: 'Confirm Delivery', icon: 'checkmark-done-circle', color: '#16A34A' },
};

export default function DriverOrderDetail() {
  const c = useThemeColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      // Use the orders list and find this one
      const orders = await driverApi.getOrders();
      const found = (orders || []).find((o: any) => o._id === id);
      if (found) setOrder(found);
    } catch {
      Alert.alert('Error', 'Failed to load order details');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrder();
    setRefreshing(false);
  };

  const handleAdvanceStatus = async () => {
    if (!order || !id) return;
    const flow = DRIVER_STATUS_FLOW[order.status];
    if (!flow) return;

    Alert.alert(
      flow.label,
      `Update order to "${ORDER_STATUS_LABELS[flow.next] || flow.next}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdating(true);
            try {
              await driverApi.updateOrderStatus(id, flow.next);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await loadOrder();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update status');
            }
            setUpdating(false);
          },
        },
      ]
    );
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleOpenMaps = (coords?: [number, number], label?: string) => {
    if (!coords) return;
    const [lng, lat] = coords;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="hourglass-outline" size={40} color={c.textTertiary} />
        <Text style={{ color: c.textSecondary, marginTop: spacing.md }}>Loading order...</Text>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="alert-circle-outline" size={40} color={c.error} />
        <Text style={{ color: c.textSecondary, marginTop: spacing.md }}>Order not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing.lg }}>
          <Text style={{ color: c.brand, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusFlow = DRIVER_STATUS_FLOW[order.status];
  const customerPhone = order.customerId?.phone;
  const pickupCoords = order.pickupAddress?.location?.coordinates;
  const deliveryCoords = order.deliveryAddress?.location?.coordinates;
  const outletCoords = order.outletId?.address?.location?.coordinates;

  // Determine which location to navigate to based on status
  const getNavigationTarget = () => {
    if (['driver_assigned', 'pickup_enroute'].includes(order.status)) {
      return { coords: pickupCoords, label: 'Pickup' };
    }
    if (['picked_up'].includes(order.status)) {
      return { coords: outletCoords, label: 'Outlet' };
    }
    if (['ready_for_delivery', 'out_for_delivery'].includes(order.status)) {
      return { coords: deliveryCoords, label: 'Delivery' };
    }
    return null;
  };

  const navTarget = getNavigationTarget();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>{order.orderNumber}</Text>
          <Text style={{ fontSize: fontSize.xs, color: c.textSecondary }}>{ORDER_STATUS_LABELS[order.status] || order.status}</Text>
        </View>
        <StatusBadge status={order.status} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} />}
        contentContainerStyle={{ padding: spacing.lg }}
      >
        {/* Navigate Button */}
        {navTarget?.coords && (
          <TouchableOpacity
            onPress={() => handleOpenMaps(navTarget.coords, navTarget.label)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: c.brand,
              borderRadius: radius.xl,
              padding: spacing.lg,
              marginBottom: spacing.lg,
              gap: spacing.sm,
            }}
          >
            <Ionicons name="navigate" size={20} color="#FFF" />
            <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#FFF' }}>
              Navigate to {navTarget.label}
            </Text>
          </TouchableOpacity>
        )}

        {/* Customer Card */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm }}>
            Customer
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={{ width: 44, height: 44, borderRadius: radius.full, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
                <Ionicons name="person" size={22} color={c.brand} />
              </View>
              <View>
                <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: c.textPrimary }}>
                  {order.customerId?.name || 'Customer'}
                </Text>
                {customerPhone && (
                  <Text style={{ fontSize: fontSize.sm, color: c.textSecondary }}>{customerPhone}</Text>
                )}
              </View>
            </View>
            {customerPhone && (
              <TouchableOpacity
                onPress={() => handleCall(customerPhone)}
                style={{ width: 44, height: 44, borderRadius: radius.full, backgroundColor: c.successLight, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="call" size={20} color={c.success} />
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {/* Addresses */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md }}>
            Addresses
          </Text>

          {/* Pickup */}
          <TouchableOpacity
            onPress={() => pickupCoords && handleOpenMaps(pickupCoords, 'Pickup')}
            style={{ flexDirection: 'row', marginBottom: spacing.lg }}
          >
            <View style={{ width: 32, height: 32, borderRadius: radius.full, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm }}>
              <Ionicons name="location" size={16} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.xs, fontWeight: '600', color: c.textTertiary }}>PICKUP</Text>
              <Text style={{ fontSize: fontSize.sm, color: c.textPrimary, marginTop: 2 }}>
                {order.pickupAddress?.line1 || 'N/A'}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: c.textSecondary }}>
                {order.pickupAddress?.city}, {order.pickupAddress?.state} {order.pickupAddress?.zip}
              </Text>
            </View>
            <Ionicons name="navigate-outline" size={18} color={c.textTertiary} />
          </TouchableOpacity>

          {/* Outlet */}
          {order.outletId && (
            <TouchableOpacity
              onPress={() => outletCoords && handleOpenMaps(outletCoords, 'Outlet')}
              style={{ flexDirection: 'row', marginBottom: spacing.lg }}
            >
              <View style={{ width: 32, height: 32, borderRadius: radius.lg, backgroundColor: '#FCE7F3', alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm }}>
                <Ionicons name="storefront" size={16} color="#EC4899" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fontSize.xs, fontWeight: '600', color: c.textTertiary }}>OUTLET</Text>
                <Text style={{ fontSize: fontSize.sm, color: c.textPrimary, marginTop: 2 }}>
                  {order.outletId?.name || 'LoadNBehold Outlet'}
                </Text>
                {order.outletId?.address && (
                  <Text style={{ fontSize: fontSize.xs, color: c.textSecondary }}>
                    {order.outletId.address.line1}, {order.outletId.address.city}
                  </Text>
                )}
              </View>
              <Ionicons name="navigate-outline" size={18} color={c.textTertiary} />
            </TouchableOpacity>
          )}

          {/* Delivery */}
          <TouchableOpacity
            onPress={() => deliveryCoords && handleOpenMaps(deliveryCoords, 'Delivery')}
            style={{ flexDirection: 'row' }}
          >
            <View style={{ width: 32, height: 32, borderRadius: radius.full, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm }}>
              <Ionicons name="home" size={16} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.xs, fontWeight: '600', color: c.textTertiary }}>DELIVERY</Text>
              <Text style={{ fontSize: fontSize.sm, color: c.textPrimary, marginTop: 2 }}>
                {order.deliveryAddress?.line1 || 'N/A'}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: c.textSecondary }}>
                {order.deliveryAddress?.city}, {order.deliveryAddress?.state} {order.deliveryAddress?.zip}
              </Text>
            </View>
            <Ionicons name="navigate-outline" size={18} color={c.textTertiary} />
          </TouchableOpacity>
        </Card>

        {/* Order Items */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm }}>
            Items
          </Text>
          {order.items?.map((item: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: i < order.items.length - 1 ? 1 : 0, borderBottomColor: c.border }}>
              <Text style={{ fontSize: fontSize.sm, color: c.textPrimary }}>{item.service?.replace(/_/g, ' ')} x{item.quantity}</Text>
              <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textPrimary }}>${item.price?.toFixed(2)}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: c.border }}>
            <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: c.textPrimary }}>Total</Text>
            <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: c.brand }}>${order.pricing?.total?.toFixed(2)}</Text>
          </View>
          {order.paymentMethod === 'cod' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, backgroundColor: c.warningLight, borderRadius: radius.md, padding: spacing.sm }}>
              <Ionicons name="cash" size={16} color={c.warning} />
              <Text style={{ fontSize: fontSize.xs, fontWeight: '600', color: c.warning, marginLeft: spacing.xs }}>
                Cash on Delivery — Collect ${order.pricing?.total?.toFixed(2)}
              </Text>
            </View>
          )}
        </Card>

        {/* Special Instructions */}
        {order.pickupAddress?.instructions && (
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs }}>
              Instructions
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: c.textSecondary }}>{order.pickupAddress.instructions}</Text>
          </Card>
        )}

        {/* Timeline */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md }}>
            Timeline
          </Text>
          {order.timeline?.map((entry: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', marginBottom: i < order.timeline.length - 1 ? spacing.md : 0 }}>
              <View style={{ width: 24, alignItems: 'center', marginRight: spacing.sm }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.success }} />
                {i < order.timeline.length - 1 && (
                  <View style={{ width: 2, flex: 1, backgroundColor: c.border, marginVertical: 2 }} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textPrimary }}>
                  {ORDER_STATUS_LABELS[entry.status] || entry.status}
                </Text>
                <Text style={{ fontSize: fontSize.xs, color: c.textSecondary }}>
                  {new Date(entry.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Bottom spacer for action button */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Sticky Action Button */}
      {statusFlow && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, paddingBottom: spacing.xl, backgroundColor: c.background, borderTopWidth: 1, borderTopColor: c.border }}>
          <TouchableOpacity
            onPress={handleAdvanceStatus}
            disabled={updating}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: statusFlow.color,
              borderRadius: radius.xl,
              padding: spacing.lg,
              opacity: updating ? 0.6 : 1,
              gap: spacing.sm,
            }}
          >
            <Ionicons name={statusFlow.icon as any} size={22} color="#FFF" />
            <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#FFF' }}>
              {updating ? 'Updating...' : statusFlow.label}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
