// ─── Color Tokens ──────────────────────────────────────────
export const colors = {
  light: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceSecondary: '#F4F4F5',
    border: '#E4E4E7',
    borderHover: '#D4D4D8',
    textPrimary: '#09090B',
    textSecondary: '#71717A',
    textTertiary: '#A1A1AA',
    brand: '#2563EB',
    brandHover: '#1D4ED8',
    brandLight: '#EFF6FF',
    brandMuted: '#BFDBFE',
    success: '#16A34A',
    successLight: '#F0FDF4',
    warning: '#EA580C',
    warningLight: '#FFF7ED',
    error: '#DC2626',
    errorLight: '#FEF2F2',
  },
  dark: {
    background: '#09090B',
    surface: '#18181B',
    surfaceSecondary: '#27272A',
    border: '#3F3F46',
    borderHover: '#52525B',
    textPrimary: '#FAFAFA',
    textSecondary: '#A1A1AA',
    textTertiary: '#71717A',
    brand: '#3B82F6',
    brandHover: '#60A5FA',
    brandLight: '#172554',
    brandMuted: '#1E3A5F',
    success: '#22C55E',
    successLight: '#052E16',
    warning: '#F97316',
    warningLight: '#431407',
    error: '#EF4444',
    errorLight: '#450A0A',
  },
} as const;

// ─── Gradient Tokens ───────────────────────────────────────
export const gradients = {
  brand: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
  success: 'linear-gradient(135deg, #16A34A 0%, #0EA5E9 100%)',
  premium: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
  surface: 'linear-gradient(145deg, #FFFFFF 0%, #F4F4F5 100%)',
} as const;

// ─── Typography ────────────────────────────────────────────
export const typography = {
  fontSans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
  scale: {
    display: { size: '36px', weight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' },
    h1: { size: '30px', weight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
    h2: { size: '24px', weight: 600, lineHeight: 1.3, letterSpacing: '-0.01em' },
    h3: { size: '20px', weight: 600, lineHeight: 1.4, letterSpacing: '-0.01em' },
    h4: { size: '16px', weight: 600, lineHeight: 1.5, letterSpacing: '0' },
    body: { size: '15px', weight: 400, lineHeight: 1.6, letterSpacing: '0' },
    bodySm: { size: '14px', weight: 400, lineHeight: 1.5, letterSpacing: '0' },
    caption: { size: '13px', weight: 500, lineHeight: 1.4, letterSpacing: '0.01em' },
    tiny: { size: '11px', weight: 500, lineHeight: 1.3, letterSpacing: '0.02em' },
  },
} as const;

// ─── Spacing ───────────────────────────────────────────────
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  base: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
  '4xl': '96px',
} as const;

// ─── Border Radius ─────────────────────────────────────────
export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  full: '9999px',
} as const;

// ─── Shadows ───────────────────────────────────────────────
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
  lg: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
  brand: '0 4px 14px 0 rgba(37, 99, 235, 0.25)',
  inset: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
} as const;

// ─── Container Widths ──────────────────────────────────────
export const containers = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  max: '1440px',
} as const;

// ─── Breakpoints ───────────────────────────────────────────
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ─── Animation Durations ───────────────────────────────────
export const animation = {
  fast: '100ms',
  normal: '150ms',
  slow: '200ms',
  entrance: '200ms',
  exit: '150ms',
  spring: '300ms',
  tracking: '1000ms',
} as const;

// ─── Z-Index Scale ─────────────────────────────────────────
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  toast: 70,
  tooltip: 80,
} as const;

// ─── Tailwind Theme Extension (for tailwind.config) ────────
export const tailwindThemeExtension = {
  colors: {
    background: 'var(--background)',
    surface: 'var(--surface)',
    'surface-secondary': 'var(--surface-secondary)',
    border: 'var(--border)',
    'border-hover': 'var(--border-hover)',
    'text-primary': 'var(--text-primary)',
    'text-secondary': 'var(--text-secondary)',
    'text-tertiary': 'var(--text-tertiary)',
    brand: {
      DEFAULT: 'var(--brand)',
      hover: 'var(--brand-hover)',
      light: 'var(--brand-light)',
      muted: 'var(--brand-muted)',
    },
    success: {
      DEFAULT: 'var(--success)',
      light: 'var(--success-light)',
    },
    warning: {
      DEFAULT: 'var(--warning)',
      light: 'var(--warning-light)',
    },
    error: {
      DEFAULT: 'var(--error)',
      light: 'var(--error-light)',
    },
  },
  borderRadius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
  },
  fontFamily: {
    sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
  },
  boxShadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
    lg: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
    brand: '0 4px 14px 0 rgba(37, 99, 235, 0.25)',
  },
} as const;
