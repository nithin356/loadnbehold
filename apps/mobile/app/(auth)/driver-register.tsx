import { useState } from 'react';
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/lib/haptics';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { Button } from '@/components/Button';
import { driverApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const VEHICLE_TYPES = [
  { key: 'car', label: 'Car', icon: 'car-outline' as const },
  { key: 'bike', label: 'Bike', icon: 'bicycle-outline' as const },
  { key: 'van', label: 'Van', icon: 'bus-outline' as const },
];

export default function DriverRegisterScreen() {
  const c = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState('');
  const [vehicleType, setVehicleType] = useState('car');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [color, setColor] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Enter your full name');
    if (!make.trim()) return Alert.alert('Required', 'Enter vehicle make');
    if (!model.trim()) return Alert.alert('Required', 'Enter vehicle model');
    if (!plate.trim()) return Alert.alert('Required', 'Enter license plate');
    if (!color.trim()) return Alert.alert('Required', 'Enter vehicle color');

    setLoading(true);
    try {
      await driverApi.register({
        name: name.trim(),
        phone: user!.phone,
        ...(email.trim() ? { email: email.trim() } : {}),
        vehicle: {
          type: vehicleType,
          make: make.trim(),
          model: model.trim(),
          plate: plate.trim().toUpperCase(),
          color: color.trim(),
        },
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Update local user role so routing works
      setUser({ ...user!, name: name.trim(), role: 'driver' });

      Alert.alert(
        'Registration Submitted',
        'Your driver profile is pending approval. You can start accepting orders once approved.',
        [{ text: 'OK', onPress: () => router.replace('/') }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Registration failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    height: 52,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.base,
    color: c.textPrimary,
    borderWidth: 1,
    borderColor: c.border,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing['2xl'] }} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: spacing.xl }}>
            <Text style={{ color: c.brand, fontSize: fontSize.base, fontWeight: '500' }}>{'< Back'}</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: fontSize['2xl'], fontWeight: '700', color: c.textPrimary }}>
            Become a Driver
          </Text>
          <Text style={{ fontSize: fontSize.base, color: c.textSecondary, marginTop: spacing.xs, marginBottom: spacing['2xl'] }}>
            Fill in your details and vehicle info to get started.
          </Text>

          {/* Personal Info */}
          <Text style={{ fontSize: fontSize.sm, fontWeight: '700', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md }}>
            Personal Info
          </Text>

          <TextInput
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            placeholderTextColor={c.textTertiary}
            style={{ ...inputStyle, marginBottom: spacing.md }}
          />

          <TextInput
            placeholder="Email (optional)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={c.textTertiary}
            style={{ ...inputStyle, marginBottom: spacing.xl }}
          />

          {/* Vehicle Type */}
          <Text style={{ fontSize: fontSize.sm, fontWeight: '700', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md }}>
            Vehicle Type
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl }}>
            {VEHICLE_TYPES.map((vt) => {
              const selected = vehicleType === vt.key;
              return (
                <TouchableOpacity
                  key={vt.key}
                  onPress={() => { setVehicleType(vt.key); Haptics.selectionAsync(); }}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: spacing.lg,
                    borderRadius: radius.xl,
                    backgroundColor: selected ? c.brandLight : c.surface,
                    borderWidth: 2,
                    borderColor: selected ? c.brand : c.border,
                  }}
                >
                  <Ionicons name={vt.icon} size={28} color={selected ? c.brand : c.textTertiary} />
                  <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: selected ? c.brand : c.textSecondary, marginTop: spacing.xs }}>
                    {vt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Vehicle Details */}
          <Text style={{ fontSize: fontSize.sm, fontWeight: '700', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md }}>
            Vehicle Details
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
            <TextInput
              placeholder="Make (e.g. Toyota)"
              value={make}
              onChangeText={setMake}
              placeholderTextColor={c.textTertiary}
              style={{ ...inputStyle, flex: 1 }}
            />
            <TextInput
              placeholder="Model (e.g. Camry)"
              value={model}
              onChangeText={setModel}
              placeholderTextColor={c.textTertiary}
              style={{ ...inputStyle, flex: 1 }}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing['2xl'] }}>
            <TextInput
              placeholder="License Plate"
              value={plate}
              onChangeText={setPlate}
              autoCapitalize="characters"
              placeholderTextColor={c.textTertiary}
              style={{ ...inputStyle, flex: 1 }}
            />
            <TextInput
              placeholder="Color (e.g. Silver)"
              value={color}
              onChangeText={setColor}
              placeholderTextColor={c.textTertiary}
              style={{ ...inputStyle, flex: 1 }}
            />
          </View>

          {/* Info Banner */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: c.brandLight,
            borderRadius: radius.lg,
            padding: spacing.lg,
            marginBottom: spacing['2xl'],
            alignItems: 'flex-start',
            gap: spacing.sm,
          }}>
            <Ionicons name="information-circle" size={20} color={c.brand} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: fontSize.sm, color: c.brand, lineHeight: 20 }}>
              After registration your profile will be reviewed. You'll be able to go online and accept deliveries once approved.
            </Text>
          </View>

          <Button title="Submit Registration" onPress={handleSubmit} loading={loading} fullWidth size="lg" />

          <View style={{ height: spacing['3xl'] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
