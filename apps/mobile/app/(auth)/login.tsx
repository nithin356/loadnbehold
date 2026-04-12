import { useState, useCallback } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { Button } from '@/components/Button';
import { authApi } from '@/lib/api';

/** Formats raw digits into (555) 123-4567 */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Extracts raw digits from formatted phone */
function unformatPhone(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

const FEATURES = [
  { icon: 'time-outline' as const, text: 'Same-day pickup' },
  { icon: 'car-outline' as const, text: 'Free delivery $50+' },
  { icon: 'shield-checkmark-outline' as const, text: 'Insured garments' },
  { icon: 'sparkles-outline' as const, text: 'Premium cleaning' },
];

function LogoWithFallback({ size, borderRadius, brandColor, marginBottom }: { size: number; borderRadius: number; brandColor: string; marginBottom: number }) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <View style={{ width: size, height: size, borderRadius, backgroundColor: brandColor, alignItems: 'center', justifyContent: 'center', marginBottom }}>
        <Text style={{ color: '#FFF', fontSize: size / 3, fontWeight: '800' }}>LNB</Text>
      </View>
    );
  }

  return (
    <Image
      source={require('@/assets/icon.png')}
      style={{ width: size, height: size, borderRadius, marginBottom }}
      onError={() => setImgError(true)}
    />
  );
}

export default function LoginScreen() {
  const c = useThemeColors();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneChange = useCallback((text: string) => {
    setError('');
    setPhone(formatPhone(text));
  }, []);

  const handleSendOtp = async () => {
    const cleaned = unformatPhone(phone);
    if (cleaned.length < 10) {
      setError('Enter a valid 10-digit phone number');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const fullPhone = cleaned.startsWith('1') ? `+${cleaned}` : `+1${cleaned}`;
      await authApi.sendOtp(fullPhone);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({ pathname: '/(auth)/verify', params: { phone: fullPhone } });
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing['2xl'] }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo + Branding */}
          <View style={{ alignItems: 'center', marginBottom: spacing['3xl'] }}>
            <LogoWithFallback size={80} borderRadius={radius.xl} brandColor={c.brand} marginBottom={spacing.lg} />
            <Text style={{ fontSize: fontSize['2xl'], fontWeight: '800', color: c.textPrimary, letterSpacing: -0.5 }}>
              LoadNBehold
            </Text>
            <Text style={{ fontSize: fontSize.base, color: c.textSecondary, marginTop: spacing.xs }}>
              Laundry, delivered fresh.
            </Text>
          </View>

          {/* Feature Pills */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: spacing.sm,
              marginBottom: spacing['3xl'],
            }}
          >
            {FEATURES.map((f) => (
              <View
                key={f.text}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: c.brandLight,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs + 2,
                  borderRadius: radius.full,
                  gap: spacing.xs,
                }}
              >
                <Ionicons name={f.icon} size={13} color={c.brand} />
                <Text style={{ fontSize: fontSize.xs, color: c.brand, fontWeight: '600' }}>{f.text}</Text>
              </View>
            ))}
          </View>

          {/* Phone Input Section */}
          <Text style={{ fontSize: fontSize.lg, fontWeight: '600', color: c.textPrimary, marginBottom: spacing.lg }}>
            Log in or sign up
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: c.surfaceSecondary,
              borderRadius: radius.lg,
              height: 56,
              marginBottom: spacing.sm,
              borderWidth: error ? 1.5 : 1,
              borderColor: error ? c.error : c.border,
            }}
          >
            {/* Country code */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: spacing.lg,
                height: '100%',
                borderRightWidth: 1,
                borderRightColor: c.border,
              }}
            >
              <Text style={{ fontSize: 18, marginRight: 6 }}>🇺🇸</Text>
              <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: c.textPrimary }}>+1</Text>
            </View>

            {/* Phone text input */}
            <TextInput
              placeholder="(555) 123-4567"
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              maxLength={14}
              placeholderTextColor={c.textTertiary}
              style={{
                flex: 1,
                height: '100%',
                paddingHorizontal: spacing.lg,
                fontSize: fontSize.base,
                color: c.textPrimary,
                fontWeight: '500',
                letterSpacing: 0.5,
              }}
            />
          </View>

          {/* Error / spacer */}
          {error ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
              <Ionicons name="alert-circle" size={14} color={c.error} />
              <Text style={{ color: c.error, fontSize: fontSize.sm, marginLeft: spacing.xs }}>{error}</Text>
            </View>
          ) : (
            <View style={{ height: spacing.lg + fontSize.sm }} />
          )}

          <Button title="Continue" onPress={handleSendOtp} loading={loading} fullWidth size="lg" />

          <Text
            style={{
              fontSize: fontSize.xs,
              color: c.textTertiary,
              textAlign: 'center',
              marginTop: spacing['2xl'],
              lineHeight: 18,
            }}
          >
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
