import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from '@/lib/location';
import * as Haptics from '@/lib/haptics';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { customerApi } from '@/lib/api';
import { useLocationStore } from '@/lib/store';

interface Address {
  _id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  location: { type: string; coordinates: [number, number] };
  instructions?: string;
}

export default function AddressesScreen() {
  const c = useThemeColors();
  const setSelectedAddress = useLocationStore((s) => s.setSelectedAddress);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [label, setLabel] = useState('Home');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [instructions, setInstructions] = useState('');
  const [coords, setCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const data = await customerApi.getAddresses();
      setAddresses(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert('Error', 'Failed to load addresses');
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAddresses();
    setRefreshing(false);
  };

  const resetForm = () => {
    setLabel('Home');
    setLine1('');
    setCity('');
    setState('');
    setZip('');
    setInstructions('');
    setCoords(null);
  };

  const detectLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (geo) {
        setLine1([geo.streetNumber, geo.street].filter(Boolean).join(' ') || '');
        setCity(geo.city || '');
        // Convert full state name to 2-letter code
        const region = geo.region || '';
        setState(region.length === 2 ? region.toUpperCase() : region.slice(0, 2).toUpperCase());
        setZip((geo.postalCode || '').replace(/[^\d-]/g, '').slice(0, 5));
        setCoords([loc.coords.longitude, loc.coords.latitude]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert('Error', 'Could not detect location');
    }
  };

  const saveAddress = async () => {
    if (!line1.trim() || !city.trim() || !state.trim() || !zip.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all address fields.');
      return;
    }
    const trimmedState = state.trim().toUpperCase();
    if (trimmedState.length !== 2) {
      Alert.alert('Invalid State', 'State must be a 2-letter code (e.g., MI, CA, NY).');
      return;
    }
    const trimmedZip = zip.trim();
    if (!/^\d{5}(-\d{4})?$/.test(trimmedZip)) {
      Alert.alert('Invalid ZIP', 'Enter a valid 5-digit ZIP code.');
      return;
    }
    setSaving(true);
    try {
      const data = {
        label,
        line1: line1.trim(),
        city: city.trim(),
        state: trimmedState,
        zip: trimmedZip,
        instructions: instructions.trim() || undefined,
        location: { type: 'Point' as const, coordinates: coords || [-83.0458, 42.3314] as [number, number] },
      };
      await customerApi.addAddress(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowForm(false);
      resetForm();
      loadAddresses();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save address');
    }
    setSaving(false);
  };

  const deleteAddress = (id: string) => {
    Alert.alert('Delete Address', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await customerApi.deleteAddress(id);
            setAddresses((prev) => prev.filter((a) => a._id !== id));
          } catch {
            Alert.alert('Error', 'Failed to delete address');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={c.brand} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>Saved Addresses</Text>
        <TouchableOpacity onPress={() => { resetForm(); setShowForm(true); }}>
          <Ionicons name="add-circle" size={28} color={c.brand} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={addresses}
        keyExtractor={(item) => item._id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          showForm ? (
            <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.brand, padding: spacing.lg, marginBottom: spacing.lg }}>
              <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: c.textPrimary, marginBottom: spacing.md }}>New Address</Text>

              {Platform.OS !== 'web' && (
                <TouchableOpacity onPress={detectLocation} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: c.brandLight, borderRadius: radius.md, marginBottom: spacing.md }}>
                  <Ionicons name="locate-outline" size={16} color={c.brand} />
                  <Text style={{ fontSize: fontSize.xs, fontWeight: '600', color: c.brand, marginLeft: spacing.xs }}>Auto-detect from GPS</Text>
                </TouchableOpacity>
              )}

              {/* Label */}
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
                {['Home', 'Work', 'Other'].map((l) => (
                  <TouchableOpacity key={l} onPress={() => setLabel(l)} style={{ flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, borderColor: label === l ? c.brand : c.border, backgroundColor: label === l ? c.brandLight : 'transparent', alignItems: 'center' }}>
                    <Text style={{ fontSize: fontSize.xs, fontWeight: '600', color: label === l ? c.brand : c.textSecondary }}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {[
                { placeholder: 'Street address', value: line1, setter: setLine1 },
                { placeholder: 'City', value: city, setter: setCity },
                { placeholder: 'State (e.g. MI)', value: state, setter: setState, maxLength: 2, autoCapitalize: 'characters' as const },
                { placeholder: 'ZIP Code (e.g. 48201)', value: zip, setter: setZip, keyboard: 'number-pad' as const, maxLength: 5 },
                { placeholder: 'Delivery instructions (optional)', value: instructions, setter: setInstructions },
              ].map((field) => (
                <TextInput
                  key={field.placeholder}
                  value={field.value}
                  onChangeText={field.setter}
                  placeholder={field.placeholder}
                  placeholderTextColor={c.textTertiary}
                  keyboardType={field.keyboard}
                  maxLength={field.maxLength}
                  autoCapitalize={field.autoCapitalize}
                  style={{
                    height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: c.border,
                    paddingHorizontal: spacing.md, fontSize: fontSize.sm, color: c.textPrimary,
                    backgroundColor: c.background, marginBottom: spacing.sm,
                  }}
                />
              ))}

              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                <TouchableOpacity onPress={() => setShowForm(false)} style={{ flex: 1, height: 44, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveAddress} disabled={saving} style={{ flex: 1, height: 44, borderRadius: radius.lg, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.6 : 1 }}>
                  {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: '#FFF' }}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !showForm ? (
            <View style={{ alignItems: 'center', padding: spacing['2xl'] }}>
              <Ionicons name="location-outline" size={48} color={c.textTertiary} />
              <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: c.textSecondary, marginTop: spacing.md }}>No saved addresses</Text>
              <Text style={{ fontSize: fontSize.sm, color: c.textTertiary, marginTop: spacing.xs, textAlign: 'center' }}>Add an address to make ordering faster.</Text>
              <TouchableOpacity onPress={() => setShowForm(true)} style={{ marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, backgroundColor: c.brand, borderRadius: radius.lg }}>
                <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: '#FFF' }}>Add Address</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item: addr }) => (
          <TouchableOpacity
            onPress={() => { setSelectedAddress(addr); router.back(); }}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, marginBottom: spacing.sm }}
          >
            <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
              <Ionicons name={addr.label === 'Home' ? 'home-outline' : addr.label === 'Work' ? 'briefcase-outline' : 'location-outline'} size={20} color={c.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textPrimary }}>{addr.label}</Text>
              <Text style={{ fontSize: fontSize.xs, color: c.textSecondary }} numberOfLines={1}>{addr.line1}, {addr.city}, {addr.state} {addr.zip}</Text>
              {addr.instructions ? <Text style={{ fontSize: fontSize.xs, color: c.textTertiary, fontStyle: 'italic' }}>{addr.instructions}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => deleteAddress(addr._id)} style={{ padding: spacing.sm }}>
              <Ionicons name="trash-outline" size={18} color={c.error} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
