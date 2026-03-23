import { Platform } from 'react-native';

describe('platform utils', () => {
  const mutablePlatform = Platform as typeof Platform & { isMacCatalyst?: boolean };
  const originalOS = mutablePlatform.OS;
  const originalIsMacCatalyst = mutablePlatform.isMacCatalyst;

  afterEach(() => {
    mutablePlatform.OS = originalOS;
    mutablePlatform.isMacCatalyst = originalIsMacCatalyst;
    jest.resetModules();
  });

  it('detects Mac Catalyst as macOS runtime', async () => {
    mutablePlatform.OS = 'ios';
    mutablePlatform.isMacCatalyst = true;

    const platformUtils = await import('./platform');

    expect(platformUtils.isMacCatalyst).toBe(true);
    expect(platformUtils.getRuntimePlatform()).toBe('macos');
    expect(platformUtils.getRuntimeSystemName()).toBe('macOS');
    expect(platformUtils.getRuntimeDeviceFamily()).toBe('mac');
    expect(platformUtils.getRuntimeClientId()).toBe('openclaw-macos');
  });

  it('keeps standard iOS runtime unchanged', async () => {
    mutablePlatform.OS = 'ios';
    mutablePlatform.isMacCatalyst = false;

    const platformUtils = await import('./platform');

    expect(platformUtils.isMacCatalyst).toBe(false);
    expect(platformUtils.getRuntimePlatform()).toBe('ios');
    expect(platformUtils.getRuntimeSystemName()).toBe('iOS');
    expect(platformUtils.getRuntimeDeviceFamily()).toBe('iphone');
    expect(platformUtils.getRuntimeClientId()).toBe('openclaw-ios');
  });
});
