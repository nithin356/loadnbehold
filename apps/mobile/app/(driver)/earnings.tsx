import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { Card } from '@/components/Card';
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

  const loadData = useCallback(async () => {
    try {
      const res = await driverApi.getEarnings();
      setData(res);
    } catch {
      Alert.alert('Error', 'Failed to load earnings');
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
            <View style={{ alignItems: 'center', paddingVertical: spacing['4xl'] }}>
              <Ionicons name="hourglass-outline" size={40} color={c.textTertiary} />
              <Text style={{ color: c.textSecondary, marginTop: spacing.sm }}>Loading earnings...</Text>
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
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
    </SafeAreaView>
  );
}
