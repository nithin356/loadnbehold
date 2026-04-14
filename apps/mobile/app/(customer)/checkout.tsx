import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from '@/lib/location';
import * as Haptics from '@/lib/haptics';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { Skeleton, SkeletonRow } from '@/components/Skeleton';
import { useCartStore } from '@/lib/store';
import { customerApi, ordersApi, walletApi } from '@/lib/api';
import { SERVICES } from '@loadnbehold/constants';

const US_STATES: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district of columbia': 'DC',
};

function toStateCode(state: string): string {
  if (!state) return 'MI';
  const trimmed = state.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return US_STATES[trimmed.toLowerCase()] || trimmed.slice(0, 2).toUpperCase();
}

const TIME_SLOTS = [
  '8:00 AM - 10:00 AM',
  '10:00 AM - 12:00 PM',
  '12:00 PM - 2:00 PM',
  '2:00 PM - 4:00 PM',
  '4:00 PM - 6:00 PM',
  '6:00 PM - 8:00 PM',
];

function getNextDays(count: number) {
  const days: { label: string; value: string }[] = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      value: d.toISOString().split('T')[0],
    });
  }
  return days;
}

const DATES = getNextDays(7);

const STEP_CONFIG = [
  { label: 'Cart', short: 'Cart', icon: 'cart-outline' },
  { label: 'Address', short: 'Address', icon: 'location-outline' },
  { label: 'Schedule', short: 'Schedule', icon: 'calendar-outline' },
  { label: 'Payment', short: 'Pay', icon: 'card-outline' },
  { label: 'Review', short: 'Review', icon: 'checkmark-circle-outline' },
];

