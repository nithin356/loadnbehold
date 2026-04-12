import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { Button } from '@/components/Button';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const OTP_LENGTH = 6;

export default function VerifyScreen() {
  const c = useThemeColors();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const login = useAuthStore((s) => s.login);

  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(30);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];

    if (text.length > 1) {
      // Handle paste
      const chars = text.slice(0, OTP_LENGTH - index).split('');
      chars.forEach((ch, i) => {
        if (index + i < OTP_LENGTH) newOtp[index + i] = ch;
      });
      setOtp(newOtp);
      const nextIdx = Math.min(index + chars.length, OTP_LENGTH - 1);
      inputRefs.current[nextIdx]?.focus();
    } else {
      newOtp[index] = text;
      setOtp(newOtp);
      if (text && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }

    // Auto-submit
    const fullCode = newOtp.join('');
    if (fullCode.length === OTP_LENGTH && !fullCode.includes('')) {
      handleVerify(fullCode);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const finalCode = code || otp.join('');
    if (finalCode.length !== OTP_LENGTH) {
      setError('Enter the complete 6-digit code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await authApi.verifyOtp(phone!, finalCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      login(result.user, result.accessToken, result.refreshToken);
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setOtp(new Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      await authApi.sendOtp(phone!);
      setCountdown(30);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: spacing['2xl'], justifyContent: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: spacing['3xl'] }}>
            <Text style={{ color: c.brand, fontSize: fontSize.base, fontWeight: '500' }}>{'< Back'}</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: fontSize['2xl'], fontWeight: '700', color: c.textPrimary }}>
            Verify your number
          </Text>
          <Text style={{ fontSize: fontSize.base, color: c.textSecondary, marginTop: spacing.sm, marginBottom: spacing['3xl'] }}>
            Enter the 6-digit code sent to {phone}
          </Text>

          {/* OTP Inputs */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            {otp.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={(ref) => { inputRefs.current[idx] = ref; }}
                value={digit}
                onChangeText={(text) => handleChange(text, idx)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, idx)}
                keyboardType="number-pad"
                maxLength={idx === 0 ? OTP_LENGTH : 1}
                style={{
                  width: 48,
                  height: 56,
                  backgroundColor: c.surfaceSecondary,
                  borderRadius: radius.lg,
                  textAlign: 'center',
                  fontSize: fontSize.xl,
                  fontWeight: '700',
                  color: c.textPrimary,
                  borderWidth: digit ? 2 : 0,
                  borderColor: c.brand,
                }}
              />
            ))}
          </View>

          {error && (
            <Text style={{ color: c.error, fontSize: fontSize.sm, marginBottom: spacing.lg, textAlign: 'center' }}>
              {error}
            </Text>
          )}

          <Button title="Verify" onPress={() => handleVerify()} loading={loading} fullWidth size="lg" />

          <TouchableOpacity
            onPress={handleResend}
            disabled={countdown > 0}
            style={{ alignItems: 'center', marginTop: spacing['2xl'] }}
          >
            <Text style={{ color: countdown > 0 ? c.textTertiary : c.brand, fontSize: fontSize.base }}>
              {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
