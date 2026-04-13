import { View, ViewStyle } from 'react-native';
import { useThemeColors, radius, spacing } from '@/lib/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  elevated?: boolean;
}

export function Card({ children, style, padding = spacing.lg, elevated = true }: CardProps) {
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
          ...(elevated
            ? {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }
            : {}),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
