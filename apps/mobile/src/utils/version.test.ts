import { compareVersions, isNewerVersion } from './version';

describe('version utils', () => {
  it('compares plain semantic versions', () => {
    expect(compareVersions('1.3.0', '1.2.9')).toBe(1);
    expect(compareVersions('1.2.0', '1.2.0')).toBe(0);
    expect(compareVersions('1.2.0', '1.2.1')).toBe(-1);
  });

  it('treats leading v and missing parts correctly', () => {
    expect(compareVersions('v1.2.0', '1.2')).toBe(0);
    expect(compareVersions('1.2.1', '1.2')).toBe(1);
    expect(compareVersions('1.2', '1.2.1')).toBe(-1);
  });

  it('ignores prerelease/build suffix for ordering', () => {
    expect(compareVersions('1.2.3-beta.1', '1.2.3')).toBe(0);
    expect(compareVersions('1.2.4+build.8', '1.2.3')).toBe(1);
  });

  it('returns false for invalid version inputs', () => {
    expect(isNewerVersion('latest', '1.2.3')).toBe(false);
    expect(isNewerVersion('1.2.3', 'current')).toBe(false);
  });
});

