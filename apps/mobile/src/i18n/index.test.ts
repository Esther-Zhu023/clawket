jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

import i18n from './index';

describe('i18n namespace lookups', () => {
  const originalLanguage = i18n.language;

  afterEach(async () => {
    await i18n.changeLanguage(originalLanguage);
  });

  it('resolves common namespace keys with explicit ns options', async () => {
    await i18n.changeLanguage('zh-Hans');

    expect(i18n.t('Switching Gateway...', { ns: 'common' })).toBe('正在切换网关…');
  });
});
