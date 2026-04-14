import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform, useWindowDimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from '@/lib/location';
import * as Haptics from '@/lib/haptics';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useAuthStore, useCartStore, useLocationStore } from '@/lib/store';
import { customerApi, ordersApi } from '@/lib/api';
import { SERVICES } from '@loadnbehold/constants';


const FALLBACK_BANNERS = [
  { id: '1', title: 'First Order 20% OFF', description: 'Use code FIRST20', color: '#2563EB' },
  { id: '2', title: 'Free Delivery on $50+', description: 'Limited time offer', color: '#7C3AED' },
  { id: '3', title: 'Refer & Earn $5', description: 'Share with friends', color: '#059669' },
];

const serviceIcons: Record<string, string> = {
  wash_fold: 'water-outline',
  dry_clean: 'sparkles-outline',
  iron: 'flame-outline',
  stain_removal: 'color-fill-outline',
  bedding: 'bed-outline',
};

const SERVICE_COLORS: Record<string, string> = {
  wash_fold: '#3B82F6',
  dry_clean: '#8B5CF6',
  iron: '#EF4444',
  stain_removal: '#F59E0B',
  bedding: '#06B6D4',
};

const TRUST_BADGES = [
  { icon: 'shield-checkmark-outline', label: 'Insured', sub: 'Garments' },
  { icon: 'time-outline', label: '24hr', sub: 'Turnaround' },
  { icon: 'star-outline', label: '4.9', sub: 'Rating' },
  { icon: 'flash-outline', label: 'Same Day', sub: 'Available' },
];

const HOW_IT_WORKS = [
  { step: '1', icon: 'calendar-outline', title: 'Schedule', desc: 'Pick a time slot' },
  { step: '2', icon: 'bicycle-outline', title: 'We Pickup', desc: 'From your door' },
  { step: '3', icon: 'checkmark-circle-outline', title: 'Delivered', desc: 'Fresh & clean' },
];

