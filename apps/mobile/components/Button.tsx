import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import * as Haptics from '@/lib/haptics';
import { useThemeColors, radius, fontSize, spacing } from '@/lib/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  haptic = true,
}: ButtonProps) {
  const c = useThemeColors();

  const handlePress = () => {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const heights = { sm: 36, md: 44, lg: 52 };
  const fontSizes = { sm: fontSize.sm, md: fontSize.base, lg: fontSize.lg };

  const bgColors: Record<string, string> = {
    primary: c.brand,
    secondary: c.surfaceSecondary,
    outline: 'transparent',
    ghost: 'transparent',
    danger: c.error,
  };

  const textColors: Record<string, string> = {
    primary: '#FFFFFF',
    secondary: c.textPrimary,
    outline: c.brand,
    ghost: c.brand,
    danger: '#FFFFFF',
  };

  const containerStyle: ViewStyle = {
    height: heights[size],
    backgroundColor: disabled ? c.surfaceSecondary : bgColors[variant],
    borderRadius: radius.lg,
    paddingHorizontal: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...(fullWidth ? { width: '100%' } : {}),
    ...(variant === 'outline' ? { borderWidth: 1.5, borderColor: disabled ? c.border : c.brand } : {}),
  };

  const textStyle: TextStyle = {
    color: disabled ? c.textTertiary : textColors[variant],
    fontSize: fontSizes[size],
    fontWeight: '600',
  };

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColors[variant]} />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
