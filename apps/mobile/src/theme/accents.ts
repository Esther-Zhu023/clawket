import { AccentColorId } from '../types';

export type AccentScheme = 'light' | 'dark';

export type AccentToneScale = {
  accent50: string;
  accent100: string;
  accent200: string;
  accent500: string;
  accent700: string;
};

export type AccentScale = {
  light: AccentToneScale;
  dark: AccentToneScale;
};

export type BuiltInAccentColorId = Exclude<AccentColorId, 'custom'>;

export const builtInAccents: Record<BuiltInAccentColorId, AccentScale> = {
  iceBlue: {
    light: {
      accent50: '#F0F7FB',
      accent100: '#E1EFF7',
      accent200: '#B0D8E8',
      accent500: '#5BA4C9',
      accent700: '#3A7FA8',
    },
    dark: {
      accent50: '#1A2D3D',
      accent100: '#1E3448',
      accent200: '#2A4A5F',
      accent500: '#6BB4D9',
      accent700: '#8EC8E8',
    },
  },
  jadeGreen: {
    light: {
      accent50: '#F0FAF4',
      accent100: '#DCEEE4',
      accent200: '#A3D9B8',
      accent500: '#4CAF7D',
      accent700: '#2E8B5E',
    },
    dark: {
      accent50: '#1A2E24',
      accent100: '#1E3A2C',
      accent200: '#2A5040',
      accent500: '#5CBF8D',
      accent700: '#7DD4A8',
    },
  },
  oceanTeal: {
    light: {
      accent50: '#F0F9F9',
      accent100: '#DDF0F0',
      accent200: '#A8D8D8',
      accent500: '#4DA8A8',
      accent700: '#2E8585',
    },
    dark: {
      accent50: '#1A2D2D',
      accent100: '#1E3838',
      accent200: '#2A4F4F',
      accent500: '#5CC0C0',
      accent700: '#80D4D4',
    },
  },
  sunsetOrange: {
    light: {
      accent50: '#FFF5F0',
      accent100: '#FFE8DB',
      accent200: '#FFCAA8',
      accent500: '#E8853A',
      accent700: '#C06A24',
    },
    dark: {
      accent50: '#2E2118',
      accent100: '#3A2A1E',
      accent200: '#5A3F2A',
      accent500: '#F0994A',
      accent700: '#FFB878',
    },
  },
  rosePink: {
    light: {
      accent50: '#FDF2F5',
      accent100: '#FAE0E8',
      accent200: '#F2B0C4',
      accent500: '#D45D82',
      accent700: '#B33D62',
    },
    dark: {
      accent50: '#2E1A22',
      accent100: '#3A1E2C',
      accent200: '#5A2E44',
      accent500: '#E46D92',
      accent700: '#F098B4',
    },
  },
  royalPurple: {
    light: {
      accent50: '#F5F0FA',
      accent100: '#E8DDF5',
      accent200: '#C6ADE6',
      accent500: '#8B5CC8',
      accent700: '#6B3FA8',
    },
    dark: {
      accent50: '#221A2E',
      accent100: '#2C1E3A',
      accent200: '#44305A',
      accent500: '#A07CD8',
      accent700: '#BEA0E8',
    },
  },
};

export const defaultAccentId: BuiltInAccentColorId = 'iceBlue';

export function isBuiltInAccentId(value: string): value is BuiltInAccentColorId {
  return value === 'iceBlue' || value === 'jadeGreen' || value === 'oceanTeal' || value === 'sunsetOrange' || value === 'rosePink' || value === 'royalPurple';
}

export function resolveAccentScale(
  accentId: AccentColorId,
  customAccent?: AccentScale | null,
): AccentScale {
  if (accentId === 'custom' && customAccent) return customAccent;
  if (isBuiltInAccentId(accentId)) return builtInAccents[accentId];
  return builtInAccents[defaultAccentId];
}

function isAccentToneScale(value: unknown): value is AccentToneScale {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['accent50'] === 'string' &&
    typeof v['accent100'] === 'string' &&
    typeof v['accent200'] === 'string' &&
    typeof v['accent500'] === 'string' &&
    typeof v['accent700'] === 'string'
  );
}

export function isAccentScale(value: unknown): value is AccentScale {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return isAccentToneScale(v['light']) && isAccentToneScale(v['dark']);
}
