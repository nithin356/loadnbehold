import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, Appearance, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/lib/haptics';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/lib/store';
import { driverApi } from '@/lib/api';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
}

export default function DriverProfileScreen() {
  const c = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const data = await driverApi.getProfile();
      setProfile(data);
    } catch {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const currentTheme = Appearance.getColorScheme() || 'light';

  const cycleTheme = () => {
    const next = currentTheme === 'light' ? 'dark' : 'light';
    Appearance.setColorScheme(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Account',
      items: [
        { icon: 'car-outline', label: 'Vehicle Info', subtitle: profile?.vehicle?.make ? `${profile.vehicle.year} ${profile.vehicle.make} ${profile.vehicle.model}` : 'Not set', onPress: () => Alert.alert('Vehicle Info', 'Contact support to update your vehicle information.') },
        { icon: 'document-text-outline', label: 'Documents', subtitle: 'License, insurance, registration', onPress: () => Alert.alert('Documents', 'Contact support to update your documents.') },
        { icon: 'card-outline', label: 'Bank Account', subtitle: 'Payout details', onPress: () => Alert.alert('Bank Account', 'Contact support to update your bank details.') },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: currentTheme === 'dark' ? 'moon' : 'sunny-outline', label: 'Appearance', subtitle: currentTheme === 'dark' ? 'Dark mode' : 'Light mode', onPress: cycleTheme },
        { icon: 'notifications-outline', label: 'Notifications', subtitle: 'Push & SMS settings', onPress: () => Platform.OS !== 'web' && Linking.openSettings() },
        { icon: 'help-circle-outline', label: 'Help & Support', subtitle: 'FAQ, contact us', onPress: () => Linking.openURL('mailto:support@loadnbehold.com?subject=Driver Support') },
      ],
    },
    {
      title: '',
      items: [
        { icon: 'shield-outline', label: 'Privacy Policy', onPress: () => Linking.openURL('https://loadnbehold.com/privacy') },
        { icon: 'document-outline', label: 'Terms of Service', onPress: () => Linking.openURL('https://loadnbehold.com/terms') },
        { icon: 'log-out-outline', label: 'Log Out', danger: true, onPress: handleLogout },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={{ padding: spacing.xl }}>
          <Text style={{ fontSize: fontSize['2xl'], fontWeight: '700', color: c.textPrimary, marginBottom: spacing.xl }}>Profile</Text>

          {/* Profile Card */}
          <Card style={{ marginBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 56, height: 56, borderRadius: radius.full, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', marginRight: spacing.lg }}>
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
          </Card>

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
            {[
              { label: 'Deliveries', value: String(profile?.metrics?.totalDeliveries || 0), icon: 'bicycle-outline' as const },
              { label: 'Rating', value: profile?.metrics?.averageRating?.toFixed(1) || '0.0', icon: 'star-outline' as const },
              { label: 'On Time', value: `${profile?.metrics?.onTimeRate || 0}%`, icon: 'time-outline' as const },
            ].map((stat) => (
              <Card key={stat.label} style={{ flex: 1, alignItems: 'center' }}>
                <Ionicons name={stat.icon} size={20} color={c.brand} />
                <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary, marginTop: spacing.xs }}>{stat.value}</Text>
                <Text style={{ fontSize: fontSize.xs, color: c.textTertiary }}>{stat.label}</Text>
              </Card>
            ))}
          </View>

          {/* Menu Sections */}
          {menuSections.map((section, sIdx) => (
            <View key={sIdx} style={{ marginBottom: spacing.xl }}>
              {section.title ? (
                <Text style={{ fontSize: fontSize.xs, fontWeight: '600', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm, paddingLeft: spacing.xs }}>
                  {section.title}
                </Text>
              ) : null}
              <Card padding={0}>
                {section.items.map((item, idx) => (
                  <TouchableOpacity
                    key={item.label}
                    onPress={item.onPress}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: spacing.lg,
                      borderBottomWidth: idx < section.items.length - 1 ? 1 : 0,
                      borderBottomColor: c.border,
                    }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={item.danger ? c.error : c.textSecondary}
                      style={{ marginRight: spacing.md }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fontSize.base, fontWeight: '500', color: item.danger ? c.error : c.textPrimary }}>
                        {item.label}
                      </Text>
                      {item.subtitle ? (
                        <Text style={{ fontSize: fontSize.xs, color: c.textTertiary, marginTop: 1 }}>{item.subtitle}</Text>
                      ) : null}
                    </View>
                    {!item.danger && <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />}
                  </TouchableOpacity>
                ))}
              </Card>
            </View>
          ))}

          <Text style={{ fontSize: fontSize.xs, color: c.textTertiary, textAlign: 'center', marginTop: spacing.sm }}>
            LoadNBehold Driver v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
