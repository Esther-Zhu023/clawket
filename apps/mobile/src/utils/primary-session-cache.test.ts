import {
  buildPrimarySessionPreview,
  isPrimaryCachedSessionKey,
  PRIMARY_CACHED_AGENT_ID,
  PRIMARY_CACHED_SESSION_KEY,
  sanitizePrimarySessionSnapshot,
} from './primary-session-cache';

describe('primarySessionCache', () => {
  it('recognizes only the main agent main session as cacheable', () => {
    expect(isPrimaryCachedSessionKey(PRIMARY_CACHED_SESSION_KEY)).toBe(true);
    expect(isPrimaryCachedSessionKey('agent:main:dm:alice')).toBe(false);
    expect(isPrimaryCachedSessionKey('agent:writer:main')).toBe(false);
  });

  it('drops snapshots for non-primary sessions or agents', () => {
    expect(sanitizePrimarySessionSnapshot({
      sessionKey: 'agent:main:dm:alice',
      updatedAt: 1234,
      agentId: PRIMARY_CACHED_AGENT_ID,
    })).toBeNull();

    expect(sanitizePrimarySessionSnapshot({
      sessionKey: PRIMARY_CACHED_SESSION_KEY,
      updatedAt: 1234,
      agentId: 'writer',
    })).toBeNull();
  });

  it('builds a primary-session preview with the main agent identity', () => {
    expect(buildPrimarySessionPreview({
      agentName: 'Main Agent',
      agentEmoji: '🤖',
      agentAvatarUri: 'https://example.com/avatar.png',
    })).toEqual({
      sessionKey: PRIMARY_CACHED_SESSION_KEY,
      updatedAt: expect.any(Number),
      agentId: PRIMARY_CACHED_AGENT_ID,
      agentName: 'Main Agent',
      agentEmoji: '🤖',
      agentAvatarUri: 'https://example.com/avatar.png',
    });
  });
});
