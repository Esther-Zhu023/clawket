import { sessionKeysMatch } from './session-key';

describe('sessionKeysMatch', () => {
  it('returns true for identical keys', () => {
    expect(sessionKeysMatch('main', 'main')).toBe(true);
    expect(sessionKeysMatch('agent:abc:main', 'agent:abc:main')).toBe(true);
    expect(sessionKeysMatch('chat_123', 'chat_123')).toBe(true);
  });

  it('returns true for "main" vs "agent:<id>:main" alias', () => {
    expect(sessionKeysMatch('main', 'agent:abc:main')).toBe(true);
    expect(sessionKeysMatch('agent:abc:main', 'main')).toBe(true);
    expect(sessionKeysMatch('main', 'agent:my-agent-123:main')).toBe(true);
  });

  it('returns false for different sessions', () => {
    expect(sessionKeysMatch('main', 'chat_123')).toBe(false);
    expect(sessionKeysMatch('agent:abc:main', 'agent:abc:chat_123')).toBe(false);
    expect(sessionKeysMatch('agent:abc:main', 'agent:xyz:main')).toBe(false);
  });

  it('handles null and undefined', () => {
    expect(sessionKeysMatch(null, null)).toBe(true);
    expect(sessionKeysMatch(undefined, undefined)).toBe(true);
    expect(sessionKeysMatch(null, 'main')).toBe(false);
    expect(sessionKeysMatch('main', null)).toBe(false);
    expect(sessionKeysMatch(undefined, 'main')).toBe(false);
  });

  it('returns false for different agents even with same tail', () => {
    expect(sessionKeysMatch('agent:abc:chat_123', 'agent:xyz:chat_123')).toBe(false);
    expect(sessionKeysMatch('agent:abc:main', 'agent:xyz:main')).toBe(false);
  });

  it('does not match non-agent prefixed keys with colons', () => {
    // Keys that aren't agent-prefixed keep full identity
    expect(sessionKeysMatch('foo:main', 'main')).toBe(false);
  });
});
