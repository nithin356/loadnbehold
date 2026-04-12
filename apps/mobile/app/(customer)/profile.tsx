import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, Share, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/lib/store';
import { customerApi } from '@/lib/api';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
}

export default function ProfileScreen() {
  const c = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const openEditModal = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      Alert.alert('Validation', 'Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      await customerApi.updateProfile({ name: trimmedName, email: editEmail.trim() || undefined });
      if (setUser && user) {
        setUser({ ...user, name: trimmedName, email: editEmail.trim() || user.email });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          logout();
          router.replace('/');
        },
      },
    ]);
  };

  const handleReferral = async () => {
    try {
      await Share.share({
        message: `Join LoadNBehold and get your laundry done! Use my referral link to sign up and we both earn $10. Download now: https://loadnbehold.com/invite`,
      });
    } catch {
      // user cancelled share
    }
  };

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Account',
      items: [
        { icon: 'location-outline', label: 'Saved Addresses', subtitle: 'Manage your addresses', onPress: () => router.push('/(customer)/addresses') },
        { icon: 'card-outline', label: 'Payment Methods', subtitle: 'Cards and wallet', onPress: () => router.push('/(customer)/wallet') },
        { icon: 'people-outline', label: 'Family Members', subtitle: 'Manage family accounts', onPress: () => Alert.alert('Family Members', 'Family sharing is available with Plus and Premium plans. Upgrade your subscription to add family members.') },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'notifications-outline', label: 'Notifications', subtitle: 'Push & SMS settings', onPress: () => Linking.openSettings() },
        { icon: 'language-outline', label: 'Language', subtitle: 'English', onPress: () => Linking.openSettings() },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center', subtitle: 'FAQs and guides', onPress: () => Linking.openURL('https://loadnbehold.com/faq') },
        { icon: 'chatbubble-outline', label: 'Support Tickets', subtitle: 'View or create tickets', onPress: () => router.push('/(customer)/support') },
        { icon: 'share-social-outline', label: 'Refer a Friend', subtitle: 'Earn $10 for each referral', onPress: handleReferral },
      ],
    },
    {
      title: '',
      items: [
        { icon: 'document-text-outline', label: 'Terms of Service', onPress: () => Linking.openURL('https://loadnbehold.com/terms') },
        { icon: 'shield-checkmark-outline', label: 'Privacy Policy', onPress: () => Linking.openURL('https://loadnbehold.com/privacy') },
        { icon: 'log-out-outline', label: 'Logout', danger: true, onPress: handleLogout },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ padding: spacing.xl }}>
          <Text style={{ fontSize: fontSize['2xl'], fontWeight: '700', color: c.textPrimary, marginBottom: spacing.xl }}>
            Profile
          </Text>

          {/* User Card */}
          <Card style={{ marginBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: radius.full,
                  backgroundColor: c.brand,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.lg,
                }}
              >
                <Text style={{ color: '#FFF', fontSize: fontSize.xl, fontWeight: '700' }}>
                  {(user?.name || 'U')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fontSize.lg, fontWeight: '600', color: c.textPrimary }}>
                  {user?.name || 'User'}
                </Text>
                <Text style={{ fontSize: fontSize.sm, color: c.textSecondary }}>{user?.phone}</Text>
                {user?.email && (
                  <Text style={{ fontSize: fontSize.sm, color: c.textSecondary }}>{user.email}</Text>
                )}
              </View>
              <TouchableOpacity onPress={openEditModal}>
                <Ionicons name="create-outline" size={20} color={c.brand} />
              </TouchableOpacity>
            </View>
          </Card>

          {/* Menu Sections */}
          {sections.map((section, sIdx) => (
            <View key={sIdx} style={{ marginBottom: spacing.xl }}>
              {section.title ? (
                <Text
                  style={{
                    fontSize: fontSize.xs,
                    fontWeight: '600',
                    color: c.textTertiary,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    marginBottom: spacing.sm,
                    paddingLeft: spacing.xs,
                  }}
                >
                  {section.title}
                </Text>
              ) : null}
              <Card padding={0}>
                {section.items.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
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
                      <Text
                        style={{
                          fontSize: fontSize.base,
                          fontWeight: '500',
                          color: item.danger ? c.error : c.textPrimary,
                        }}
                      >
                        {item.label}
                      </Text>
                      {item.subtitle && (
                        <Text style={{ fontSize: fontSize.xs, color: c.textTertiary, marginTop: 1 }}>
                          {item.subtitle}
                        </Text>
                      )}
                    </View>
                    {!item.danger && <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />}
                  </TouchableOpacity>
                ))}
              </Card>
            </View>
          ))}

          <Text style={{ fontSize: fontSize.xs, color: c.textTertiary, textAlign: 'center', marginTop: spacing.sm }}>
            LoadNBehold v1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl }}>
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: spacing.lg }} />
              <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>Edit Profile</Text>
            </View>

            <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textSecondary, marginBottom: spacing.xs }}>Name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={c.textTertiary}
              style={{
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: radius.lg,
                padding: spacing.md,
                fontSize: fontSize.base,
                color: c.textPrimary,
                backgroundColor: c.surfaceSecondary,
                marginBottom: spacing.md,
              }}
            />

            <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textSecondary, marginBottom: spacing.xs }}>Email</Text>
            <TextInput
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="your@email.com"
              placeholderTextColor={c.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: radius.lg,
                padding: spacing.md,
                fontSize: fontSize.base,
                color: c.textPrimary,
                backgroundColor: c.surfaceSecondary,
                marginBottom: spacing.xl,
              }}
            />

            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={saving}
              style={{
                height: 52,
                borderRadius: radius.xl,
                backgroundColor: c.brand,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#FFF' }}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={{ alignItems: 'center', marginTop: spacing.md }}>
              <Text style={{ fontSize: fontSize.sm, color: c.textTertiary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
