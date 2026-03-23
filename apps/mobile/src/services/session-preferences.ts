import AsyncStorage from '@react-native-async-storage/async-storage';

type SessionPreferenceState = {
  pinnedSessionKeys: string[];
};

const SESSION_PREFERENCES_PREFIX = 'clawket.sessionPreferences.v1.';

function makeScopeKey(gatewayConfigId: string, agentId: string): string {
  return `${SESSION_PREFERENCES_PREFIX}${gatewayConfigId}::${agentId}`;
}

function normalizeState(value: unknown): SessionPreferenceState {
  if (!value || typeof value !== 'object') {
    return { pinnedSessionKeys: [] };
  }
  const record = value as Record<string, unknown>;
  const pinnedSessionKeys = Array.isArray(record.pinnedSessionKeys)
    ? Array.from(new Set(record.pinnedSessionKeys.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)))
    : [];
  return { pinnedSessionKeys };
}

async function readState(gatewayConfigId: string, agentId: string): Promise<SessionPreferenceState> {
  try {
    const raw = await AsyncStorage.getItem(makeScopeKey(gatewayConfigId, agentId));
    if (!raw) return { pinnedSessionKeys: [] };
    return normalizeState(JSON.parse(raw));
  } catch {
    return { pinnedSessionKeys: [] };
  }
}

async function writeState(gatewayConfigId: string, agentId: string, state: SessionPreferenceState): Promise<void> {
  await AsyncStorage.setItem(makeScopeKey(gatewayConfigId, agentId), JSON.stringify(normalizeState(state)));
}

export const SessionPreferencesService = {
  async getPinnedSessionKeys(gatewayConfigId: string, agentId: string): Promise<string[]> {
    const state = await readState(gatewayConfigId, agentId);
    return state.pinnedSessionKeys;
  },

  async setPinnedSession(gatewayConfigId: string, agentId: string, sessionKey: string, pinned: boolean): Promise<string[]> {
    const state = await readState(gatewayConfigId, agentId);
    const next = pinned
      ? Array.from(new Set([sessionKey, ...state.pinnedSessionKeys]))
      : state.pinnedSessionKeys.filter((item) => item !== sessionKey);
    await writeState(gatewayConfigId, agentId, { pinnedSessionKeys: next });
    return next;
  },

  async togglePinnedSession(gatewayConfigId: string, agentId: string, sessionKey: string): Promise<string[]> {
    const state = await readState(gatewayConfigId, agentId);
    const isPinned = state.pinnedSessionKeys.includes(sessionKey);
    return this.setPinnedSession(gatewayConfigId, agentId, sessionKey, !isPinned);
  },

  async clearSession(gatewayConfigId: string, agentId: string, sessionKey: string): Promise<void> {
    await this.setPinnedSession(gatewayConfigId, agentId, sessionKey, false);
  },
};
