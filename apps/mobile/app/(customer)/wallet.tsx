import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform, Linking, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/lib/haptics';
import { useConfirmPayment } from '@/lib/stripe';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { WalletSkeleton } from '@/components/Skeleton';
import { walletApi, paymentApi } from '@/lib/api';
import { WALLET_TOPUP_AMOUNTS } from '@loadnbehold/constants';

interface Transaction {
  _id: string;
  type: 'topup' | 'payment' | 'credit' | 'refund';
  amount: number;
  description: string;
  createdAt: string;
}

export default function WalletScreen() {
  const c = useThemeColors();
  const { confirmPayment } = useConfirmPayment();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savedMethods, setSavedMethods] = useState<any[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [balRes, txRes, methodsRes] = await Promise.all([
        walletApi.getBalance(),
        walletApi.transactions(),
        paymentApi.getSavedMethods().catch(() => []),
      ]);
      setBalance(balRes?.balance ?? 0);
      setTransactions(Array.isArray(txRes) ? txRes : txRes?.items || []);
      const methods = Array.isArray(methodsRes) ? methodsRes : [];
      setSavedMethods(methods);
      const defaultMethod = methods.find((m: any) => m.isDefault);
      if (defaultMethod) setSelectedMethodId(defaultMethod._id);
    } catch {
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const getTopUpAmount = (): number | null => {
    if (customAmount.trim()) {
      const parsed = parseFloat(customAmount);
      if (isNaN(parsed) || parsed < 1) return null;
      return parsed;
    }
    return selectedAmount;
  };

  const handleTopUp = async () => {
    const amount = getTopUpAmount();
    if (!amount) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount (minimum $1)');
      return;
    }
    if (amount > 10_000) {
      Alert.alert('Limit Exceeded', 'Maximum top-up amount is $10,000');
      return;
    }
    if ((balance ?? 0) + amount > 10_000) {
      Alert.alert('Limit Exceeded', 'Wallet balance cannot exceed $10,000');
      return;
    }

    setTopUpLoading(true);
    try {
      const res = await walletApi.topup(amount, {
        savedPaymentMethodId: selectedMethodId || undefined,
      });

      if (res.requiresConfirmation && res.approvalUrl) {
        // PayPal or similar — open approval URL in browser
        Linking.openURL(res.approvalUrl);
        return;
      }

      if (res.requiresConfirmation && res.clientSecret) {
        // Confirm payment via Stripe SDK
        const { error, paymentIntent } = await confirmPayment(res.clientSecret, {
          paymentMethodType: 'Card',
        });
        if (error) {
          Alert.alert('Payment Failed', error.message || 'Card confirmation failed');
          setTopUpLoading(false);
          return;
        }
        // Tell server to finalize the top-up
        const confirmRes = await walletApi.confirmTopup(amount, paymentIntent?.id || res.transactionId || '');
        setBalance(confirmRes.balance);
      } else {
        // Direct credit — balance already updated server-side
        setBalance(res.balance ?? (balance ?? 0) + amount);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedAmount(null);
      setCustomAmount('');
      Alert.alert('Success', `$${amount.toFixed(2)} added to your wallet!`);
      loadData();
    } catch (err: any) {
      Alert.alert('Payment Failed', err.message || 'Failed to process payment. Please try again.');
    } finally {
      setTopUpLoading(false);
    }
  };

  const txIcon = (type: string) => {
    switch (type) {
      case 'topup': return { name: 'arrow-down-circle' as const, color: c.success };
      case 'payment': return { name: 'arrow-up-circle' as const, color: c.error };
      case 'credit': return { name: 'gift' as const, color: c.brand };
      case 'refund': return { name: 'refresh-circle' as const, color: c.warning };
      default: return { name: 'ellipse' as const, color: c.textTertiary };
    }
  };

  const handleDeleteCard = (id: string) => {
    Alert.alert('Remove Card', 'Are you sure you want to remove this card?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await paymentApi.deleteSavedMethod(id);
            setSavedMethods((prev) => prev.filter((m) => m._id !== id));
            if (selectedMethodId === id) setSelectedMethodId(null);
          } catch {
            Alert.alert('Error', 'Failed to remove card');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
        <WalletSkeleton />
      </SafeAreaView>
    );
  }

  const topUpAmount = getTopUpAmount();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }}
              tintColor={c.brand}
              colors={[c.brand]}
            />
          }
        >
          <View style={{ padding: spacing.xl }}>
            <Text style={{ fontSize: fontSize['2xl'], fontWeight: '700', color: c.textPrimary, marginBottom: spacing.xl }}>
              Wallet
            </Text>

            {/* Balance Card */}
            <View
              style={{
                borderRadius: radius.xl,
                padding: spacing['2xl'],
                backgroundColor: c.brand,
                marginBottom: spacing.xl,
              }}
            >
              <Text style={{ fontSize: fontSize.sm, color: 'rgba(255,255,255,0.7)' }}>Available Balance</Text>
              <Text style={{ fontSize: 40, fontWeight: '800', color: '#FFF', marginTop: spacing.xs }}>
                ${(balance ?? 0).toFixed(2)}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: 'rgba(255,255,255,0.5)', marginTop: spacing.xs }}>
                Max balance: $10,000
              </Text>
            </View>

            {/* Top Up */}
            <Text style={{ fontSize: fontSize.lg, fontWeight: '600', color: c.textPrimary, marginBottom: spacing.md }}>
              Add Money
            </Text>

            {/* Quick amounts */}
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
              {[...WALLET_TOPUP_AMOUNTS].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  onPress={() => {
                    setSelectedAmount(selectedAmount === amt ? null : amt);
                    setCustomAmount('');
                    Haptics.selectionAsync();
                  }}
                  accessibilityLabel={`Add ${amt} dollars to wallet`}
                  accessibilityRole="button"
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: radius.lg,
                    borderWidth: 1.5,
                    borderColor: selectedAmount === amt ? c.brand : c.border,
                    backgroundColor: selectedAmount === amt ? c.brandLight : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: fontSize.sm,
                    fontWeight: '600',
                    color: selectedAmount === amt ? c.brand : c.textSecondary,
                  }}>
                    ${amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom amount */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: customAmount ? c.brand : c.border,
              borderRadius: radius.lg,
              paddingHorizontal: spacing.md,
              marginBottom: spacing.lg,
              height: 48,
            }}>
              <Text style={{ fontSize: fontSize.lg, fontWeight: '600', color: c.textTertiary, marginRight: spacing.xs }}>$</Text>
              <TextInput
                value={customAmount}
                onChangeText={(text) => {
                  setCustomAmount(text.replace(/[^0-9.]/g, ''));
                  setSelectedAmount(null);
                }}
                placeholder="Custom amount (1 - 10,000)"
                placeholderTextColor={c.textTertiary}
                keyboardType="decimal-pad"
                style={{
                  flex: 1,
                  fontSize: fontSize.base,
                  color: c.textPrimary,
                  height: '100%',
                }}
              />
            </View>

            {/* Saved Cards */}
            {savedMethods.length > 0 && (
              <View style={{ marginBottom: spacing.md }}>
                <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm }}>
                  Payment Method
                </Text>
                {savedMethods.map((method: any) => {
                  const isSelected = selectedMethodId === method._id;
                  return (
                    <View key={method._id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                      <TouchableOpacity
                        onPress={() => { setSelectedMethodId(isSelected ? null : method._id); Haptics.selectionAsync(); }}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: spacing.md,
                          borderRadius: radius.lg,
                          borderWidth: 1.5,
                          borderColor: isSelected ? c.brand : c.border,
                          backgroundColor: isSelected ? c.brandLight : c.surface,
                          gap: spacing.md,
                        }}
                      >
                        <View style={{
                          width: 36, height: 36, borderRadius: radius.md,
                          backgroundColor: isSelected ? c.brand : c.surfaceSecondary,
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Ionicons name="card" size={18} color={isSelected ? '#FFF' : c.textTertiary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textPrimary, textTransform: 'capitalize' }}>
                            {method.card?.brand || method.gateway} ****{method.card?.last4}
                          </Text>
                          <Text style={{ fontSize: fontSize.xs, color: c.textSecondary }}>
                            Expires {method.card?.expMonth}/{method.card?.expYear}
                          </Text>
                        </View>
                        {method.isDefault && (
                          <View style={{ backgroundColor: c.brandLight, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: c.brand }}>DEFAULT</Text>
                          </View>
                        )}
                        {isSelected && (
                          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="checkmark" size={12} color="#FFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteCard(method._id)}
                        style={{
                          width: 36, height: 36, borderRadius: radius.md,
                          borderWidth: 1, borderColor: c.border,
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color={c.error} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
                <Text style={{ fontSize: fontSize.xs, color: c.textTertiary }}>
                  {selectedMethodId ? 'Using saved card. Tap again to deselect.' : 'Select a card or pay with new card.'}
                </Text>
              </View>
            )}

            {/* Top-up button */}
            <TouchableOpacity
              onPress={handleTopUp}
              disabled={topUpLoading || !topUpAmount}
              accessibilityLabel={topUpAmount ? `Add ${topUpAmount.toFixed(2)} dollars to wallet` : 'Select an amount to add'}
              accessibilityRole="button"
              style={{
                height: 52,
                borderRadius: radius.xl,
                backgroundColor: topUpAmount ? c.brand : c.border,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing['2xl'],
                opacity: topUpLoading ? 0.6 : 1,
              }}
            >
              {topUpLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#FFF' }}>
                  {topUpAmount
                    ? selectedMethodId
                      ? `Pay $${topUpAmount.toFixed(2)} with saved card`
                      : `Add $${topUpAmount.toFixed(2)} to Wallet`
                    : 'Select an amount'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Transactions */}
            <Text style={{ fontSize: fontSize.lg, fontWeight: '600', color: c.textPrimary, marginBottom: spacing.md }}>
              Recent Transactions
            </Text>

            {transactions.length === 0 ? (
              <Card>
                <View style={{ alignItems: 'center', padding: spacing.xl }}>
                  <Ionicons name="wallet-outline" size={40} color={c.textTertiary} />
                  <Text style={{ color: c.textSecondary, marginTop: spacing.sm }}>No transactions yet</Text>
                </View>
              </Card>
            ) : (
              transactions.map((tx) => {
                const icon = txIcon(tx.type);
                const isPositive = tx.amount > 0;
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
