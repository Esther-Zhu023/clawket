import { getCalendars, getLocales } from 'expo-localization';

const MAINLAND_CHINA_TIMEZONES = new Set(['asia/shanghai', 'asia/beijing']);

type LocaleLike = {
  languageTag?: string | null;
  languageCode?: string | null;
};

function normalize(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function isChineseLocale(locale: LocaleLike | null | undefined): boolean {
  const languageTag = normalize(locale?.languageTag);
  const languageCode = normalize(locale?.languageCode);
  return languageTag.startsWith('zh') || languageCode === 'zh';
}

export function isMainlandChinaTimeZone(timeZone: string | null | undefined): boolean {
  return MAINLAND_CHINA_TIMEZONES.has(normalize(timeZone));
}

export function shouldShowWecomSupportEntryFromContext(params: {
  timeZone?: string | null;
  locale?: LocaleLike | null;
}): boolean {
  const normalizedTimeZone = normalize(params.timeZone);
  if (normalizedTimeZone) {
    return isMainlandChinaTimeZone(normalizedTimeZone);
  }
  return isChineseLocale(params.locale);
}

export function shouldShowWecomSupportEntry(): boolean {
  let timeZone: string | null = null;
  try {
    const calendar = getCalendars()?.[0];
    timeZone = calendar?.timeZone ?? null;
  } catch {
    timeZone = null;
  }

  if (normalize(timeZone)) {
    return isMainlandChinaTimeZone(timeZone);
  }

  try {
    const locale = getLocales()?.[0];
    return isChineseLocale(locale);
  } catch {
    return false;
  }
}
