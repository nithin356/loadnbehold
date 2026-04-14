import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, ActivityIndicator, Platform } from 'react-native';
import { toast } from 'sonner-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MapView, Marker, Polyline, PROVIDER_GOOGLE } from '@/lib/maps';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { TrackingSkeleton } from '@/components/Skeleton';
import { ordersApi } from '@/lib/api';
import { connectSocket, subscribeToOrder, unsubscribeFromOrder, getSocket } from '@/lib/socket';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, WS_EVENTS } from '@loadnbehold/constants';

interface TrackingOrder {
  _id: string;
  orderNumber: string;
  status: string;
  driverId?: string;
  timeline: { status: string; timestamp: string; note?: string }[];
  driver?: {
    name: string;
    phone: string;
    vehicle: { type: string; number: string };
    metrics: { rating: number };
  };
  pickupAddress?: { line1: string; city: string; location?: { coordinates: [number, number] } };
  deliveryAddress?: { line1: string; city: string; location?: { coordinates: [number, number] } };
  schedule?: { pickupDate: string; pickupSlot: string; deliveryDate: string; deliverySlot: string };
}

// Color + icon map for timeline statuses
const TIMELINE_META: Record<string, { color: string; icon: string }> = {
  placed:              { color: '#3B82F6', icon: 'receipt-outline' },
  confirmed:           { color: '#3B82F6', icon: 'checkmark-circle-outline' },
  driver_assigned:     { color: '#6366F1', icon: 'person-outline' },
  pickup_enroute:      { color: '#F59E0B', icon: 'car-outline' },
  picked_up:           { color: '#F59E0B', icon: 'bag-check-outline' },
  at_laundry:          { color: '#8B5CF6', icon: 'business-outline' },
  processing:          { color: '#8B5CF6', icon: 'cog-outline' },
  quality_check:       { color: '#8B5CF6', icon: 'shield-checkmark-outline' },
  ready_for_delivery:  { color: '#06B6D4', icon: 'sparkles-outline' },
  out_for_delivery:    { color: '#F59E0B', icon: 'bicycle-outline' },
  delivered:           { color: '#10B981', icon: 'checkmark-done-circle-outline' },
};

const LEGEND_COLORS = { driver: '#3B82F6', pickup: '#F59E0B', delivery: '#10B981' };
const LEGEND = [
  { color: LEGEND_COLORS.driver, label: 'Driver' },
  { color: LEGEND_COLORS.pickup, label: 'Pickup' },
  { color: LEGEND_COLORS.delivery, label: 'Delivery' },
];

// ─── OSRM road routing (same free API as web) ──────────────────
interface LatLng { latitude: number; longitude: number }

const routeCache = new Map<string, LatLng[]>();

async function fetchOSRMRoute(from: LatLng, to: LatLng): Promise<LatLng[]> {
  const key = `${from.latitude.toFixed(4)},${from.longitude.toFixed(4)}-${to.latitude.toFixed(4)},${to.longitude.toFixed(4)}`;
  const cached = routeCache.get(key);
  if (cached) return cached;

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const coords = data.routes?.[0]?.geometry?.coordinates;
    if (!coords?.length) return [];
    const points: LatLng[] = coords.map((c: [number, number]) => ({ latitude: c[1], longitude: c[0] }));
    // Cap cache size
    if (routeCache.size > 50) {
      const firstKey = routeCache.keys().next().value;
      if (firstKey) routeCache.delete(firstKey);
    }
    routeCache.set(key, points);
    return points;
  } catch {
    return [];
  }
}