export default function HomeScreen() {
  const c = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const addItem = useCartStore((s) => s.addItem);
  const [banners, setBanners] = useState(FALLBACK_BANNERS);
  const [bannerIndex, setBannerIndex] = useState(0);

  // Location state
  const selectedAddress = useLocationStore((s) => s.selectedAddress);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(Platform.OS !== 'web');
  const [locationError, setLocationError] = useState<string | null>(null);
  // Nearest outlet
  const [nearestOutlet, setNearestOutlet] = useState<{ name: string; distance: number; rating?: number; isOpen?: boolean } | null>(null);

  // Last order for quick reorder
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadHomeData = useCallback(async () => {
    try {
      const [bannersRes, ordersRes] = await Promise.all([
        customerApi.getBanners().catch(() => []),
        ordersApi.list(1, 1).catch(() => []),
      ]);
      if (Array.isArray(bannersRes) && bannersRes.length > 0) {
        setBanners(bannersRes.map((b: any, i: number) => ({
          id: b._id || String(i),
          title: b.title,
          description: b.description || '',
          color: b.color || ['#2563EB', '#7C3AED', '#059669'][i % 3],
        })));
      }
      const orders = Array.isArray(ordersRes) ? ordersRes : ordersRes?.items || [];
      if (orders.length > 0) setLastOrder(orders[0]);
    } catch {}
  }, []);

  useEffect(() => {
    loadHomeData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const fetchLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location access denied');
        setLocationLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (loc.coords.accuracy && loc.coords.accuracy > 500) {
        setLocationError('Low GPS accuracy');
      }

      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (address) {
        const parts = [address.city || address.subregion, address.region].filter(Boolean);
        setLocationName(parts.join(', ') || 'Current Location');
      } else {
        setLocationError('Could not determine address');
      }

      // Fetch nearest outlet
      customerApi.getNearbyOutlets(loc.coords.latitude, loc.coords.longitude).then((outlets) => {
        if (Array.isArray(outlets) && outlets.length > 0) {
          const o = outlets[0];
          setNearestOutlet({
            name: o.name,
            distance: o.distance ?? 0,
            rating: o.rating,
            isOpen: o.isOpen,
          });
        }
      }).catch(() => {});
    } catch {
      setLocationError('Location unavailable');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // On web, use selected address from store; on native, auto-detect GPS
  useEffect(() => {
    if (Platform.OS === 'web') {
      setLocationLoading(false);
    } else {
      fetchLocation();
    }
  }, [fetchLocation]);

  // When a saved address is selected (from addresses screen), update location name
  useEffect(() => {
    if (selectedAddress) {
      setLocationName(`${selectedAddress.label} — ${selectedAddress.line1}, ${selectedAddress.city}`);
      setLocationError(null);
    }
  }, [selectedAddress]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleQuickReorder = () => {
    if (!lastOrder?.items) return;
    for (const item of lastOrder.items) {
      addItem({
        service: item.service,
        label: item.name || item.service,
        quantity: item.quantity || 1,
        unitPrice: item.price || 0,
      });
    }
    router.push('/(customer)/checkout');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await loadHomeData(); setRefreshing(false); }}
            tintColor={c.brand}
            colors={[c.brand]}
          />
        }
      >
        {/* Header Bar */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
          backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border,
        }}>
          {/* Brand + Greeting */}
          <View style={{ marginRight: spacing.lg }}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: '800', color: c.brand, letterSpacing: -0.5 }}>
              LoadNBehold
            </Text>
            <Text style={{ fontSize: fontSize.xs, color: c.textTertiary, marginTop: 1 }}>
              {greeting()}, {user?.name || 'there'}
            </Text>
          </View>

          {/* Location Pill */}
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== 'web' && locationError && !selectedAddress) fetchLocation();
              else router.push('/(customer)/addresses');
            }}
            accessibilityLabel={locationName ? `Location: ${locationName}. Tap to change` : 'Select address'}
            accessibilityRole="button"
            activeOpacity={0.7}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center',
              backgroundColor: c.brandLight, borderRadius: radius.full,
              paddingHorizontal: spacing.md, paddingVertical: 6,
              borderWidth: 1, borderColor: c.brand + '30',
            }}
          >
            <Ionicons name={locationName ? 'location' : 'location-outline'} size={14} color={c.brand} />
            {locationLoading ? (
              <>
                <ActivityIndicator size="small" color={c.brand} style={{ marginLeft: 6 }} />
                <Text style={{ fontSize: fontSize.xs, color: c.textTertiary, marginLeft: 4 }}>Detecting...</Text>
              </>
            ) : (
              <Text
                style={{ fontSize: fontSize.xs, fontWeight: '600', color: locationName ? c.brand : c.textSecondary, marginLeft: 4, flex: 1 }}
                numberOfLines={1}
              >
                {locationName || 'Select address'}
              </Text>
            )}
            <Ionicons name="chevron-down" size={12} color={c.brand} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          {/* Notification Bell */}
          <TouchableOpacity
            onPress={() => router.push('/(customer)/orders')}
            accessibilityLabel="Notifications"
            accessibilityRole="button"
            activeOpacity={0.7}
            style={{
              width: 38, height: 38, borderRadius: radius.full,
              backgroundColor: c.surfaceSecondary, alignItems: 'center', justifyContent: 'center',
              marginLeft: spacing.md,
            }}
          >
            <Ionicons name="notifications-outline" size={18} color={c.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Banner Carousel */}
        <View style={{ marginTop: spacing.lg, paddingHorizontal: spacing.xl }}>
          <View
            style={{
              height: 140, borderRadius: radius.xl,
              backgroundColor: banners[bannerIndex]?.color || '#2563EB',
              padding: spacing.xl, justifyContent: 'flex-end',
              overflow: 'hidden',
            }}
          >
            <Text style={{ color: '#FFF', fontSize: fontSize.xl, fontWeight: '700' }}>
              {banners[bannerIndex]?.title}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: fontSize.sm, marginTop: 4 }}>
              {banners[bannerIndex]?.description}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm }}>
            {banners.map((_: any, idx: number) => (
              <View
                key={idx}
                style={{
                  width: idx === bannerIndex ? 20 : 6, height: 6, borderRadius: 3,
                  backgroundColor: idx === bannerIndex ? c.brand : c.border, marginHorizontal: 3,
                }}
              />
            ))}
          </View>
        </View>

        {/* Trust Badges */}
        <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
          <View
            style={{
              flexDirection: 'row', backgroundColor: c.surface, borderRadius: radius.xl,
              borderWidth: 1, borderColor: c.border, paddingVertical: spacing.lg,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
            }}
          >
            {TRUST_BADGES.map((badge, idx) => (
              <View
                key={badge.label}
                style={{
                  flex: 1, alignItems: 'center',
                  borderRightWidth: idx < TRUST_BADGES.length - 1 ? 1 : 0,
                  borderRightColor: c.border,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs }}>
                  <Ionicons name={badge.icon as any} size={18} color={c.brand} />
                </View>
                <Text style={{ fontSize: fontSize.sm, fontWeight: '700', color: c.textPrimary }}>{badge.label}</Text>
                <Text style={{ fontSize: 10, color: c.textTertiary, marginTop: 1 }}>{badge.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Services Grid */}
        <View style={{ padding: spacing.xl }}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary, marginBottom: spacing.lg }}>
            Our Services
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {SERVICES.map((service) => {
              const accentColor = SERVICE_COLORS[service.key] || c.brand;
              const itemWidth = Math.floor((screenWidth - spacing.xl * 2 - spacing.md * 2) / 3);
              return (
                <TouchableOpacity
                  key={service.key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    addItem({ service: service.key, label: service.label, quantity: 1, unitPrice: service.basePrice });
                    router.push('/(customer)/checkout');
                  }}
                  accessibilityLabel={`Select ${service.label} service`}
                  accessibilityRole="button"
                  activeOpacity={0.7}
                  style={{
                    width: itemWidth,
                    alignItems: 'center', padding: spacing.md,
                    backgroundColor: c.surface, borderRadius: radius.lg,
                    borderWidth: 1, borderColor: c.border,
                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
                  }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: radius.lg, backgroundColor: accentColor + '18', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }}>
                    <Ionicons name={(serviceIcons[service.key] || 'sparkles-outline') as any} size={22} color={accentColor} />
                  </View>
                  <Text style={{ fontSize: fontSize.xs, fontWeight: '600', color: c.textPrimary, textAlign: 'center' }} numberOfLines={2}>
                    {service.label}
                  </Text>
                  <Text style={{ fontSize: fontSize.xs, color: c.textSecondary, marginTop: 2 }}>
                    ${service.basePrice}/{service.unit}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Quick Reorder */}
        {lastOrder && (
          <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.xl }}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary, marginBottom: spacing.md }}>
              Reorder
            </Text>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 44, height: 44, borderRadius: radius.lg, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
                  <Ionicons name="refresh" size={22} color={c.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textPrimary }}>
                    {lastOrder.orderNumber || 'Last Order'}
                  </Text>
                  <Text style={{ fontSize: fontSize.xs, color: c.textSecondary, marginTop: 1 }}>
                    {lastOrder.items?.length || 0} item(s) · ${lastOrder.pricing?.total?.toFixed(2) || '0.00'}
                  </Text>
                </View>
                <Button title="Reorder" onPress={handleQuickReorder} size="sm" />
              </View>
            </Card>
          </View>
        )}

        {/* Nearest Outlet */}
        {nearestOutlet && (
          <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.xl }}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary, marginBottom: spacing.md }}>
              Nearest Outlet
            </Text>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 48, height: 48, borderRadius: radius.lg, backgroundColor: c.successLight, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
                  <Ionicons name="storefront-outline" size={24} color={c.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: c.textPrimary }}>
                    {nearestOutlet.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="location-outline" size={12} color={c.textTertiary} />
                      <Text style={{ fontSize: fontSize.xs, color: c.textSecondary, marginLeft: 2 }}>
                        {nearestOutlet.distance < 1
                          ? `${(nearestOutlet.distance * 5280).toFixed(0)} ft`
                          : `${nearestOutlet.distance.toFixed(1)} mi`}
                      </Text>
                    </View>
                    {nearestOutlet.rating != null && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="star" size={12} color={c.warning} />
                        <Text style={{ fontSize: fontSize.xs, color: c.textSecondary, marginLeft: 2 }}>
                          {nearestOutlet.rating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                    {nearestOutlet.isOpen != null && (
                      <View style={{
                        backgroundColor: nearestOutlet.isOpen ? c.successLight : c.errorLight,
                        paddingHorizontal: spacing.sm, paddingVertical: 1, borderRadius: radius.full,
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: nearestOutlet.isOpen ? c.success : c.error }}>
                          {nearestOutlet.isOpen ? 'Open' : 'Closed'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
              </View>
            </Card>
          </View>
        )}

        {/* How It Works */}
        <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.xl }}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary, marginBottom: spacing.lg }}>
            How It Works
          </Text>
          <View
            style={{
              flexDirection: 'row', backgroundColor: c.surface, borderRadius: radius.xl,
              borderWidth: 1, borderColor: c.border, padding: spacing.lg,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
            }}
          >
            {HOW_IT_WORKS.map((item, idx) => (
              <View key={item.step} style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: radius.full, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }}>
                  <Ionicons name={item.icon as any} size={20} color="#FFF" />
                </View>
                <Text style={{ fontSize: fontSize.sm, fontWeight: '700', color: c.textPrimary }}>{item.title}</Text>
                <Text style={{ fontSize: 10, color: c.textSecondary, marginTop: 2, textAlign: 'center' }}>{item.desc}</Text>
                {idx < HOW_IT_WORKS.length - 1 && (
                  <View style={{ position: 'absolute', top: 20, right: -8, width: 16 }}>
                    <Ionicons name="chevron-forward" size={14} color={c.textTertiary} />
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Schedule Pickup CTA */}
        <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing['3xl'] }}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>
                  Schedule a Pickup
                </Text>
                <Text style={{ fontSize: fontSize.sm, color: c.textSecondary, marginTop: 4 }}>
                  We'll pick up your laundry and deliver it fresh
                </Text>
              </View>
              <Button title="Order" onPress={() => router.push('/(customer)/checkout')} size="sm" />
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
