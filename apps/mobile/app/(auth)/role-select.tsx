import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/lib/haptics';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';

const ROLES = [
  {
    key: 'customer',
    title: 'Customer',
    subtitle: 'Get your laundry picked up and delivered fresh',
    icon: 'shirt-outline' as const,
  },
  {
    key: 'driver',
    title: 'Driver',
    subtitle: 'Earn money delivering laundry in your area',
    icon: 'car-outline' as const,
  },
];

export default function RoleSelectScreen() {
  const c = useThemeColors();

  const handleSelect = (role: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (role === 'driver') {
      router.push('/(auth)/driver-register');
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ flex: 1, padding: spacing['2xl'], justifyContent: 'center' }}>
        <Text style={{ fontSize: fontSize['2xl'], fontWeight: '700', color: c.textPrimary, marginBottom: spacing.xs }}>
          How will you use LoadNBehold?
        </Text>
        <Text style={{ fontSize: fontSize.base, color: c.textSecondary, marginBottom: spacing['3xl'] }}>
          You can always change this later.
        </Text>

        {ROLES.map((role) => (
          <TouchableOpacity
            key={role.key}
            onPress={() => handleSelect(role.key)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: c.surface,
              borderRadius: radius.xl,
              padding: spacing.xl,
              marginBottom: spacing.lg,
              borderWidth: 1.5,
              borderColor: c.border,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: radius.xl,
                backgroundColor: c.brandLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.lg,
              }}
            >
              <Ionicons name={role.icon} size={28} color={c.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>
                {role.title}
              </Text>
              <Text style={{ fontSize: fontSize.sm, color: c.textSecondary, marginTop: 2 }}>
                {role.subtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}
