import { View, Text } from 'react-native';
import { useThemeColors, radius, fontSize, spacing } from '@/lib/theme';
import { ORDER_STATUS_LABELS } from '@loadnbehold/constants';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const c = useThemeColors();

  const variantMap: Record<string, { bg: string; text: string }> = {
    placed: { bg: c.brandLight, text: c.brand },
    confirmed: { bg: c.brandLight, text: c.brand },
    driver_assigned: { bg: c.brandLight, text: c.brand },
    pickup_enroute: { bg: c.warningLight, text: c.warning },
    picked_up: { bg: c.warningLight, text: c.warning },
    at_laundry: { bg: c.surfaceSecondary, text: c.textSecondary },
    processing: { bg: c.surfaceSecondary, text: c.textSecondary },
    quality_check: { bg: c.surfaceSecondary, text: c.textSecondary },
    ready_for_delivery: { bg: c.brandLight, text: c.brand },
    out_for_delivery: { bg: c.warningLight, text: c.warning },
    delivered: { bg: c.successLight, text: c.success },
    cancelled: { bg: c.errorLight, text: c.error },
  };

  const v = variantMap[status] || { bg: c.surfaceSecondary, text: c.textSecondary };
  const label = (ORDER_STATUS_LABELS as Record<string, string>)[status] || status.replace(/_/g, ' ');

  return (
    <View
      style={{
        backgroundColor: v.bg,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radius.full,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: v.text, fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' }}>
        {label}
      </Text>
    </View>
  );
}
