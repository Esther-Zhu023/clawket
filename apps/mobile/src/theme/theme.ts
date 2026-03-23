import { ThemeMode } from '../types';
import { AccentScale, AccentToneScale } from './accents';

export type ThemeScheme = 'light' | 'dark';

export type AppTheme = {
  scheme: ThemeScheme;
  mode: ThemeMode;
  colors: {
    background: string;
    surface: string;
    surfaceMuted: string;
    surfaceElevated: string;
    border: string;
    borderStrong: string;
    text: string;
    textMuted: string;
    textSubtle: string;
    accent50: string;
    accent100: string;
    accent200: string;
    accent500: string;
    accent700: string;
    primary: string;
    primaryText: string;
    primarySoft: string;
    searchHighlightBg: string;
    success: string;
    warning: string;
    error: string;
    overlay: string;
    debugOverlay: string;
    debugText: string;
    bubbleUser: string;
    bubbleAssistant: string;
    bubbleSystem: string;
    bubbleSystemText: string;
    inputBackground: string;
    imageAddBorder: string;
    imageAddText: string;
    chatPreviewMask: string;
    sidebarBackdrop: string;
    iconOnColor: string;
    sessionBadgeSubagent: string;
    sessionBadgeCron: string;
    sessionBadgeTelegram: string;
    sessionBadgeDiscord: string;
    sessionBadgeSlack: string;
    usageCostOutput: string;
    usageCostInput: string;
    usageCostCacheWrite: string;
    usageCostCacheRead: string;
    badgeModel: string;
    badgeThinking: string;
    badgeTools: string;
    badgePrompts: string;
  };
};

type Palette = AppTheme['colors'];
type DerivedAccentKeys =
  | 'accent50'
  | 'accent100'
  | 'accent200'
  | 'accent500'
  | 'accent700'
  | 'primary'
  | 'primaryText'
  | 'primarySoft'
  | 'searchHighlightBg'
  | 'bubbleUser';
type FixedPalette = Omit<Palette, DerivedAccentKeys>;

const lightPalette: FixedPalette = {
  background: '#F0F2F5',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  surfaceElevated: '#FFFFFF',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  text: '#0F172A',
  textMuted: '#475569',
  textSubtle: '#94A3B8',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  overlay: 'rgba(0,0,0,0.45)',
  debugOverlay: 'rgba(0,0,0,0.85)',
  debugText: '#22C55E',
  bubbleAssistant: '#FFFFFF',
  bubbleSystem: '#FEF3C7',
  bubbleSystemText: '#92400E',
  inputBackground: '#FFFFFF',
  imageAddBorder: '#CBD5E1',
  imageAddText: '#94A3B8',
  chatPreviewMask: 'rgba(0,0,0,0.96)',
  sidebarBackdrop: 'rgba(0,0,0,0.35)',
  iconOnColor: '#FFFFFF',
  sessionBadgeSubagent: '#8B5CF6',
  sessionBadgeCron: '#F59E0B',
  sessionBadgeTelegram: '#2AABEE',
  sessionBadgeDiscord: '#5865F2',
  sessionBadgeSlack: '#4A154B',
  usageCostOutput: '#F87171',
  usageCostInput: '#60A5FA',
  usageCostCacheWrite: '#FBBF24',
  usageCostCacheRead: '#34D399',
  badgeModel: '#8B5CF6',
  badgeThinking: '#F59E0B',
  badgeTools: '#3B82F6',
  badgePrompts: '#22C55E',
};

const darkPalette: FixedPalette = {
  background: '#0B1220',
  surface: '#101A2F',
  surfaceMuted: '#15213A',
  surfaceElevated: '#1A2744',
  border: '#22304A',
  borderStrong: '#31435F',
  text: '#E2E8F0',
  textMuted: '#A8B4C7',
  textSubtle: '#7D8CA4',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  overlay: 'rgba(0,0,0,0.6)',
  debugOverlay: 'rgba(5,8,14,0.92)',
  debugText: '#4ADE80',
  bubbleAssistant: '#15213A',
  bubbleSystem: '#3C2F14',
  bubbleSystemText: '#FDE68A',
  inputBackground: '#1A2744',
  imageAddBorder: '#31435F',
  imageAddText: '#A8B4C7',
  chatPreviewMask: 'rgba(2,4,8,0.98)',
  sidebarBackdrop: 'rgba(0,0,0,0.5)',
  iconOnColor: '#FFFFFF',
  sessionBadgeSubagent: '#8B5CF6',
  sessionBadgeCron: '#F59E0B',
  sessionBadgeTelegram: '#2AABEE',
  sessionBadgeDiscord: '#5865F2',
  sessionBadgeSlack: '#4A154B',
  usageCostOutput: '#F87171',
  usageCostInput: '#60A5FA',
  usageCostCacheWrite: '#FBBF24',
  usageCostCacheRead: '#34D399',
  badgeModel: '#A78BFA',
  badgeThinking: '#FBBF24',
  badgeTools: '#60A5FA',
  badgePrompts: '#34D399',
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const raw =
    normalized.length === 3
      ? normalized
          .split('')
          .map((part) => `${part}${part}`)
          .join('')
      : normalized;
  const value = Number.parseInt(raw, 16);
  if (!Number.isFinite(value) || raw.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function applyAccentPalette(
  scheme: ThemeScheme,
  fixedPalette: FixedPalette,
  accent: AccentToneScale,
): Palette {
  return {
    ...fixedPalette,
    accent50: accent.accent50,
    accent100: accent.accent100,
    accent200: accent.accent200,
    accent500: accent.accent500,
    accent700: accent.accent700,
    primary: accent.accent500,
    primaryText: scheme === 'dark' ? accent.accent50 : '#FFFFFF',
    primarySoft: accent.accent50,
    searchHighlightBg: scheme === 'dark'
      ? withAlpha(accent.accent200, 0.36)
      : withAlpha(accent.accent500, 0.22),
    bubbleUser: scheme === 'dark' ? withAlpha(accent.accent700, 0.2) : accent.accent100,
  };
}

export function resolveThemeScheme(mode: ThemeMode, systemScheme: ThemeScheme): ThemeScheme {
  return mode === 'system' ? systemScheme : mode;
}

export function buildTheme(mode: ThemeMode, systemScheme: ThemeScheme, accent: AccentScale): AppTheme {
  const scheme = resolveThemeScheme(mode, systemScheme);
  const fixedPalette = scheme === 'dark' ? darkPalette : lightPalette;
  const accentPalette = scheme === 'dark' ? accent.dark : accent.light;
  const colors = applyAccentPalette(scheme, fixedPalette, accentPalette);
  return {
    scheme,
    mode,
    colors,
  };
}
