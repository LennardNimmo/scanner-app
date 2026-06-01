export const colors = {
  navy: '#0B1020',
  navy2: '#111A33',
  mint: '#2EE6B8',
  mintDark: '#18B993',
  mintSoft: '#E9FCF7',
  coral: '#FF6B57',
  coralSoft: '#FFF0ED',
  cloud: '#F7F9FC',
  card: '#FFFFFF',
  text: '#0B1020',
  muted: '#5F6C85',
  subtle: '#8A96AA',
  border: '#DCE3EE',
  white: '#FFFFFF',
  success: '#1FC16B',
  successSoft: '#E8F9F0',
  warning: '#FFB547',
  warningSoft: '#FFF6E6',
  danger: '#E5484D',
  dangerSoft: '#FDEBEC',
  background: '#F7F9FC',
  accent: '#2EE6B8',
  accentSoft: '#E9FCF7'
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999
};

export const shadow = {
  card: {
    shadowColor: colors.navy,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 3
  },
  soft: {
    shadowColor: colors.navy,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 2
  }
};

export const typography = {
  brand: {
    fontSize: 34,
    fontWeight: '900' as const,
    letterSpacing: -1.2
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: '900' as const,
    letterSpacing: -0.8,
    color: colors.text
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: colors.text
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    color: colors.muted
  },
  label: {
    fontSize: 12,
    fontWeight: '900' as const,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
    color: colors.subtle
  }
};
