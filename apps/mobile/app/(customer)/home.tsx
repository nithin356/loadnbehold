import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useAuthStore, useCartStore } from '@/lib/store';
import { customerApi } from '@/lib/api';
import { SERVICES } from '@loadnbehold/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FALLBACK_BANNERS = [
  { id: '1', title: 'First Order 20% OFF', description: 'Use code FIRST20', color: '#2563EB' },
  { id: '2', title: 'Free Delivery on $50+', description: 'Limited time offer', color: '#7C3AED' },
  { id: '3', title: 'Refer & Earn $10', description: 'Share with friends', color: '#059669' },
];

const serviceIcons: Record<string, string> = {
  wash_fold: 'water-outline',
  dry_clean: 'sparkles-outline',
  iron: 'flame-outline',
  stain_removal: 'color-fill-outline',
  bedding: 'bed-outline',
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
  const user = useAuthStore((s) => s.user);
  const addItem = useCartStore((s) => s.addItem);
  const [banners, setBanners] = useState(FALLBACK_BANNERS);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerRef = useRef<FlatList>(null);

  // Location state
  const [locationName, setLocationName] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    customerApi.getBanners().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setBanners(data.map((b: any, i: number) => ({
          id: b._id || String(i),
          title: b.title,
          description: b.description || '',
          color: b.color || ['#2563EB', '#7C3AED', '#059669'][i % 3],
        })));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => {
        const next = (prev + 1) % banners.length;
        bannerRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
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

      // Warn if accuracy is poor (>500m)
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
    } catch {
      setLocationError('Location unavailable');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ padding: spacing.xl, paddingBottom: 0 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              {/* Location bar */}
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}
                onPress={() => {
                  if (locationError) fetchLocation();
                  else router.push('/(customer)/addresses');
                }}
              >
                <Ionicons
                  name={locationError ? 'location-outline' : 'location'}
                  size={16}
                  color={locationError ? c.warning : c.brand}
                />
                {locationLoading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6 }}>
                    <ActivityIndicator size="small" color={c.brand} />
                    <Text style={{ fontSize: fontSize.sm, color: c.textTertiary, marginLeft: 6 }}>
                      Detecting...
                    </Text>
                  </View>
                ) : locationError ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6 }}>
                    <Text style={{ fontSize: fontSize.sm, color: c.warning, fontWeight: '500' }}>
                      {locationError}
                    </Text>
                    <Text style={{ fontSize: fontSize.xs, color: c.textTertiary, marginLeft: 4 }}>Tap to retry</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6, flex: 1 }}>
                    <Text
                      style={{ fontSize: fontSize.sm, color: c.brand, fontWeight: '600' }}
                      numberOfLines={1}
                    >
                      {locationName}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={c.brand} style={{ marginLeft: 4 }} />
                  </View>
                )}
              </TouchableOpacity>

              <Text style={{ fontSize: fontSize.sm, color: c.textSecondary }}>{greeting()}</Text>
              <Text style={{ fontSize: fontSize.xl, fontWeight: '700', color: c.textPrimary }}>
                {user?.name || 'there'}!
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(customer)/orders')}
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.full,
                backgroundColor: c.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="notifications-outline" size={22} color={c.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Banner Carousel */}
        <View style={{ marginTop: spacing.lg }}>
          <FlatList
            ref={bannerRef}
            data={banners}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - spacing.xl * 2));
              setBannerIndex(idx);
            }}
            contentContainerStyle={{ paddingHorizontal: spacing.xl }}
            ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
            renderItem={({ item }) => (
              <View
                style={{
                  width: SCREEN_WIDTH - spacing.xl * 2,
                  height: 140,
                  borderRadius: radius.xl,
                  backgroundColor: item.color,
                  padding: spacing.xl,
                  justifyContent: 'flex-end',
                }}
              >
                <Text style={{ color: '#FFF', fontSize: fontSize.xl, fontWeight: '700' }}>{item.title}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: fontSize.sm, marginTop: 4 }}>
                  {item.description}
                </Text>
              </View>
            )}
            keyExtractor={(item) => item.id}
          />
          {/* Dots */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm }}>
            {banners.map((_: any, idx: number) => (
              <View
                key={idx}
                style={{
                  width: idx === bannerIndex ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: idx === bannerIndex ? c.brand : c.border,
                  marginHorizontal: 3,
                }}
              />
            ))}
          </View>
        </View>

        {/* Trust Badges */}
        <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: c.surface,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: c.border,
              paddingVertical: spacing.lg,
            }}
          >
            {TRUST_BADGES.map((badge, idx) => (
              <View
                key={badge.label}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  borderRightWidth: idx < TRUST_BADGES.length - 1 ? 1 : 0,
                  borderRightColor: c.border,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: radius.full,
                    backgroundColor: c.brandLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing.xs,
                  }}
                >
                  <Ionicons name={badge.icon as any} size={18} color={c.brand} />
                </View>
                <Text style={{ fontSize: fontSize.sm, fontWeight: '700', color: c.textPrimary }}>
                  {badge.label}
                </Text>
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
            {SERVICES.map((service) => (
              <TouchableOpacity
                key={service.key}
                onPress={() => {
                  addItem({
                    service: service.key,
                    label: service.label,
                    quantity: 1,
                    unitPrice: service.basePrice,
                  });
                  router.push('/(customer)/checkout');
                }}
                style={{
                  width: (SCREEN_WIDTH - spacing.xl * 2 - spacing.md * 2) / 3,
                  alignItems: 'center',
                  padding: spacing.md,
                  backgroundColor: c.surface,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.lg,
                    backgroundColor: c.brandLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing.sm,
                  }}
                >
                  <Ionicons
                    name={(serviceIcons[service.key] || 'sparkles-outline') as any}
                    size={22}
                    color={c.brand}
                  />
                </View>
                <Text
                  style={{ fontSize: fontSize.xs, fontWeight: '600', color: c.textPrimary, textAlign: 'center' }}
                  numberOfLines={2}
                >
                  {service.label}
                </Text>
                <Text style={{ fontSize: fontSize.xs, color: c.textSecondary, marginTop: 2 }}>
                  ${service.basePrice}/{service.unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* How It Works */}
        <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.xl }}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary, marginBottom: spacing.lg }}>
            How It Works
          </Text>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: c.surface,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: c.border,
              padding: spacing.lg,
            }}
          >
            {HOW_IT_WORKS.map((item, idx) => (
              <View key={item.step} style={{ flex: 1, alignItems: 'center' }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.full,
                    backgroundColor: c.brand,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing.sm,
                  }}
                >
                  <Ionicons name={item.icon as any} size={20} color="#FFF" />
                </View>
                <Text style={{ fontSize: fontSize.sm, fontWeight: '700', color: c.textPrimary }}>
                  {item.title}
                </Text>
                <Text style={{ fontSize: 10, color: c.textSecondary, marginTop: 2, textAlign: 'center' }}>
                  {item.desc}
                </Text>
                {idx < HOW_IT_WORKS.length - 1 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 20,
                      right: -8,
                      width: 16,
                    }}
                  >
                    <Ionicons name="chevron-forward" size={14} color={c.textTertiary} />
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Quick Order CTA */}
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
