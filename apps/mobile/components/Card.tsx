import { View, ViewStyle } from 'react-native';
import { useThemeColors, radius, spacing } from '@/lib/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export function Card({ children, style, padding = spacing.lg }: CardProps) {
  const c = useThemeColors();

  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: c.border,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
