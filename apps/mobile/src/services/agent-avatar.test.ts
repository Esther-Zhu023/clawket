jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}));

import { buildAvatarKey } from './agent-avatar';

describe('buildAvatarKey', () => {
  it('returns agentId:agentName when name is provided', () => {
    expect(buildAvatarKey('main', 'Claude')).toBe('main:Claude');
  });

  it('returns just agentId when name is undefined', () => {
    expect(buildAvatarKey('main')).toBe('main');
    expect(buildAvatarKey('main', undefined)).toBe('main');
  });

  it('returns just agentId when name is empty string', () => {
    expect(buildAvatarKey('main', '')).toBe('main');
  });

  it('handles agents with same id but different names', () => {
    const key1 = buildAvatarKey('main', 'Claude');
    const key2 = buildAvatarKey('main', 'Assistant');
    expect(key1).not.toBe(key2);
  });

  it('handles names with special characters', () => {
    expect(buildAvatarKey('agent-1', 'My Agent')).toBe('agent-1:My Agent');
  });
});