// Haversine distance in meters
function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos((a.latitude * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Dead reckoning: interpolate between two points
function interpolate(from: LatLng, to: LatLng, t: number): LatLng {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * clamped,
    longitude: from.longitude + (to.longitude - from.longitude) * clamped,
  };
}

const DEMO_ORDER: TrackingOrder = {
  _id: 'demo',
  orderNumber: 'LNB-2026-0042',
  status: 'out_for_delivery',
  timeline: [
    { status: 'placed', timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
    { status: 'confirmed', timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString() },
    { status: 'picked_up', timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
    { status: 'processing', timestamp: new Date(Date.now() - 3600000 * 1).toISOString() },
    { status: 'out_for_delivery', timestamp: new Date(Date.now() - 600000).toISOString() },
  ],
  driver: {
    name: 'Marcus Johnson',
    phone: '+15551234567',
    vehicle: { type: 'Van', number: 'CA-4821' },
    metrics: { rating: 4.8 },
  },
  pickupAddress: {
    line1: '742 Evergreen Terrace',
    city: 'Springfield',
    location: { coordinates: [-122.4194, 37.7749] },
  },
  deliveryAddress: {
    line1: '123 Main Street',
    city: 'Springfield',
    location: { coordinates: [-122.4094, 37.7849] },
  },
};

export default function TrackScreen() {
  const c = useThemeColors();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverSpeed, setDriverSpeed] = useState<number | null>(null);
  const [driverHeading, setDriverHeading] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);

  // Dead reckoning state
  const lastGpsRef = useRef<LatLng | null>(null);
  const animFrameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const [animatedDriverPos, setAnimatedDriverPos] = useState<LatLng | null>(null);

  // Road route state
  const [activeRoute, setActiveRoute] = useState<LatLng[]>([]);
  const [backgroundRoutes, setBackgroundRoutes] = useState<LatLng[][]>([]);
  const lastRouteDriverRef = useRef<LatLng | null>(null);
  const lastRouteStatusRef = useRef<string>('');

  useEffect(() => {
    if (!orderId) {
      if (__DEV__) {
        // Show demo data only in development
        setOrder(DEMO_ORDER);
        setDriverLocation({ lat: 37.7799, lng: -122.4144 });
        setDriverSpeed(28);
        setDriverHeading(45);
      }
      setLoading(false);
      return;
    }

    loadOrder();
  }, [orderId]);

  // Subscribe to real-time tracking once we have the order + driverId
  useEffect(() => {
    if (!orderId || !order?.driverId) return;

    connectSocket();
    subscribeToOrder(orderId, order.driverId);

    const socket = getSocket();

    const handleTracking = (data: { driverId: string; location: { type: string; coordinates: [number, number] }; speed?: number; heading?: number }) => {
      const [lng, lat] = data.location?.coordinates || [];
      if (lng != null && lat != null) {
        setDriverLocation({ lat, lng });
        if (data.speed != null) setDriverSpeed(Math.round(data.speed * 2.237)); // m/s to mph
        if (data.heading != null) setDriverHeading(data.heading);
      }
    };

    const handleStatus = (data: { orderId: string; status: string }) => {
      if (data.orderId === orderId) {
        setOrder((prev) => (prev ? { ...prev, status: data.status } : null));
      }
    };

    socket.on(WS_EVENTS.ORDER_TRACKING, handleTracking);
    socket.on(WS_EVENTS.ORDER_STATUS, handleStatus);

    return () => {
      unsubscribeFromOrder(orderId, order.driverId);
      socket.off(WS_EVENTS.ORDER_TRACKING, handleTracking);
      socket.off(WS_EVENTS.ORDER_STATUS, handleStatus);
    };
  }, [orderId, order?.driverId]);

  const loadOrder = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const data = await ordersApi.track(orderId);
      setOrder(data);
    } catch {
      toast.error('Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  // ─── Dead reckoning: smooth interpolation between GPS pings ────
  useEffect(() => {
    if (!driverLocation) return;
    const newPos: LatLng = { latitude: driverLocation.lat, longitude: driverLocation.lng };
    const prevPos = lastGpsRef.current;

    if (!prevPos) {
      // First position — snap immediately
      lastGpsRef.current = newPos;
      setAnimatedDriverPos(newPos);
      return;
    }

    // Animate from previous to new over ~4 seconds (GPS interval is 5s, animate slightly less)
    const DURATION = 4000;
    const startTime = Date.now();

    // Cancel any running animation
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / DURATION, 1);
      // Ease-out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedDriverPos(interpolate(prevPos, newPos, eased));

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        lastGpsRef.current = newPos;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [driverLocation]);

  // ─── OSRM road route fetching (status-aware, throttled) ──────
  const buildRoutes = useCallback(async () => {
    if (!order) return;
    const status = order.status;
    const driverPos = driverLocation
      ? { latitude: driverLocation.lat, longitude: driverLocation.lng }
      : null;
    const pickup = order.pickupAddress?.location?.coordinates
      ? { latitude: order.pickupAddress.location.coordinates[1], longitude: order.pickupAddress.location.coordinates[0] }
      : null;
    const delivery = order.deliveryAddress?.location?.coordinates
      ? { latitude: order.deliveryAddress.location.coordinates[1], longitude: order.deliveryAddress.location.coordinates[0] }
      : null;

    // Throttle: only re-fetch if driver moved >100m or status changed
    const statusChanged = status !== lastRouteStatusRef.current;
    const driverMoved = driverPos && lastRouteDriverRef.current
      ? distanceMeters(driverPos, lastRouteDriverRef.current) > 100
      : !!driverPos;
    const isFirstDraw = activeRoute.length === 0 && backgroundRoutes.length === 0;

    if (!isFirstDraw && !statusChanged && !driverMoved) return;

    lastRouteStatusRef.current = status;
    if (driverPos) lastRouteDriverRef.current = { ...driverPos };

    // Background routes (dim): full journey path
    const bgRoutes: LatLng[][] = [];
    if (pickup && delivery) {
      bgRoutes.push(await fetchOSRMRoute(pickup, delivery));
    }

    // Active route (bright): driver's current segment
    let active: LatLng[] = [];
    if (driverPos) {
      if (['driver_assigned', 'pickup_enroute'].includes(status) && pickup) {
        active = await fetchOSRMRoute(driverPos, pickup);
      } else if (status === 'picked_up' && delivery) {
        active = await fetchOSRMRoute(driverPos, delivery);
      } else if (status === 'out_for_delivery' && delivery) {
        active = await fetchOSRMRoute(driverPos, delivery);
      }
    }

    setBackgroundRoutes(bgRoutes);
    setActiveRoute(active);
  }, [order?.status, driverLocation, order?.pickupAddress, order?.deliveryAddress]);

  useEffect(() => { buildRoutes(); }, [buildRoutes]);

  // Extract coordinates for map
  const pickupCoords = order?.pickupAddress?.location?.coordinates
    ? { latitude: order.pickupAddress.location.coordinates[1], longitude: order.pickupAddress.location.coordinates[0] }
    : null;
  const deliveryCoords = order?.deliveryAddress?.location?.coordinates
    ? { latitude: order.deliveryAddress.location.coordinates[1], longitude: order.deliveryAddress.location.coordinates[0] }
    : null;
  // Use dead-reckoned position for smooth rendering, fall back to raw GPS
  const driverCoords = animatedDriverPos
    || (driverLocation ? { latitude: driverLocation.lat, longitude: driverLocation.lng } : null);

  // Fit map to all markers
  useEffect(() => {
    const coords = [pickupCoords, deliveryCoords, driverCoords].filter(Boolean) as { latitude: number; longitude: number }[];
    if (coords.length > 0 && mapRef.current?.fitToCoordinates) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    }
  }, [driverLocation, order]);

  const recenterMap = () => {
    const coords = [pickupCoords, deliveryCoords, driverCoords].filter(Boolean) as { latitude: number; longitude: number }[];
    if (coords.length > 0 && mapRef.current?.fitToCoordinates) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    }
  };

  const statusIndex = ORDER_STATUSES.indexOf(order?.status as typeof ORDER_STATUSES[number] || '' as typeof ORDER_STATUSES[number]);
  const allStatuses = ORDER_STATUSES.filter((s) => s !== 'cancelled');

  const isDemo = !orderId;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
        <TrackingSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Demo Banner */}
        {isDemo && (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, backgroundColor: c.brandLight }}>
            <Ionicons name="information-circle" size={16} color={c.brand} />
            <Text style={{ fontSize: fontSize.xs, color: c.brand, fontWeight: '500', marginLeft: 6 }}>
              Demo preview — place an order to see live tracking
            </Text>
          </View>
        )}

        {/* Map */}
        <View style={{ height: 280, backgroundColor: c.surfaceSecondary }}>
          {(pickupCoords || driverCoords || deliveryCoords) ? (
            <View style={{ flex: 1 }}>
              <MapView
                ref={mapRef}
                style={{ flex: 1 }}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                initialRegion={{
                  latitude: driverCoords?.latitude || pickupCoords?.latitude || 37.78,
                  longitude: driverCoords?.longitude || pickupCoords?.longitude || -122.43,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
                showsUserLocation={false}
                showsCompass={false}
                toolbarEnabled={false}
              >
                {/* Driver Marker — rotates with heading for dead reckoning feel */}
                {driverCoords && (
                  <Marker
                    ref={driverMarkerRef}
                    coordinate={driverCoords}
                    title="Driver"
                    anchor={{ x: 0.5, y: 0.5 }}
                    flat
                    rotation={driverHeading}
                  >
                    <View style={{
                      width: 40, height: 40, borderRadius: 20,
                      backgroundColor: '#3B82F6', borderWidth: 3, borderColor: '#FFF',
                      alignItems: 'center', justifyContent: 'center',
                      shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
                    }}>
                      <Ionicons name="navigate" size={18} color="#FFF" />
                    </View>
                  </Marker>
                )}

                {/* Pickup Marker */}
                {pickupCoords && (
                  <Marker coordinate={pickupCoords} title="Pickup" anchor={{ x: 0.5, y: 1 }}>
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#F59E0B', borderWidth: 2, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4 }}>
                        <Ionicons name="arrow-up" size={14} color="#FFF" />
                      </View>
                      <View style={{ width: 2, height: 6, backgroundColor: '#F59E0B' }} />
                    </View>
                  </Marker>
                )}

                {/* Delivery Marker */}
                {deliveryCoords && (
                  <Marker coordinate={deliveryCoords} title="Delivery" anchor={{ x: 0.5, y: 1 }}>
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4 }}>
                        <Ionicons name="flag" size={14} color="#FFF" />
                      </View>
                      <View style={{ width: 2, height: 6, backgroundColor: '#10B981' }} />
                    </View>
                  </Marker>
                )}

                {/* Background routes (dim — full journey path) */}
                {backgroundRoutes.map((route, i) => (
                  route.length >= 2 && (
                    <Polyline
                      key={`bg-${i}`}
                      coordinates={route}
                      strokeColor="rgba(99,102,241,0.25)"
                      strokeWidth={3}
                      lineDashPattern={[6, 10]}
                    />
                  )
                ))}

                {/* Active route (bright — driver's current leg) */}
                {activeRoute.length >= 2 && (
                  <Polyline
                    coordinates={activeRoute}
                    strokeColor="#6366F1"
                    strokeWidth={4}
                    lineDashPattern={[12, 8]}
                  />
                )}

              </MapView>

              {/* Recenter button */}
              <TouchableOpacity
                onPress={recenterMap}
                style={{
                  position: 'absolute', bottom: 12, right: 12,
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
                }}
              >
                <Ionicons name="locate" size={20} color={c.brand} />
              </TouchableOpacity>

              {/* Map Legend */}
              <View style={{
                position: 'absolute', top: 12, left: 12,
                flexDirection: 'row', gap: spacing.sm,
                backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: radius.md,
                paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
              }}>
                {LEGEND.map((item) => (
                  <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
                    <Text style={{ fontSize: 10, color: '#374151', fontWeight: '500' }}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="map-outline" size={48} color={c.textTertiary} />
              <Text style={{ color: c.textTertiary, fontSize: fontSize.sm, marginTop: spacing.sm }}>
                Waiting for location data...
              </Text>
            </View>
          )}
        </View>

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
                    width: 52, height: 52, borderRadius: radius.full,
                    backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center',
                    marginRight: spacing.md,
                  }}
                >
                  <Ionicons name="person" size={24} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: c.textPrimary }}>
                    {order.driver.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                    <Ionicons name="star" size={13} color={c.warning} />
                    <Text style={{ fontSize: fontSize.sm, color: c.textSecondary, marginLeft: 3 }}>
                      {order.driver.metrics?.rating?.toFixed(1) || 'N/A'}
                    </Text>
                    <View style={{ width: 1, height: 12, backgroundColor: c.border, marginHorizontal: spacing.sm }} />
                    <Text style={{ fontSize: fontSize.xs, color: c.textTertiary }}>
                      {order.driver.vehicle?.type} · {order.driver.vehicle?.number}
                    </Text>
                  </View>
                  {driverSpeed != null && (
                    <Text style={{ fontSize: fontSize.xs, color: c.brand, fontWeight: '500', marginTop: 2 }}>
                      {driverSpeed} mph
                    </Text>
                  )}
                </View>

                {/* Contact buttons */}
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <TouchableOpacity
                    onPress={() => order.driver?.phone && Platform.OS !== 'web' && Linking.openURL(`sms:${order.driver.phone}`)}
                    style={{
                      width: 40, height: 40, borderRadius: radius.full,
                      backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={c.brand} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => order.driver?.phone && Platform.OS !== 'web' && Linking.openURL(`tel:${order.driver.phone}`)}
                    style={{
                      width: 40, height: 40, borderRadius: radius.full,
                      backgroundColor: c.successLight, alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="call" size={18} color={c.success} />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          )}

          {/* Addresses */}
          {(order?.pickupAddress || order?.deliveryAddress) && (
            <Card style={{ marginBottom: spacing.lg }}>
              {order?.pickupAddress && (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: order?.deliveryAddress ? spacing.md : 0, borderBottomWidth: order?.deliveryAddress ? 1 : 0, borderBottomColor: c.border }}>
                  <View style={{ width: 32, height: 32, borderRadius: radius.full, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
                    <Ionicons name="arrow-up" size={16} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fontSize.xs, fontWeight: '600', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Pickup</Text>
                    <Text style={{ fontSize: fontSize.sm, color: c.textPrimary, marginTop: 1 }} numberOfLines={1}>{order.pickupAddress.line1}, {order.pickupAddress.city}</Text>
                  </View>
                </View>
              )}
              {order?.deliveryAddress && (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: order?.pickupAddress ? spacing.md : 0 }}>
                  <View style={{ width: 32, height: 32, borderRadius: radius.full, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
                    <Ionicons name="flag" size={16} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fontSize.xs, fontWeight: '600', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Delivery</Text>
                    <Text style={{ fontSize: fontSize.sm, color: c.textPrimary, marginTop: 1 }} numberOfLines={1}>{order.deliveryAddress.line1}, {order.deliveryAddress.city}</Text>
                  </View>
                </View>
              )}
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
            const meta = TIMELINE_META[status] || { color: c.textTertiary, icon: 'ellipse-outline' };
            const nodeColor = isCompleted ? meta.color : c.border;
            const timelineEntry = order?.timeline?.find((t) => t.status === status);

            return (
              <View key={status} style={{ flexDirection: 'row', minHeight: 56 }}>
                {/* Dot + Line */}
                <View style={{ width: 32, alignItems: 'center' }}>
                  {isCompleted ? (
                    <View style={{
                      width: 24, height: 24, borderRadius: 12,
                      backgroundColor: meta.color,
                      alignItems: 'center', justifyContent: 'center',
                      ...(isCurrent ? { shadowColor: meta.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 } : {}),
                    }}>
                      {isCurrent ? (
                        <Ionicons name={meta.icon as any} size={13} color="#FFF" />
                      ) : (
                        <Ionicons name="checkmark" size={13} color="#FFF" />
                      )}
                    </View>
                  ) : (
                    <View style={{
                      width: 20, height: 20, borderRadius: 10,
                      borderWidth: 2, borderColor: c.border,
                      backgroundColor: c.background, marginTop: 2,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons name={meta.icon as any} size={10} color={c.textTertiary} />
                    </View>
                  )}
                  {!isLast && (
                    <View style={{ flex: 1, width: 2, backgroundColor: isCompleted ? nodeColor : c.border, marginVertical: 2 }} />
                  )}
                </View>

                {/* Content */}
                <View style={{ flex: 1, paddingBottom: spacing.lg, paddingLeft: spacing.sm }}>
                  <Text style={{
                    fontSize: fontSize.sm,
                    fontWeight: isCompleted ? '600' : '400',
                    color: isCurrent ? meta.color : isCompleted ? c.textPrimary : c.textTertiary,
                  }}>
                    {(ORDER_STATUS_LABELS as Record<string, string>)[status] || status.replace(/_/g, ' ')}
                  </Text>
                  {timelineEntry && (
                    <Text style={{ fontSize: fontSize.xs, color: c.textSecondary, marginTop: 2 }}>
                      {new Date(timelineEntry.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      {timelineEntry.note ? ` — ${timelineEntry.note}` : ''}
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
