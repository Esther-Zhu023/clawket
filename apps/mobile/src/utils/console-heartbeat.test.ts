import { formatConsoleHeartbeatAge } from './console-heartbeat';

describe('formatConsoleHeartbeatAge', () => {
  it('keeps existing localized keys for locales that do not need compact formatting', () => {
    expect(formatConsoleHeartbeatAge(28, 'en')).toEqual({
      key: '{{count}}m ago',
      count: 28,
    });
    expect(formatConsoleHeartbeatAge(135, 'zh-Hans')).toEqual({
      key: '{{count}}h ago',
      count: 2,
    });
  });

  it('returns compact text for Spanish locales', () => {
    expect(formatConsoleHeartbeatAge(28, 'es')).toEqual({
      key: '{{count}}m ago',
      count: 28,
      compactText: '28 m',
    });
    expect(formatConsoleHeartbeatAge(135, 'es-ES')).toEqual({
      key: '{{count}}h ago',
      count: 2,
      compactText: '2 h',
    });
  });

  it('returns compact text for German locales', () => {
    expect(formatConsoleHeartbeatAge(28, 'de')).toEqual({
      key: '{{count}}m ago',
      count: 28,
      compactText: '28 m',
    });
    expect(formatConsoleHeartbeatAge(1440, 'de-DE')).toEqual({
      key: '{{count}}d ago',
      count: 1,
      compactText: '1 d',
    });
  });

  it('preserves just-now behavior across locales', () => {
    expect(formatConsoleHeartbeatAge(0, 'es')).toEqual({ key: 'just now' });
    expect(formatConsoleHeartbeatAge(0, 'de')).toEqual({ key: 'just now' });
    expect(formatConsoleHeartbeatAge(0, 'en')).toEqual({ key: 'just now' });
  });
});
