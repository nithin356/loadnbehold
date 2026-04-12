import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors, spacing, fontSize, radius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/Button';
import { ordersApi } from '@/lib/api';

interface OrderItem {
  _id: string;
  orderNumber: string;
  status: string;
  pricing: { total: number };
  createdAt: string;
  items: { service: string; quantity: number }[];
}

export default function OrdersScreen() {
  const c = useThemeColors();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingOrder, setRatingOrder] = useState<OrderItem | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const openRatingModal = (order: OrderItem) => {
    setRatingOrder(order);
    setRatingValue(5);
    setReviewText('');
  };

  const handleSubmitRating = async () => {
    if (!ratingOrder) return;
    setSubmittingRating(true);
    try {
      await ordersApi.rate(ratingOrder._id, ratingValue, reviewText.trim() || undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRatingOrder(null);
      loadOrders();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await ordersApi.list();
      setOrders(Array.isArray(data) ? data : data?.items || []);
    } catch {
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={c.brand} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={{ padding: spacing.xl, paddingBottom: spacing.md }}>
        <Text style={{ fontSize: fontSize['2xl'], fontWeight: '700', color: c.textPrimary }}>My Orders</Text>
      </View>

      {orders.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'] }}>
          <Ionicons name="receipt-outline" size={64} color={c.textTertiary} />
          <Text style={{ fontSize: fontSize.lg, fontWeight: '600', color: c.textPrimary, marginTop: spacing.lg }}>
            No orders yet
          </Text>
          <Text style={{ fontSize: fontSize.base, color: c.textSecondary, textAlign: 'center', marginTop: spacing.sm }}>
            Place your first laundry order and it will appear here.
          </Text>
          <View style={{ marginTop: spacing.xl }}>
            <Button title="Order Now" onPress={() => router.push('/(customer)/home')} />
          </View>
        </View>
      ) : (
        <FlatList
          data={orders}
          contentContainerStyle={{ padding: spacing.xl, paddingTop: 0, gap: spacing.md }}
          keyExtractor={(item) => item._id}
          onRefresh={loadOrders}
          refreshing={loading}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(customer)/track', params: { orderId: item._id } })}
              activeOpacity={0.7}
            >
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textPrimary }}>
                      {item.orderNumber}
                    </Text>
                    <Text style={{ fontSize: fontSize.xs, color: c.textSecondary, marginTop: 2 }}>
                      {new Date(item.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: spacing.md,
                    paddingTop: spacing.md,
                    borderTopWidth: 1,
                    borderTopColor: c.border,
                  }}
                >
                  <Text style={{ fontSize: fontSize.sm, color: c.textSecondary }}>
                    {item.items?.length || 0} item(s)
                  </Text>
                  <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: c.textPrimary }}>
                    ${item.pricing?.total?.toFixed(2) || '0.00'}
                  </Text>
                </View>

                {item.status === 'delivered' && (
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); openRatingModal(item); }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: radius.lg,
                      backgroundColor: c.warningLight,
                      gap: spacing.xs,
                    }}
                  >
                    <Ionicons name="star" size={16} color={c.warning} />
                    <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.warning }}>Rate Order</Text>
                  </TouchableOpacity>
                )}
              </Card>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Rating Modal */}
      <Modal visible={!!ratingOrder} transparent animationType="slide" onRequestClose={() => setRatingOrder(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl }}>
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: spacing.lg }} />
              <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>Rate Your Order</Text>
              {ratingOrder && (
                <Text style={{ fontSize: fontSize.sm, color: c.textSecondary, marginTop: spacing.xs }}>
                  {ratingOrder.orderNumber}
                </Text>
              )}
            </View>

            {/* Star Rating */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRatingValue(star)}>
                  <Ionicons
                    name={star <= ratingValue ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= ratingValue ? c.warning : c.border}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: c.textSecondary, marginBottom: spacing.xs }}>
              Review (optional)
            </Text>
            <TextInput
              value={reviewText}
              onChangeText={setReviewText}
              placeholder="How was your experience?"
              placeholderTextColor={c.textTertiary}
              multiline
              numberOfLines={3}
              style={{
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: radius.lg,
                padding: spacing.md,
                fontSize: fontSize.base,
                color: c.textPrimary,
                backgroundColor: c.surfaceSecondary,
                marginBottom: spacing.xl,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
            />

            <TouchableOpacity
              onPress={handleSubmitRating}
              disabled={submittingRating}
              style={{
                height: 52,
                borderRadius: radius.xl,
                backgroundColor: c.brand,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: submittingRating ? 0.6 : 1,
              }}
            >
              {submittingRating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#FFF' }}>Submit Rating</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setRatingOrder(null)} style={{ alignItems: 'center', marginTop: spacing.md }}>
              <Text style={{ fontSize: fontSize.sm, color: c.textTertiary }}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
