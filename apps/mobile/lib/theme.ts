import { useColorScheme } from 'react-native';

export const colors = {
  light: {
    brand: '#2563EB',
    brandLight: '#EFF6FF',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceSecondary: '#F1F5F9',
    border: '#E2E8F0',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    success: '#16A34A',
    successLight: '#F0FDF4',
    warning: '#F59E0B',
    warningLight: '#FFFBEB',
    error: '#DC2626',
    errorLight: '#FEF2F2',
  },
  dark: {
    brand: '#3B82F6',
    brandLight: '#1E293B',
    background: '#0F172A',
    surface: '#1E293B',
    surfaceSecondary: '#334155',
    border: '#334155',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    success: '#22C55E',
    successLight: '#14532D',
    warning: '#FBBF24',
    warningLight: '#78350F',
    error: '#EF4444',
    errorLight: '#7F1D1D',
  },
};

export type ThemeColors = typeof colors.light;

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? colors.dark : colors.light;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
};
