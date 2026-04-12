import { View, TextInput, Text, TextInputProps, ViewStyle } from 'react-native';
import { useThemeColors, radius, fontSize, spacing } from '@/lib/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, style, containerStyle, ...props }: InputProps) {
  const c = useThemeColors();

  return (
    <View style={[{ marginBottom: spacing.lg }, containerStyle]}>
      {label && (
        <Text style={{ color: c.textSecondary, fontSize: fontSize.sm, fontWeight: '500', marginBottom: spacing.xs }}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          {
            height: 48,
            backgroundColor: c.surfaceSecondary,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.lg,
            fontSize: fontSize.base,
            color: c.textPrimary,
            borderWidth: error ? 1.5 : 0,
            borderColor: error ? c.error : 'transparent',
          },
          style,
        ]}
        placeholderTextColor={c.textTertiary}
        {...props}
      />
      {error && (
        <Text style={{ color: c.error, fontSize: fontSize.xs, marginTop: spacing.xs }}>{error}</Text>
      )}
    </View>
  );
}
