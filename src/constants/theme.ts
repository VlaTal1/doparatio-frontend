export const Colors = {
  dark: {
    background: '#131A17',
    card: '#1C2622',
    cardElevated: '#243029',
    text: '#EAF0ED',
    textSecondary: '#7A8A82',
    accent: '#E5A93C',
    accentDim: 'rgba(229, 169, 60, 0.15)',
    accentGlow: 'rgba(229, 169, 60, 0.25)',
    border: '#2A3632',
    success: '#4ADE80',
    error: '#F87171',
    warning: '#FBBF24',
    routine: '#34D399',
    medium: '#F59E0B',
    hard: '#EF4444',
    tabBar: '#0F1512',
    tabBarBorder: '#1C2622',
  },
  light: {
    background: '#F4F4F0',
    card: '#FFFFFF',
    cardElevated: '#F8F8F6',
    text: '#1C2622',
    textSecondary: '#8A9690',
    accent: '#D49018',
    accentDim: 'rgba(212, 144, 24, 0.12)',
    accentGlow: 'rgba(212, 144, 24, 0.20)',
    border: '#E2E5E3',
    success: '#22C55E',
    error: '#DC2626',
    warning: '#D97706',
    routine: '#10B981',
    medium: '#D97706',
    hard: '#DC2626',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E2E5E3',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  xxxl: 36,
  hero: 48,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  }),
};
