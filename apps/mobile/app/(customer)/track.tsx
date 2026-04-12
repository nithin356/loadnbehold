import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { ordersApi } from '@/lib/api';
import { connectSocket, subscribeToOrder, unsubscribeFromOrder, getSocket } from '@/lib/socket';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, WS_EVENTS } from '@loadnbehold/constants';

interface TrackingOrder {
  _id: string;
  orderNumber: string;
  status: string;
  timeline: { status: string; timestamp: string; note?: string }[];
  driver?: {
    name: string;
    phone: string;
    vehicle: { type: string; number: string };
    metrics: { rating: number };
  };
  schedule?: { pickupDate: string; pickupSlot: string; deliveryDate: string; deliverySlot: string };
}

export default function TrackScreen() {
  const c = useThemeColors();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!orderId) return;

    loadOrder();
    connectSocket();
    subscribeToOrder(orderId);

    const socket = getSocket();
    socket.on(WS_EVENTS.ORDER_TRACKING, (data: { driverId: string; location: { type: string; coordinates: [number, number] }; speed?: number; heading?: number }) => {
      const [lng, lat] = data.location?.coordinates || [];
      if (lng != null && lat != null) {
        setDriverLocation({ lat, lng });
      }
    });

    socket.on(WS_EVENTS.ORDER_STATUS, (data: { orderId: string; status: string }) => {
      if (data.orderId === orderId) {
        setOrder((prev) => (prev ? { ...prev, status: data.status } : null));
      }
    });

    return () => {
      unsubscribeFromOrder(orderId);
      socket.off(WS_EVENTS.ORDER_TRACKING);
      socket.off(WS_EVENTS.ORDER_STATUS);
    };
  }, [orderId]);

  const loadOrder = async () => {
    if (!orderId) return;
    try {
      const data = await ordersApi.track(orderId);
      setOrder(data);
    } catch {
      Alert.alert('Error', 'Failed to load tracking data');
    }
  };

  const statusIndex = ORDER_STATUSES.indexOf(order?.status as typeof ORDER_STATUSES[number] || '' as typeof ORDER_STATUSES[number]);
  const allStatuses = ORDER_STATUSES.filter((s) => s !== 'cancelled');

  if (!orderId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="map-outline" size={64} color={c.textTertiary} />
        <Text style={{ fontSize: fontSize.lg, fontWeight: '600', color: c.textPrimary, marginTop: spacing.lg }}>
          No active tracking
        </Text>
        <Text style={{ fontSize: fontSize.base, color: c.textSecondary, marginTop: spacing.sm, textAlign: 'center', paddingHorizontal: spacing['3xl'] }}>
          Select an order from your Orders tab to track it live.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Map Area */}
        <TouchableOpacity
          onPress={() => {
            if (driverLocation) {
              Linking.openURL(`https://maps.google.com/?q=${driverLocation.lat},${driverLocation.lng}`);
            }
          }}
          activeOpacity={driverLocation ? 0.7 : 1}
          style={{
            height: 220,
            backgroundColor: c.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={driverLocation ? 'navigate-circle' : 'map'} size={48} color={driverLocation ? c.brand : c.textTertiary} />
          <Text style={{ color: driverLocation ? c.textPrimary : c.textTertiary, fontSize: fontSize.sm, marginTop: spacing.sm, fontWeight: driverLocation ? '600' : '400' }}>
            {driverLocation
              ? `Driver location: ${driverLocation.lat.toFixed(4)}, ${driverLocation.lng.toFixed(4)}`
              : 'Waiting for driver location...'}
          </Text>
          {driverLocation && (
            <Text style={{ color: c.brand, fontSize: fontSize.xs, marginTop: 4 }}>
              Tap to open in Maps
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ padding: spacing.xl }}>
          {/* Order Header */}
          {order && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
              <View>
                <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>
                  {order.orderNumber}
                </Text>
                <Text style={{ fontSize: fontSize.sm, color: c.textSecondary, marginTop: 2 }}>
                  {(ORDER_STATUS_LABELS as Record<string, string>)[order.status] || order.status}
                </Text>
              </View>
              <StatusBadge status={order.status} />
            </View>
          )}

          {/* Driver Card */}
          {order?.driver && (
            <Card style={{ marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: radius.full,
                    backgroundColor: c.brand,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: spacing.md,
                  }}
                >
                  <Ionicons name="person" size={24} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: c.textPrimary }}>
                    {order.driver.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Ionicons name="star" size={14} color={c.warning} />
                    <Text style={{ fontSize: fontSize.sm, color: c.textSecondary, marginLeft: 4 }}>
                      {order.driver.metrics?.rating?.toFixed(1) || 'N/A'}
                    </Text>
                    <Text style={{ fontSize: fontSize.sm, color: c.textTertiary, marginLeft: spacing.sm }}>
                      {order.driver.vehicle?.type} · {order.driver.vehicle?.number}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (order.driver?.phone) {
                      Linking.openURL(`tel:${order.driver.phone}`);
                    }
                  }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.full,
                    backgroundColor: c.successLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="call" size={18} color={c.success} />
                </TouchableOpacity>
              </View>
            </Card>
          )}

          {/* Timeline */}
          <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary, marginBottom: spacing.lg }}>
            Order Timeline
          </Text>

          {allStatuses.map((status, idx) => {
            const isCompleted = idx <= statusIndex;
            const isCurrent = idx === statusIndex;
            const isLast = idx === allStatuses.length - 1;

            return (
              <View key={status} style={{ flexDirection: 'row', minHeight: 56 }}>
                {/* Dot + Line */}
                <View style={{ width: 32, alignItems: 'center' }}>
                  <View
                    style={{
                      width: isCurrent ? 16 : 12,
                      height: isCurrent ? 16 : 12,
                      borderRadius: radius.full,
                      backgroundColor: isCompleted ? c.brand : c.border,
                      borderWidth: isCurrent ? 3 : 0,
                      borderColor: c.brandLight,
                    }}
                  />
                  {!isLast && (
                    <View
                      style={{
                        flex: 1,
                        width: 2,
                        backgroundColor: isCompleted ? c.brand : c.border,
                        marginVertical: 2,
                      }}
                    />
                  )}
                </View>

                {/* Content */}
                <View style={{ flex: 1, paddingBottom: spacing.lg, paddingLeft: spacing.sm }}>
                  <Text
                    style={{
                      fontSize: fontSize.sm,
                      fontWeight: isCompleted ? '600' : '400',
                      color: isCompleted ? c.textPrimary : c.textTertiary,
                    }}
                  >
                    {(ORDER_STATUS_LABELS as Record<string, string>)[status] || status.replace(/_/g, ' ')}
                  </Text>
                  {order?.timeline?.find((t) => t.status === status) && (
                    <Text style={{ fontSize: fontSize.xs, color: c.textSecondary, marginTop: 2 }}>
                      {new Date(order.timeline.find((t) => t.status === status)!.timestamp).toLocaleTimeString(
                        'en-US',
                        { hour: 'numeric', minute: '2-digit' }
                      )}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
