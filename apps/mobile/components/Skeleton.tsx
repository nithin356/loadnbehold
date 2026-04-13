import { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle } from 'react-native';
import { useThemeColors, radius, spacing } from '@/lib/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Animated skeleton placeholder with shimmer effect.
 * Use in place of content while data is loading.
 */
export function Skeleton({ width = '100%', height = 16, borderRadius = radius.md, style }: SkeletonProps) {
  const c = useThemeColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: c.surfaceSecondary,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Pre-built skeleton layout for a card with title + subtitle */
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const c = useThemeColors();
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: c.border,
          padding: spacing.lg,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Skeleton width={44} height={44} borderRadius={radius.lg} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={10} style={{ marginTop: spacing.sm }} />
        </View>
      </View>
    </View>
  );
}

/** Skeleton for a list item row */
export function SkeletonRow({ style }: { style?: ViewStyle }) {
  const c = useThemeColors();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          backgroundColor: c.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: c.border,
        },
        style,
      ]}
    >
      <Skeleton width={40} height={40} borderRadius={radius.full} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Skeleton width="70%" height={13} />
        <Skeleton width="45%" height={10} style={{ marginTop: spacing.xs }} />
      </View>
      <Skeleton width={50} height={16} borderRadius={radius.md} />
    </View>
  );
}

/** Skeleton for the home screen layout */
export function HomeSkeleton() {
  const c = useThemeColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.background, padding: spacing.xl }}>
      {/* Banner */}
      <Skeleton width="100%" height={140} borderRadius={radius.xl} />

      {/* Trust badges */}
      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Skeleton width={36} height={36} borderRadius={radius.full} />
            <Skeleton width={30} height={10} style={{ marginTop: spacing.xs }} />
          </View>
        ))}
      </View>

      {/* Services label */}
      <Skeleton width={120} height={18} style={{ marginTop: spacing['2xl'] }} />

      {/* Services grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={{ width: '30%', alignItems: 'center', padding: spacing.md }}>
            <Skeleton width={44} height={44} borderRadius={radius.lg} />
            <Skeleton width={50} height={10} style={{ marginTop: spacing.sm }} />
          </View>
        ))}
      </View>
    </View>
  );
}

/** Skeleton for the wallet screen */
export function WalletSkeleton() {
  const c = useThemeColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.background, padding: spacing.xl }}>
      {/* Title */}
      <Skeleton width={80} height={24} style={{ marginBottom: spacing.xl }} />

      {/* Balance card */}
      <Skeleton width="100%" height={140} borderRadius={radius.xl} />

      {/* Top up section */}
      <Skeleton width={100} height={16} style={{ marginTop: spacing.xl }} />
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={70} height={44} borderRadius={radius.lg} style={{ flex: 1 }} />
        ))}
      </View>

      {/* Button */}
      <Skeleton width="100%" height={52} borderRadius={radius.xl} style={{ marginTop: spacing.lg }} />

      {/* Transactions */}
      <Skeleton width={160} height={16} style={{ marginTop: spacing['2xl'] }} />
      {[1, 2, 3].map((i) => (
        <SkeletonRow key={i} style={{ marginTop: spacing.sm }} />
      ))}
    </View>
  );
}

/** Skeleton for order tracking screen */
export function TrackingSkeleton() {
  const c = useThemeColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* Map placeholder */}
      <Skeleton width="100%" height={280} borderRadius={0} />

      <View style={{ padding: spacing.xl }}>
        {/* Order header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl }}>
          <View>
            <Skeleton width={140} height={18} />
            <Skeleton width={100} height={12} style={{ marginTop: spacing.xs }} />
          </View>
          <Skeleton width={80} height={24} borderRadius={radius.full} />
        </View>

        {/* Driver card */}
        <SkeletonCard style={{ marginBottom: spacing.lg }} />

        {/* Timeline */}
        <Skeleton width={120} height={18} style={{ marginBottom: spacing.lg }} />
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={{ flexDirection: 'row', marginBottom: spacing.lg }}>
            <Skeleton width={20} height={20} borderRadius={radius.full} />
            <View style={{ marginLeft: spacing.sm }}>
              <Skeleton width={120} height={13} />
              <Skeleton width={60} height={10} style={{ marginTop: spacing.xs }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
