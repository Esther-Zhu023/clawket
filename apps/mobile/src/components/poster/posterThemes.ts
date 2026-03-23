// Shared poster color themes derived from the app's accent color system.

import { builtInAccents, BuiltInAccentColorId } from '../../theme/accents';

export type PosterTheme = {
  id: BuiltInAccentColorId;
  /** Primary accent for border, avatar ring, share button */
  accent: string;
  /** Very light tint for content card background */
  accentSoft: string;
  /** Medium tint for model badge background */
  accentMuted: string;
  /** Dot color shown in the theme picker */
  swatch: string;
};

/**
 * Build a poster theme from a built-in accent.
 * Uses light-mode tones for a clean, white-background poster:
 *   accent     = accent700 (strong, used for border & highlights)
 *   accentSoft = accent50  (very subtle background tint)
 *   accentMuted= accent200 (medium, model badge bg)
 */
function buildPosterTheme(id: BuiltInAccentColorId): PosterTheme {
  const light = builtInAccents[id].light;
  return {
    id,
    accent: light.accent700,
    accentSoft: light.accent50,
    accentMuted: light.accent200,
    swatch: light.accent500,
  };
}

const ACCENT_IDS: BuiltInAccentColorId[] = [
  'iceBlue',
  'jadeGreen',
  'oceanTeal',
  'sunsetOrange',
  'rosePink',
  'royalPurple',
];

export const POSTER_THEMES: PosterTheme[] = ACCENT_IDS.map(buildPosterTheme);

const themeById = new Map(POSTER_THEMES.map((t) => [t.id, t]));

/** Resolve the poster theme matching an accent ID, falling back to iceBlue. */
export function getPosterThemeForAccent(accentId: string): PosterTheme {
  return themeById.get(accentId as BuiltInAccentColorId) ?? POSTER_THEMES[0]!;
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}
