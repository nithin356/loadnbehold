import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Switch, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { useAuthStore } from '@/lib/store';
import { driverApi } from '@/lib/api';

export default function DriverProfileScreen() {
  const c = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    driverApi.getProfile()
      .then(setProfile)
      .catch(() => Alert.alert('Error', 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
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

  const menuSections = [
    {
      title: 'Account',
      items: [
        { icon: 'car-outline' as const, label: 'Vehicle Info', subtitle: profile?.vehicle?.make ? `${profile.vehicle.year} ${profile.vehicle.make} ${profile.vehicle.model}` : 'Not set', onPress: () => Alert.alert('Vehicle Info', 'Contact support to update your vehicle information.') },
        { icon: 'document-text-outline' as const, label: 'Documents', subtitle: 'License, insurance, registration', onPress: () => Alert.alert('Documents', 'Contact support to update your documents.') },
        { icon: 'card-outline' as const, label: 'Bank Account', subtitle: 'Payout details', onPress: () => Alert.alert('Bank Account', 'Contact support to update your bank details.') },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'notifications-outline' as const, label: 'Notifications', subtitle: 'Push & SMS settings', onPress: () => Linking.openSettings() },
        { icon: 'help-circle-outline' as const, label: 'Help & Support', subtitle: 'FAQ, contact us', onPress: () => Linking.openURL('mailto:support@loadnbehold.com?subject=Driver Support') },
      ],
    },
    {
      title: 'Legal',
      items: [
        { icon: 'shield-outline' as const, label: 'Privacy Policy', onPress: () => Linking.openURL('https://loadnbehold.com/privacy') },
        { icon: 'document-outline' as const, label: 'Terms of Service', onPress: () => Linking.openURL('https://loadnbehold.com/terms') },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ padding: spacing.xl }}>
          <Text style={{ fontSize: fontSize['2xl'], fontWeight: '700', color: c.textPrimary, marginBottom: spacing.xl }}>Profile</Text>

          {/* Profile Card */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, backgroundColor: c.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: c.border, marginBottom: spacing.xl }}>
            <View style={{ width: 56, height: 56, borderRadius: radius.xl, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
              <Text style={{ fontSize: fontSize.xl, fontWeight: '800', color: '#FFF' }}>{(user?.name || 'D').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>{user?.name || 'Driver'}</Text>
              <Text style={{ fontSize: fontSize.sm, color: c.textSecondary }}>{user?.phone}</Text>
              {profile?.metrics && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
                  <Ionicons name="star" size={14} color="#EAB308" />
                  <Text style={{ fontSize: fontSize.xs, color: c.textSecondary, marginLeft: 4 }}>
                    {profile.metrics.averageRating?.toFixed(1) || '0.0'} · {profile.metrics.totalDeliveries || 0} deliveries
                  </Text>
                </View>
              )}
            </View>
            <View style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: profile?.status === 'approved' ? '#D1FAE5' : '#FEF3C7' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: profile?.status === 'approved' ? '#065F46' : '#92400E' }}>
                {(profile?.status || 'pending').toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
            {[
              { label: 'Deliveries', value: profile?.metrics?.totalDeliveries || 0, icon: 'bicycle-outline' },
              { label: 'Rating', value: profile?.metrics?.averageRating?.toFixed(1) || '0.0', icon: 'star-outline' },
              { label: 'On Time', value: `${profile?.metrics?.onTimeRate || 0}%`, icon: 'time-outline' },
            ].map((stat) => (
              <View key={stat.label} style={{ flex: 1, padding: spacing.md, backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, alignItems: 'center' }}>
                <Ionicons name={stat.icon as any} size={20} color={c.brand} />
                <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary, marginTop: spacing.xs }}>{stat.value}</Text>
                <Text style={{ fontSize: fontSize.xs, color: c.textTertiary }}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Menu Sections */}
          {menuSections.map((section) => (
            <View key={section.title} style={{ marginBottom: spacing.xl }}>
              <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm }}>{section.title}</Text>
              <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
                {section.items.map((item, idx) => (
                  <TouchableOpacity
                    key={item.label}
                    onPress={item.onPress}
                    style={{
                      flexDirection: 'row', alignItems: 'center', padding: spacing.md,
                      borderBottomWidth: idx < section.items.length - 1 ? 1 : 0, borderBottomColor: c.border,
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: c.surfaceSecondary, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
                      <Ionicons name={item.icon} size={18} color={c.textTertiary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: '500', color: c.textPrimary }}>{item.label}</Text>
                      {item.subtitle && <Text style={{ fontSize: fontSize.xs, color: c.textTertiary }}>{item.subtitle}</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Logout */}
          <TouchableOpacity onPress={handleLogout} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.error }}>
            <Ionicons name="log-out-outline" size={18} color={c.error} />
            <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.error, marginLeft: spacing.sm }}>Log Out</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: fontSize.xs, color: c.textTertiary, textAlign: 'center', marginTop: spacing.lg }}>
            LoadNBehold Driver v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