export default function CheckoutScreen() {
  const c = useThemeColors();
  const cart = useCartStore();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.getSubtotal());

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);

  // Address state
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressIdx, setSelectedAddressIdx] = useState<number | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  // Schedule state
  const [pickupDate, setPickupDate] = useState(DATES[0].value);
  const [pickupSlot, setPickupSlot] = useState(TIME_SLOTS[0]);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'wallet' | 'cod'>('cod');
  const [tip, setTip] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [orderConfig, setOrderConfig] = useState<any>(null);

  useEffect(() => {
    if (items.length === 0) {
      router.back();
      return;
    }
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const coords = await Location.getLastKnownPositionAsync().catch(() => null);
      const lat = coords?.coords.latitude ?? 0;
      const lng = coords?.coords.longitude ?? 0;
      const [addrs, configRes, balRes] = await Promise.all([
        customerApi.getAddresses().catch(() => []),
        customerApi.getNearbyOutlets(lat, lng).catch(() => null),
        walletApi.getBalance().catch(() => ({ balance: 0 })),
      ]);
      setSavedAddresses(Array.isArray(addrs) ? addrs : []);
      setWalletBalance(balRes?.balance ?? 0);
      // Try to get order config
      try {
        const cfg = await fetchOrderConfig();
        setOrderConfig(cfg);
      } catch {}
    } catch {}
    setLoading(false);
  };

  const fetchOrderConfig = async () => {
    return customerApi.getOrderConfig();
  };

  const useCurrentLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to detect your address.');
        setLocLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

      if (geo) {
        const newAddr = {
          _id: 'current',
          label: 'Current Location',
          line1: [geo.streetNumber, geo.street].filter(Boolean).join(' ') || 'Detected Location',
          city: geo.city || 'Detroit',
          state: toStateCode(geo.region || ''),
          zip: (geo.postalCode || '48201').replace(/[^\d-]/g, '').slice(0, 5),
          location: { type: 'Point', coordinates: [loc.coords.longitude, loc.coords.latitude] },
        };
        setSavedAddresses((prev) => {
          const filtered = prev.filter((a) => a._id !== 'current');
          return [newAddr, ...filtered];
        });
        setSelectedAddressIdx(0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      Alert.alert('Location Error', err.message || 'Could not detect your location');
    }
    setLocLoading(false);
  };

  const selectedAddress = selectedAddressIdx !== null ? savedAddresses[selectedAddressIdx] : null;

  // Pricing
  const taxRate = orderConfig?.taxRate ?? 6;
  const deliveryFeeBase = orderConfig?.deliveryFee?.base ?? 4.99;
  const freeDeliveryAbove = orderConfig?.deliveryFee?.freeAbove ?? 50;
  const deliveryFee = subtotal >= freeDeliveryAbove ? 0 : deliveryFeeBase;
  const tax = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
  const total = parseFloat((subtotal + deliveryFee + tax + tip).toFixed(2));

  const codRequired = orderConfig?.codRequired;

  useEffect(() => {
    if (codRequired) setPaymentMethod('cod');
  }, [codRequired]);

  const parseTimeSlot = (slot: string, date: string) => {
    // "8:00 AM - 10:00 AM" → { date: "2026-04-13", from: "08:00", to: "10:00" }
    const parts = slot.split(' - ');
    const to24 = (t: string) => {
      const [time, period] = t.trim().split(' ');
      let [h, m] = time.split(':').map(Number);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };
    return { date, from: to24(parts[0]), to: to24(parts[1]) };
  };

  const placeOrder = async () => {
    if (!selectedAddress) return;

    // Re-validate schedule at submission time
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (pickupDate < today) {
      Alert.alert('Schedule Expired', 'Your pickup date is now in the past. Please go back and select a new date.');
      setStep(2);
      return;
    }
    if (pickupDate === today) {
      const slot = parseTimeSlot(pickupSlot, pickupDate);
      const [h, m] = slot.from.split(':').map(Number);
      const slotStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
      const minLeadTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour lead
      if (slotStart <= now) {
        Alert.alert('Schedule Expired', 'Your selected pickup time has already passed. Please go back and pick a later slot.');
        setStep(2);
        return;
      }
      if (slotStart < minLeadTime) {
        Alert.alert('Too Soon', 'Pickup must be at least 1 hour from now. Please select a later time slot.');
        setStep(2);
        return;
      }
    }

    setPlacing(true);
    try {
      const orderItems = items.map((item) => {
        const svc = SERVICES.find((s) => s.key === item.service);
        return {
          service: item.service,
          quantity: item.quantity,
          weight: svc?.unit === 'lbs' ? item.quantity : undefined,
          unit: (svc?.unit || 'items') as 'lbs' | 'kg' | 'items',
        };
      });

      const addressPayload = {
        label: selectedAddress.label || 'Address',
        line1: selectedAddress.line1,
        city: selectedAddress.city || 'Detroit',
        state: toStateCode(selectedAddress.state || ''),
        zip: (selectedAddress.zip || '48201').replace(/[^\d-]/g, '').slice(0, 5),
        location: {
          type: 'Point' as const,
          coordinates: [
            selectedAddress.location?.coordinates?.[0] ?? -83.0458,
            selectedAddress.location?.coordinates?.[1] ?? 42.3314,
          ] as [number, number],
        },
      };

      const orderData = {
        items: orderItems,
        pickupAddress: addressPayload,
        deliveryAddress: addressPayload,
        schedule: { pickupSlot: parseTimeSlot(pickupSlot, pickupDate) },
        paymentMethod,
        promoCode: promoCode.trim() || undefined,
        tip,
      };

      await ordersApi.create(orderData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      cart.clearCart();
      Alert.alert('Order Placed!', 'Your order has been placed successfully.', [
        { text: 'View Orders', onPress: () => router.replace('/(customer)/orders') },
      ]);
    } catch (err: any) {
      Alert.alert('Order Failed', err.message || 'Failed to place order. Please try again.');
    }
    setPlacing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
        <View style={{ padding: spacing.xl }}>
          <Skeleton width={140} height={20} style={{ marginBottom: spacing.lg }} />
          {[1, 2, 3].map((i) => (
            <SkeletonRow key={i} style={{ marginBottom: spacing.sm }} />
          ))}
          <Skeleton width="100%" height={52} borderRadius={radius.xl} style={{ marginTop: spacing.xl }} />
        </View>
      </SafeAreaView>
    );
  }

  const canProceed = () => {
    if (step === 0) return items.length > 0;
    if (step === 1) return selectedAddress !== null;
    if (step === 2) return !!pickupDate && !!pickupSlot;
    if (step === 3) return true;
    return true;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
        <TouchableOpacity onPress={() => (step > 0 ? setStep(step - 1) : router.back())} style={{ marginRight: spacing.md }}>
          <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary, flex: 1 }}>
          {STEP_CONFIG[step].label}
        </Text>
      </View>

      {/* Stepper */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: c.border }}>
        {STEP_CONFIG.map((s, idx) => {
          const isCompleted = idx < step;
          const isCurrent = idx === step;
          const isLast = idx === STEP_CONFIG.length - 1;
          return (
            <View key={s.label} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                {idx > 0 && (
                  <View style={{ flex: 1, height: 2, backgroundColor: isCompleted || isCurrent ? c.brand : c.border }} />
                )}
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: isCompleted ? c.brand : isCurrent ? c.brand : c.surfaceSecondary,
                  borderWidth: isCurrent ? 0 : isCompleted ? 0 : 2,
                  borderColor: c.border,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  ) : (
                    <Ionicons name={s.icon as any} size={13} color={isCurrent ? '#FFF' : c.textTertiary} />
                  )}
                </View>
                {!isLast && (
                  <View style={{ flex: 1, height: 2, backgroundColor: isCompleted ? c.brand : c.border }} />
                )}
              </View>
              <Text style={{
                fontSize: 10, fontWeight: isCurrent ? '700' : '500',
                color: isCompleted || isCurrent ? c.brand : c.textTertiary,
                marginTop: 4,
              }}>
                {s.short}
              </Text>
            </View>
          );
        })}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.xl }} showsVerticalScrollIndicator={false}>
        {/* ── Step 0: Cart ── */}
        {step === 0 && (
          <View>
            {items.map((item) => (
              <View key={item.service} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, marginBottom: spacing.sm }}>
                <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
                  <Ionicons name="shirt-outline" size={20} color={c.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textPrimary }}>{item.label}</Text>
                  <Text style={{ fontSize: fontSize.xs, color: c.textSecondary }}>${item.unitPrice}/{SERVICES.find((s) => s.key === item.service)?.unit || 'item'}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <TouchableOpacity onPress={() => cart.updateQuantity(item.service, item.quantity - 1)} accessibilityLabel={`Decrease quantity of ${item.label}`} accessibilityRole="button" style={{ width: 30, height: 30, borderRadius: radius.md, backgroundColor: c.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="remove" size={16} color={c.textPrimary} />
                  </TouchableOpacity>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: '700', color: c.textPrimary, minWidth: 20, textAlign: 'center' }}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => cart.updateQuantity(item.service, item.quantity + 1)} accessibilityLabel={`Increase quantity of ${item.label}`} accessibilityRole="button" style={{ width: 30, height: 30, borderRadius: radius.md, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="add" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Add more services */}
            <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed', marginTop: spacing.sm }}>
              <Ionicons name="add-circle-outline" size={18} color={c.brand} />
              <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.brand, marginLeft: spacing.xs }}>Add More Services</Text>
            </TouchableOpacity>

            <View style={{ marginTop: spacing.xl, padding: spacing.md, backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: c.textPrimary }}>Subtotal</Text>
                <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.brand }}>${subtotal.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Step 1: Address ── */}
        {step === 1 && (
          <View>
            {Platform.OS !== 'web' && <TouchableOpacity onPress={useCurrentLocation} disabled={locLoading} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: c.brandLight, borderRadius: radius.lg, marginBottom: spacing.lg }}>
              {locLoading ? (
                <ActivityIndicator size="small" color={c.brand} />
              ) : (
                <Ionicons name="locate-outline" size={20} color={c.brand} />
              )}
              <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.brand, marginLeft: spacing.sm }}>
                {locLoading ? 'Detecting location...' : 'Use Current Location'}
              </Text>
            </TouchableOpacity>}

            {savedAddresses.length > 0 && (
              <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm }}>
                Saved Addresses
              </Text>
            )}

            {savedAddresses.map((addr, idx) => {
              const isSelected = selectedAddressIdx === idx;
              return (
                <TouchableOpacity
                  key={addr._id}
                  onPress={() => { setSelectedAddressIdx(idx); Haptics.selectionAsync(); }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', padding: spacing.md,
                    backgroundColor: isSelected ? c.brandLight : c.surface,
                    borderRadius: radius.lg, borderWidth: 1.5,
                    borderColor: isSelected ? c.brand : c.border, marginBottom: spacing.sm,
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: isSelected ? c.brand : c.surfaceSecondary, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
                    <Ionicons name={addr.label === 'Home' ? 'home-outline' : addr.label === 'Work' ? 'briefcase-outline' : 'location-outline'} size={18} color={isSelected ? '#FFF' : c.textTertiary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textPrimary }}>{addr.label}</Text>
                    <Text style={{ fontSize: fontSize.xs, color: c.textSecondary }} numberOfLines={1}>{addr.line1}, {addr.city}, {addr.state} {addr.zip}</Text>
                  </View>
                  {isSelected && (
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="checkmark" size={14} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {savedAddresses.length === 0 && !locLoading && (
              <View style={{ alignItems: 'center', padding: spacing.xl }}>
                <Ionicons name="location-outline" size={48} color={c.textTertiary} />
                <Text style={{ fontSize: fontSize.sm, color: c.textSecondary, marginTop: spacing.sm, textAlign: 'center' }}>
                  No saved addresses. Use your current location or add one from your profile.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Step 2: Schedule ── */}
        {step === 2 && (
          <View>
            <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: c.textPrimary, marginBottom: spacing.md }}>Pickup Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xl }}>
              {DATES.map((d) => {
                const isSelected = pickupDate === d.value;
                return (
                  <TouchableOpacity
                    key={d.value}
                    onPress={() => { setPickupDate(d.value); Haptics.selectionAsync(); }}
                    style={{
                      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
                      borderRadius: radius.lg, borderWidth: 1.5, marginRight: spacing.sm,
                      borderColor: isSelected ? c.brand : c.border,
                      backgroundColor: isSelected ? c.brandLight : c.surface,
                    }}
                  >
                    <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: isSelected ? c.brand : c.textPrimary }}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: c.textPrimary, marginBottom: spacing.md }}>Pickup Time</Text>
            {TIME_SLOTS.map((slot) => {
              const isSelected = pickupSlot === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  onPress={() => { setPickupSlot(slot); Haptics.selectionAsync(); }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', padding: spacing.md,
                    borderRadius: radius.lg, borderWidth: 1.5, marginBottom: spacing.sm,
                    borderColor: isSelected ? c.brand : c.border,
                    backgroundColor: isSelected ? c.brandLight : c.surface,
                  }}
                >
                  <Ionicons name="time-outline" size={18} color={isSelected ? c.brand : c.textTertiary} />
                  <Text style={{ fontSize: fontSize.sm, fontWeight: '500', color: isSelected ? c.brand : c.textPrimary, marginLeft: spacing.sm }}>{slot}</Text>
                  {isSelected && (
                    <View style={{ marginLeft: 'auto' }}>
                      <Ionicons name="checkmark-circle" size={20} color={c.brand} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Step 3: Payment ── */}
        {step === 3 && (
          <View>
            {codRequired && (
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: '#FEF3C7', borderRadius: radius.lg, marginBottom: spacing.lg }}>
                <Ionicons name="information-circle" size={20} color="#D97706" />
                <Text style={{ fontSize: fontSize.xs, color: '#92400E', marginLeft: spacing.sm, flex: 1 }}>
                  Cash on Delivery is required for your first {orderConfig?.forceCodForFirstNOrders ?? 3} orders.
                </Text>
              </View>
            )}

            <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: c.textPrimary, marginBottom: spacing.md }}>Payment Method</Text>
            {(['cod', 'wallet', 'online'] as const).map((method) => {
              const isSelected = paymentMethod === method;
              const disabled = codRequired && method !== 'cod';
              const labels = { cod: 'Cash on Delivery', wallet: `Wallet ($${walletBalance.toFixed(2)})`, online: 'Pay Online' };
              const icons = { cod: 'cash-outline' as const, wallet: 'wallet-outline' as const, online: 'card-outline' as const };
              return (
                <TouchableOpacity
                  key={method}
                  onPress={() => { if (!disabled) { setPaymentMethod(method); Haptics.selectionAsync(); } }}
                  disabled={disabled}
                  style={{
                    flexDirection: 'row', alignItems: 'center', padding: spacing.md,
                    borderRadius: radius.lg, borderWidth: 1.5, marginBottom: spacing.sm,
                    borderColor: isSelected ? c.brand : c.border,
                    backgroundColor: isSelected ? c.brandLight : c.surface,
                    opacity: disabled ? 0.4 : 1,
                  }}
                >
                  <Ionicons name={icons[method]} size={20} color={isSelected ? c.brand : c.textTertiary} />
                  <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: isSelected ? c.brand : c.textPrimary, marginLeft: spacing.sm, flex: 1 }}>{labels[method]}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={c.brand} />}
                </TouchableOpacity>
              );
            })}

            {/* Tip */}
            <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: c.textPrimary, marginTop: spacing.xl, marginBottom: spacing.md }}>Driver Tip</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {[0, 2, 5, 10].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  onPress={() => { setTip(amt); Haptics.selectionAsync(); }}
                  style={{
                    flex: 1, height: 42, borderRadius: radius.lg, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
                    borderColor: tip === amt ? c.brand : c.border,
                    backgroundColor: tip === amt ? c.brandLight : c.surface,
                  }}
                >
                  <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: tip === amt ? c.brand : c.textSecondary }}>
                    {amt === 0 ? 'None' : `$${amt}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Promo Code */}
            <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: c.textPrimary, marginTop: spacing.xl, marginBottom: spacing.md }}>Promo Code</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TextInput
                value={promoCode}
                onChangeText={setPromoCode}
                placeholder="Enter code"
                placeholderTextColor={c.textTertiary}
                autoCapitalize="characters"
                style={{
                  flex: 1, height: 44, borderRadius: radius.lg, borderWidth: 1.5, borderColor: c.border,
                  paddingHorizontal: spacing.md, fontSize: fontSize.sm, color: c.textPrimary, backgroundColor: c.surface,
                }}
              />
            </View>
          </View>
        )}

        {/* ── Step 4: Summary ── */}
        {step === 4 && (
          <View>
            {/* Items */}
            <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm }}>Items</Text>
            {items.map((item) => (
              <View key={item.service} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs }}>
                <Text style={{ fontSize: fontSize.sm, color: c.textPrimary }}>{item.quantity}x {item.label}</Text>
                <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textPrimary }}>${(item.quantity * item.unitPrice).toFixed(2)}</Text>
              </View>
            ))}

            <View style={{ height: 1, backgroundColor: c.border, marginVertical: spacing.md }} />

            {/* Address */}
            <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs }}>Pickup & Delivery</Text>
            <Text style={{ fontSize: fontSize.sm, color: c.textPrimary }}>{selectedAddress?.line1}, {selectedAddress?.city}</Text>
            <Text style={{ fontSize: fontSize.xs, color: c.textSecondary, marginTop: 2 }}>
              {DATES.find((d) => d.value === pickupDate)?.label} · {pickupSlot}
            </Text>

            <View style={{ height: 1, backgroundColor: c.border, marginVertical: spacing.md }} />

            {/* Pricing Breakdown */}
            <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm }}>Price Breakdown</Text>
            {[
              { label: 'Subtotal', value: subtotal },
              { label: deliveryFee === 0 ? 'Delivery (Free!)' : 'Delivery Fee', value: deliveryFee },
              { label: `Tax (${taxRate}%)`, value: tax },
              ...(tip > 0 ? [{ label: 'Driver Tip', value: tip }] : []),
            ].map((row) => (
              <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs }}>
                <Text style={{ fontSize: fontSize.sm, color: c.textSecondary }}>{row.label}</Text>
                <Text style={{ fontSize: fontSize.sm, color: c.textPrimary }}>${row.value.toFixed(2)}</Text>
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: c.border, marginVertical: spacing.sm }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>Total</Text>
              <Text style={{ fontSize: fontSize.lg, fontWeight: '800', color: c.brand }}>${total.toFixed(2)}</Text>
            </View>

            <View style={{ height: 1, backgroundColor: c.border, marginVertical: spacing.md }} />

            {/* Payment Method */}
            <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs }}>Payment</Text>
            <Text style={{ fontSize: fontSize.sm, color: c.textPrimary }}>
              {{ cod: 'Cash on Delivery', wallet: 'Wallet', online: 'Pay Online' }[paymentMethod]}
            </Text>
            {promoCode.trim() ? (
              <Text style={{ fontSize: fontSize.xs, color: c.brand, marginTop: 2 }}>Promo: {promoCode.toUpperCase()}</Text>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Bottom Action */}
      <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface }}>
        {step < 4 ? (
          <TouchableOpacity
            onPress={() => setStep(step + 1)}
            disabled={!canProceed()}
            accessibilityLabel={step === 3 ? 'Review Order' : `Continue to ${['Address', 'Schedule', 'Payment', 'Review'][step + 1] || 'next step'}`}
            accessibilityRole="button"
            style={{
              height: 52, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center',
              backgroundColor: canProceed() ? c.brand : c.border,
            }}
          >
            <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#FFF' }}>
              {step === 3 ? 'Review Order' : 'Continue'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={placeOrder}
            disabled={placing}
            accessibilityLabel={`Place order for ${total.toFixed(2)} dollars`}
            accessibilityRole="button"
            style={{
              height: 52, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center',
              backgroundColor: c.brand, opacity: placing ? 0.6 : 1,
            }}
          >
            {placing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#FFF' }}>Place Order — ${total.toFixed(2)}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
