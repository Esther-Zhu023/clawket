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
      accent50: '#111A20',
      accent100: '#17222A',
      accent200: '#243540',
      accent500: '#86AABD',
      accent700: '#A9C4D2',
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
      accent50: '#131C17',
      accent100: '#1A261F',
      accent200: '#273A30',
      accent500: '#78AF8F',
      accent700: '#9AC4AE',
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
      accent50: '#121B1B',
      accent100: '#182424',
      accent200: '#253939',
      accent500: '#79B1AB',
      accent700: '#9CC7C1',
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
      accent50: '#211710',
      accent100: '#2B1F17',
      accent200: '#433125',
      accent500: '#D59A6E',
      accent700: '#E4B48E',
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
      accent50: '#1D1519',
      accent100: '#281C22',
      accent200: '#3F2C34',
      accent500: '#CB88A0',
      accent700: '#DBA8B9',
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
      accent50: '#18141D',
      accent100: '#211B28',
      accent200: '#342A3F',
      accent500: '#A591C5',
      accent700: '#C1B3D8',
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
