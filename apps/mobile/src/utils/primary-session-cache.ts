import type { LastOpenedSessionSnapshot } from '../services/storage';

export const PRIMARY_CACHED_AGENT_ID = 'main';
export const PRIMARY_CACHED_SESSION_KEY = `agent:${PRIMARY_CACHED_AGENT_ID}:main`;

export function isPrimaryCachedSessionKey(key: string | null | undefined): boolean {
  return key === PRIMARY_CACHED_SESSION_KEY;
}

export function sanitizePrimarySessionSnapshot(
  snapshot: LastOpenedSessionSnapshot | null | undefined,
): LastOpenedSessionSnapshot | null {
  if (!snapshot) return null;
  if (!isPrimaryCachedSessionKey(snapshot.sessionKey)) return null;
  if (snapshot.agentId && snapshot.agentId !== PRIMARY_CACHED_AGENT_ID) return null;
  return {
    ...snapshot,
    agentId: PRIMARY_CACHED_AGENT_ID,
  };
}

export function buildPrimarySessionPreview(
  identity?: {
    agentName?: string;
    agentEmoji?: string;
    agentAvatarUri?: string;
  } | null,
): LastOpenedSessionSnapshot {
  return {
    sessionKey: PRIMARY_CACHED_SESSION_KEY,
    updatedAt: Date.now(),
    agentId: PRIMARY_CACHED_AGENT_ID,
    agentName: identity?.agentName,
    agentEmoji: identity?.agentEmoji,
    agentAvatarUri: identity?.agentAvatarUri,
  };
}
