import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Share, Modal, TextInput, ActivityIndicator, Appearance, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import * as Haptics from '@/lib/haptics';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuthStore } from '@/lib/store';
import { customerApi, referralApi } from '@/lib/api';

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
  const [refreshing, setRefreshing] = useState(false);
  const [referralModalVisible, setReferralModalVisible] = useState(false);
  const [referralInput, setReferralInput] = useState('');
  const [applyingReferral, setApplyingReferral] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const profile = await customerApi.getProfile();
      if (profile && setUser) setUser(profile);
    } catch {}
    setRefreshing(false);
  }, [setUser]);

  const openEditModal = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      toast.error('Name cannot be empty');
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
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    setLogoutConfirmVisible(true);
  };

  const confirmLogout = () => {
    setLogoutConfirmVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logout();
    router.replace('/');
  };

  const handleApplyReferral = async () => {
    const code = referralInput.trim().toUpperCase();
    if (!code) {
      toast.error('Please enter a referral code');
      return;
    }
    setApplyingReferral(true);
    try {
      const result = await referralApi.apply(code);
      toast.success(result.message);
      setReferralModalVisible(false);
      setReferralInput('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply referral code');
    } finally {
      setApplyingReferral(false);
    }
  };

  const handleReferral = async () => {
    try {
      const data = await referralApi.getCode();
      const code = data.code;
      const msg = `Join LoadNBehold and get your laundry done! Use my referral link to sign up and we both earn $5. Download now: https://loadnbehold.com/invite?ref=${code}`;
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(msg);
        toast.success('Referral link copied to clipboard');
      } else {
        await Share.share({ message: msg });
      }
    } catch {
      // user cancelled share or failed to fetch code
    }
  };

  const currentTheme = Appearance.getColorScheme() || 'light';

  const cycleTheme = () => {
    const next = currentTheme === 'light' ? 'dark' : 'light';
    Appearance.setColorScheme(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Account',
      items: [
        { icon: 'location-outline', label: 'Saved Addresses', subtitle: 'Manage your addresses', onPress: () => router.push('/(customer)/addresses') },
        { icon: 'card-outline', label: 'Payment Methods', subtitle: 'Cards and wallet', onPress: () => router.push('/(customer)/wallet') },
        { icon: 'people-outline', label: 'Family Members', subtitle: 'Manage family accounts', onPress: () => toast.info('Family sharing is available with Plus and Premium plans. Upgrade your subscription to add family members.') },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: currentTheme === 'dark' ? 'moon' : 'sunny-outline', label: 'Appearance', subtitle: currentTheme === 'dark' ? 'Dark mode' : 'Light mode', onPress: cycleTheme },
        { icon: 'notifications-outline', label: 'Notifications', subtitle: 'Push & SMS settings', onPress: () => Platform.OS !== 'web' && Linking.openSettings() },
        { icon: 'language-outline', label: 'Language', subtitle: 'English', onPress: () => Platform.OS !== 'web' && Linking.openSettings() },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center', subtitle: 'FAQs and guides', onPress: () => Linking.openURL('https://loadnbehold.com/faq') },
        { icon: 'chatbubble-outline', label: 'Support Tickets', subtitle: 'View or create tickets', onPress: () => router.push('/(customer)/support') },
        { icon: 'share-social-outline', label: 'Refer a Friend', subtitle: 'Earn $5 for each referral', onPress: handleReferral },
        { icon: 'gift-outline', label: 'Apply Referral Code', subtitle: 'Enter a code from a friend', onPress: () => setReferralModalVisible(true) },
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
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
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
                {user?.email ? (
                  <Text style={{ fontSize: fontSize.sm, color: c.textSecondary }}>{user.email}</Text>
                ) : null}
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
                      {item.subtitle ? (
                        <Text style={{ fontSize: fontSize.xs, color: c.textTertiary, marginTop: 1 }}>
                          {item.subtitle}
                        </Text>
                      ) : null}
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
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Referral Code Modal */}
      <Modal visible={referralModalVisible} transparent animationType="slide" onRequestClose={() => setReferralModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl }}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary, marginBottom: spacing.sm }}>
              Apply Referral Code
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: c.textSecondary, marginBottom: spacing.lg }}>
              Enter the code your friend shared with you. You'll both earn $5 after your first order is delivered!
            </Text>
            <TextInput
              value={referralInput}
              onChangeText={setReferralInput}
              placeholder="e.g. JOHN20"
              placeholderTextColor={c.textTertiary}
              autoCapitalize="characters"
              style={{
                backgroundColor: c.surfaceSecondary,
                borderRadius: radius.lg,
                padding: spacing.lg,
                fontSize: fontSize.base,
                color: c.textPrimary,
                fontWeight: '600',
                letterSpacing: 1,
                marginBottom: spacing.lg,
                borderWidth: 1,
                borderColor: c.border,
              }}
            />
            <TouchableOpacity
              onPress={handleApplyReferral}
              disabled={applyingReferral}
              style={{
                backgroundColor: c.brand,
                borderRadius: radius.lg,
                padding: spacing.lg,
                alignItems: 'center',
                opacity: applyingReferral ? 0.6 : 1,
                marginBottom: spacing.sm,
              }}
            >
              {applyingReferral ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: fontSize.base }}>Apply Code</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setReferralModalVisible(false); setReferralInput(''); }}
              style={{ padding: spacing.md, alignItems: 'center' }}
            >
              <Text style={{ color: c.textSecondary, fontSize: fontSize.base }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog
        visible={logoutConfirmVisible}
        title="Logout"
        message="Are you sure you want to log out?"
        confirmLabel="Logout"
        destructive
        onConfirm={confirmLogout}
        onCancel={() => setLogoutConfirmVisible(false)}
      />
    </SafeAreaView>
  );
}
