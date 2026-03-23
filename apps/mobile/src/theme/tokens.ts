// ─── Spacing (4px grid) ───
export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// ─── Typography ───
export const FontSize = {
  xs: 11,
  sm: 12,
  md: 13,
  base: 15,
  lg: 16,
  xl: 18,
  xxl: 22,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// ─── Border Radius ───
export const Radius = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 9999,
} as const;

// ─── Icon Sizes ───
export const IconSize = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

// ─── Touch Targets ───
export const HitSize = {
  sm: 36,
  md: 44,
} as const;

// ─── Elevation (shadows) ───
export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

// ─── Animation Presets ───
export const SpringPreset = {
  /** Snappy UI feedback — buttons, toggles, small movements */
  snappy: { damping: 20, stiffness: 300, mass: 0.8 },
  /** Standard sheet/modal entrance */
  sheet: { damping: 22, stiffness: 220, mass: 0.9 },
  /** Gentle float — tooltips, fade-ins */
  gentle: { damping: 18, stiffness: 160, mass: 1.0 },
} as const;

export const TimingPreset = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;
