import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { useCartStore } from '@/lib/store';
import { customerApi, ordersApi, walletApi } from '@/lib/api';
import { SERVICES } from '@loadnbehold/constants';

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
      const [addrs, configRes, balRes] = await Promise.all([
        customerApi.getAddresses().catch(() => []),
        customerApi.getNearbyOutlets(0, 0).catch(() => null),
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
          city: geo.city || '',
          state: geo.region || '',
          zip: geo.postalCode || '',
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

  const placeOrder = async () => {
    if (!selectedAddress) return;
    setPlacing(true);
    try {
      const orderItems = items.map((item) => ({
        service: item.service,
        quantity: item.quantity,
        weight: 1,
        price: item.unitPrice,
        name: item.label,
      }));

      const addressPayload = {
        label: selectedAddress.label,
        line1: selectedAddress.line1,
        city: selectedAddress.city,
        state: selectedAddress.state,
        zip: selectedAddress.zip,
        location: selectedAddress.location,
      };

      const orderData = {
        items: orderItems,
        pickupAddress: addressPayload,
        deliveryAddress: addressPayload,
        schedule: { pickupDate, pickupSlot, deliveryDate: pickupDate, deliverySlot: pickupSlot },
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
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={c.brand} />
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
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <TouchableOpacity onPress={() => (step > 0 ? setStep(step - 1) : router.back())} style={{ marginRight: spacing.md }}>
          <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>
            {['Cart', 'Address', 'Schedule', 'Payment', 'Review'][step]}
          </Text>
          <Text style={{ fontSize: fontSize.xs, color: c.textTertiary }}>Step {step + 1} of 5</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={{ height: 3, backgroundColor: c.border }}>
        <View style={{ height: 3, backgroundColor: c.brand, width: `${((step + 1) / 5) * 100}%` }} />
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
                  <TouchableOpacity onPress={() => cart.updateQuantity(item.service, item.quantity - 1)} style={{ width: 30, height: 30, borderRadius: radius.md, backgroundColor: c.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="remove" size={16} color={c.textPrimary} />
                  </TouchableOpacity>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: '700', color: c.textPrimary, minWidth: 20, textAlign: 'center' }}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => cart.updateQuantity(item.service, item.quantity + 1)} style={{ width: 30, height: 30, borderRadius: radius.md, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' }}>
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
            <TouchableOpacity onPress={useCurrentLocation} disabled={locLoading} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: c.brandLight, borderRadius: radius.lg, marginBottom: spacing.lg }}>
              {locLoading ? (
                <ActivityIndicator size="small" color={c.brand} />
              ) : (
                <Ionicons name="locate-outline" size={20} color={c.brand} />
              )}
              <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.brand, marginLeft: spacing.sm }}>
                {locLoading ? 'Detecting location...' : 'Use Current Location'}
              </Text>
            </TouchableOpacity>

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
                  onPress={() => setSelectedAddressIdx(idx)}
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
                    onPress={() => setPickupDate(d.value)}
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
                  onPress={() => setPickupSlot(slot)}
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
                  onPress={() => !disabled && setPaymentMethod(method)}
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
                  onPress={() => setTip(amt)}
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
