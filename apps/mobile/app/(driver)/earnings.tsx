import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { toast } from 'sonner-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/lib/haptics';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Skeleton, SkeletonRow } from '@/components/Skeleton';
import { driverApi } from '@/lib/api';

interface EarningsData {
  metrics: { totalDeliveries: number; rating: number };
  cashBalance: number;
  cashCollected: number;
  cashDeposited: number;
  recentTransactions: {
    _id: string;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
  }[];
}

export default function EarningsScreen() {
  const c = useThemeColors();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [taxSummary, setTaxSummary] = useState<any>(null);
  const [showTaxSummary, setShowTaxSummary] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await driverApi.getEarnings();
      setData(res);
    } catch {
      toast.error('Failed to load earnings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid deposit amount');
      return;
    }
    if (amount > cashBalance) {
      toast.error(`You only have $${cashBalance.toFixed(2)} cash on hand`);
      return;
    }
    setDepositing(true);
    try {
      await driverApi.depositCash(amount);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDepositModalVisible(false);
      setDepositAmount('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to deposit cash');
    } finally {
      setDepositing(false);
    }
  };

  const loadTaxSummary = async () => {
    try {
      const res = await driverApi.getTaxSummary();
      setTaxSummary(res);
      setShowTaxSummary(true);
    } catch {
      toast.error('Failed to load tax summary');
    }
  };

  const totalDeliveries = data?.metrics?.totalDeliveries || 0;
  const cashBalance = data?.cashBalance || 0;
  const cashCollected = data?.cashCollected || 0;
  const cashDeposited = data?.cashDeposited || 0;

  const stats = [
    { label: 'Deliveries', value: String(totalDeliveries), icon: 'bicycle-outline' as const },
    { label: 'Cash Balance', value: `$${cashBalance.toFixed(2)}`, icon: 'cash-outline' as const },
    { label: 'Collected', value: `$${cashCollected.toFixed(2)}`, icon: 'arrow-down-circle-outline' as const },
    { label: 'Deposited', value: `$${cashDeposited.toFixed(2)}`, icon: 'arrow-up-circle-outline' as const },
  ];

  const txIcon = (type: string) => {
    switch (type) {
      case 'earning': return { name: 'trending-up' as const, color: c.success };
      case 'tip': return { name: 'heart' as const, color: '#EC4899' };
      case 'cod_collection': return { name: 'cash' as const, color: c.warning };
      case 'cod_deposit': return { name: 'wallet' as const, color: c.brand };
      case 'payout': return { name: 'card' as const, color: c.success };
      default: return { name: 'ellipse' as const, color: c.textTertiary };
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} />}
      >
        <View style={{ padding: spacing.xl }}>
          <Text style={{ fontSize: fontSize['2xl'], fontWeight: '700', color: c.textPrimary, marginBottom: spacing.xl }}>
            Earnings
          </Text>

          {loading && !data && (
            <View>
              <Skeleton width="100%" height={140} borderRadius={radius.xl} style={{ marginBottom: spacing.xl }} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl }}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={{ width: '47%' }}>
                    <Skeleton width="100%" height={80} borderRadius={radius.lg} />
                  </View>
                ))}
              </View>
              <Skeleton width={160} height={16} style={{ marginBottom: spacing.md }} />
              {[1, 2, 3].map((i) => (
                <SkeletonRow key={i} style={{ marginBottom: spacing.sm }} />
              ))}
            </View>
          )}

          {/* Total Earnings Card */}
          <View
            style={{
              borderRadius: radius.xl,
              padding: spacing['2xl'],
              backgroundColor: c.brand,
              marginBottom: spacing.xl,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: fontSize.sm, color: 'rgba(255,255,255,0.7)' }}>Total Earnings</Text>
            <Text style={{ fontSize: 40, fontWeight: '800', color: '#FFF', marginTop: spacing.xs }}>
              ${cashCollected.toFixed(2)}
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: spacing.xs }}>
              {totalDeliveries} deliveries completed
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {stats.map((stat) => (
              <Card key={stat.label} style={{ width: '48%' as any }}>
                <Ionicons name={stat.icon} size={22} color={c.brand} />
                <Text style={{ fontSize: fontSize.xl, fontWeight: '700', color: c.textPrimary, marginTop: spacing.sm }}>
                  {stat.value}
                </Text>
                <Text style={{ fontSize: fontSize.sm, color: c.textSecondary }}>{stat.label}</Text>
              </Card>
            ))}
          </View>

          {/* COD Section */}
          <Text
            style={{
              fontSize: fontSize.lg,
              fontWeight: '700',
              color: c.textPrimary,
              marginTop: spacing.xl,
              marginBottom: spacing.md,
            }}
          >
            Cash on Delivery
          </Text>
          {cashBalance > 0 ? (
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                <View>
                  <Text style={{ fontSize: fontSize.sm, color: c.textSecondary }}>Cash to deposit</Text>
                  <Text style={{ fontSize: fontSize.xl, fontWeight: '700', color: c.warning, marginTop: 2 }}>
                    ${cashBalance.toFixed(2)}
                  </Text>
                </View>
                <View style={{ width: 48, height: 48, borderRadius: radius.full, backgroundColor: c.warningLight, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="cash" size={24} color={c.warning} />
                </View>
              </View>
              <TouchableOpacity
                onPress={() => { setDepositAmount(cashBalance.toFixed(2)); setDepositModalVisible(true); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.brand,
                  borderRadius: radius.lg,
                  paddingVertical: spacing.md,
                  gap: spacing.xs,
                }}
              >
                <Ionicons name="arrow-up-circle" size={18} color="#FFF" />
                <Text style={{ fontSize: fontSize.sm, fontWeight: '700', color: '#FFF' }}>Deposit Cash</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <Card>
              <View style={{ alignItems: 'center', padding: spacing.lg }}>
                <Ionicons name="wallet-outline" size={40} color={c.textTertiary} />
                <Text style={{ color: c.textSecondary, marginTop: spacing.sm, textAlign: 'center' }}>
                  No cash on hand. All COD has been deposited.
                </Text>
              </View>
            </Card>
          )}

          {/* Tax Summary */}
          <TouchableOpacity
            onPress={loadTaxSummary}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: spacing.md,
              paddingVertical: spacing.md,
              backgroundColor: c.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: c.border,
              gap: spacing.xs,
            }}
          >
            <Ionicons name="document-text-outline" size={18} color={c.brand} />
            <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.brand }}>View Tax Summary</Text>
          </TouchableOpacity>

          {/* Recent Transactions */}
          <Text
            style={{
              fontSize: fontSize.lg,
              fontWeight: '700',
              color: c.textPrimary,
              marginTop: spacing.xl,
              marginBottom: spacing.md,
            }}
          >
            Recent Transactions
          </Text>
          {!data?.recentTransactions?.length ? (
            <Card>
              <View style={{ alignItems: 'center', padding: spacing.lg }}>
                <Ionicons name="receipt-outline" size={40} color={c.textTertiary} />
                <Text style={{ color: c.textSecondary, marginTop: spacing.sm }}>No transactions yet</Text>
              </View>
            </Card>
          ) : (
            data.recentTransactions.map((tx) => {
              const icon = txIcon(tx.type);
              const isPositive = ['earning', 'tip', 'cod_collection'].includes(tx.type);
              return (
                <View
                  key={tx._id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: spacing.md,
                    backgroundColor: c.surface,
                    borderRadius: radius.lg,
                    marginBottom: spacing.sm,
                    borderWidth: 1,
                    borderColor: c.border,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radius.full,
                      backgroundColor: c.surfaceSecondary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: spacing.md,
                    }}
                  >
                    <Ionicons name={icon.name} size={20} color={icon.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fontSize.sm, fontWeight: '500', color: c.textPrimary }}>
                      {tx.description}
                    </Text>
                    <Text style={{ fontSize: fontSize.xs, color: c.textTertiary, marginTop: 2 }}>
                      {new Date(tx.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: fontSize.base,
                      fontWeight: '700',
                      color: isPositive ? c.success : c.error,
                    }}
                  >
                    {isPositive ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Deposit Modal */}
      <Modal visible={depositModalVisible} transparent animationType="slide" onRequestClose={() => setDepositModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl }}>
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: spacing.lg }} />
              <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>Deposit Cash</Text>
              <Text style={{ fontSize: fontSize.sm, color: c.textSecondary, marginTop: spacing.xs }}>
                Balance: ${cashBalance.toFixed(2)}
              </Text>
            </View>

            <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textSecondary, marginBottom: spacing.xs }}>Amount</Text>
            <TextInput
              value={depositAmount}
              onChangeText={setDepositAmount}
              placeholder="0.00"
              placeholderTextColor={c.textTertiary}
              keyboardType="decimal-pad"
              style={{
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: radius.lg,
                padding: spacing.md,
                fontSize: fontSize.xl,
                fontWeight: '700',
                color: c.textPrimary,
                backgroundColor: c.surfaceSecondary,
                marginBottom: spacing.md,
                textAlign: 'center',
              }}
            />

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
              {[25, 50, 100].map((pct) => {
                const amt = (cashBalance * pct / 100).toFixed(2);
                return (
                  <TouchableOpacity
                    key={pct}
                    onPress={() => { setDepositAmount(amt); Haptics.selectionAsync(); }}
                    style={{
                      flex: 1,
                      paddingVertical: spacing.sm,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: depositAmount === amt ? c.brand : c.border,
                      backgroundColor: depositAmount === amt ? c.brandLight : 'transparent',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: fontSize.xs, fontWeight: '600', color: depositAmount === amt ? c.brand : c.textSecondary }}>
                      {pct === 100 ? 'All' : `${pct}%`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={handleDeposit}
              disabled={depositing}
              style={{
                height: 52,
                borderRadius: radius.xl,
                backgroundColor: c.brand,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: depositing ? 0.6 : 1,
              }}
            >
              {depositing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#FFF' }}>Confirm Deposit</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setDepositModalVisible(false)} style={{ alignItems: 'center', marginTop: spacing.md }}>
              <Text style={{ fontSize: fontSize.sm, color: c.textTertiary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Tax Summary Modal */}
      <Modal visible={showTaxSummary} transparent animationType="slide" onRequestClose={() => setShowTaxSummary(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl }}>
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: spacing.lg }} />
              <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>Tax Summary</Text>
              <Text style={{ fontSize: fontSize.sm, color: c.textSecondary, marginTop: spacing.xs }}>
                {taxSummary?.year || new Date().getFullYear()}
              </Text>
            </View>

            {taxSummary?.breakdown?.map((item: any, i: number) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: spacing.md,
                  borderBottomWidth: 1,
                  borderBottomColor: c.border,
                }}
              >
                <Text style={{ fontSize: fontSize.sm, color: c.textSecondary, textTransform: 'capitalize' }}>
                  {item._id?.replace(/_/g, ' ') || 'Other'}
                </Text>
                <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textPrimary }}>
                  ${item.total?.toFixed(2) || '0.00'}
                </Text>
              </View>
            ))}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.lg, marginTop: spacing.sm }}>
              <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: c.textPrimary }}>Total</Text>
              <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: c.brand }}>
                ${taxSummary?.total?.toFixed(2) || '0.00'}
              </Text>
            </View>

            {taxSummary?.disclaimer ? (
              <Text style={{ fontSize: fontSize.xs, color: c.textTertiary, marginTop: spacing.lg, textAlign: 'center', fontStyle: 'italic' }}>
                {taxSummary.disclaimer}
              </Text>
            ) : null}

            <TouchableOpacity
              onPress={() => setShowTaxSummary(false)}
              style={{
                height: 48,
                borderRadius: radius.xl,
                backgroundColor: c.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: spacing.xl,
              }}
            >
              <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textPrimary }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
