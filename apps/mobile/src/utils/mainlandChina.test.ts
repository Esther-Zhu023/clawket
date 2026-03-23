import {
  isMainlandChinaTimeZone,
  shouldShowWecomSupportEntryFromContext,
} from './mainlandChina';

describe('isMainlandChinaTimeZone', () => {
  it('returns true for Shanghai and Beijing time zones', () => {
    expect(isMainlandChinaTimeZone('Asia/Shanghai')).toBe(true);
    expect(isMainlandChinaTimeZone('asia/beijing')).toBe(true);
  });

  it('returns false for non-mainland time zones', () => {
    expect(isMainlandChinaTimeZone('America/Los_Angeles')).toBe(false);
  });
});

describe('shouldShowWecomSupportEntryFromContext', () => {
  it('uses time zone when available', () => {
    expect(shouldShowWecomSupportEntryFromContext({
      timeZone: 'Asia/Shanghai',
      locale: { languageTag: 'en-US', languageCode: 'en' },
    })).toBe(true);

    expect(shouldShowWecomSupportEntryFromContext({
      timeZone: 'America/New_York',
      locale: { languageTag: 'zh-CN', languageCode: 'zh' },
    })).toBe(false);
  });

  it('falls back to locale when time zone is missing', () => {
    expect(shouldShowWecomSupportEntryFromContext({
      timeZone: '',
      locale: { languageTag: 'zh-CN', languageCode: 'zh' },
    })).toBe(true);

    expect(shouldShowWecomSupportEntryFromContext({
      timeZone: null,
      locale: { languageTag: 'en-US', languageCode: 'en' },
    })).toBe(false);
  });
});
