import type {
  CachedMessage,
  CachedSessionMeta,
} from "../../services/chat-cache";

export type ChatHistorySessionGroup = {
  key: string;
  gatewayConfigId: string;
  agentId: string;
  sessionKey: string;
  latestMeta: CachedSessionMeta;
  snapshots: CachedSessionMeta[];
};

export type ChatHistoryGroupedMatch = {
  groupKey: string;
  meta: CachedSessionMeta;
  messages: CachedMessage[];
};

export type ChatHistoryDisplayGroup = {
  key: string;
  agentLabel: string;
  sessionLabel: string;
  latestMeta: CachedSessionMeta;
  logicalSessions: ChatHistorySessionGroup[];
  snapshotCount: number;
};

export function countUniqueMessages(
  collections: CachedMessage[][],
): number {
  const seenIds = new Set<string>();
  for (const messages of collections) {
    for (const message of messages) {
      seenIds.add(message.id);
    }
  }
  return seenIds.size;
}

function buildGroupKey(
  gatewayConfigId: string,
  agentId: string,
  sessionKey: string,
): string {
  return `${gatewayConfigId}::${agentId}::${sessionKey}`;
}

export function getChatHistorySessionGroupKey(
  meta: Pick<CachedSessionMeta, "gatewayConfigId" | "agentId" | "sessionKey">,
): string {
  return buildGroupKey(meta.gatewayConfigId, meta.agentId, meta.sessionKey);
}

function preferNonEmptyString(
  current: string | undefined,
  candidate: string | undefined,
): string | undefined {
  return current?.trim() ? current : candidate?.trim() || current;
}

function pickRepresentativeMeta(entries: CachedSessionMeta[]): CachedSessionMeta {
  const sorted = [...entries].sort(
    (a, b) =>
      b.updatedAt - a.updatedAt ||
      (b.lastMessageMs ?? 0) - (a.lastMessageMs ?? 0) ||
      b.storageKey.localeCompare(a.storageKey),
  );
  const latest = sorted[0];

  let agentName = latest.agentName;
  let agentEmoji = latest.agentEmoji;
  let sessionLabel = latest.sessionLabel;
  let lastMessagePreview = latest.lastMessagePreview;
  let lastModelLabel = latest.lastModelLabel;
  let sessionId = latest.sessionId;

  for (const entry of sorted) {
    agentName = preferNonEmptyString(agentName, entry.agentName);
    agentEmoji = preferNonEmptyString(agentEmoji, entry.agentEmoji);
    sessionLabel = preferNonEmptyString(sessionLabel, entry.sessionLabel);
    lastMessagePreview = preferNonEmptyString(
      lastMessagePreview,
      entry.lastMessagePreview,
    );
    lastModelLabel = preferNonEmptyString(lastModelLabel, entry.lastModelLabel);
    sessionId = preferNonEmptyString(sessionId, entry.sessionId);
  }

  return {
    ...latest,
    agentName,
    agentEmoji,
    sessionLabel,
    lastMessagePreview,
    lastModelLabel,
    sessionId,
  };
}

export function buildChatHistorySessionGroups(
  sessions: CachedSessionMeta[],
): ChatHistorySessionGroup[] {
  const drafts = new Map<string, CachedSessionMeta[]>();

  for (const session of sessions) {
    const key = getChatHistorySessionGroupKey(session);
    const existing = drafts.get(key);
    if (existing) {
      existing.push(session);
    } else {
      drafts.set(key, [session]);
    }
  }

  return Array.from(drafts.entries())
    .map(([key, entries]) => {
      const snapshots = [...entries].sort(
        (a, b) =>
          b.updatedAt - a.updatedAt ||
          (b.lastMessageMs ?? 0) - (a.lastMessageMs ?? 0) ||
          b.storageKey.localeCompare(a.storageKey),
      );
      const latestMeta = pickRepresentativeMeta(snapshots);
      return {
        key,
        gatewayConfigId: latestMeta.gatewayConfigId,
        agentId: latestMeta.agentId,
        sessionKey: latestMeta.sessionKey,
        latestMeta,
        snapshots,
      };
    })
    .sort(
      (a, b) =>
        b.latestMeta.updatedAt - a.latestMeta.updatedAt ||
        a.latestMeta.sessionKey.localeCompare(b.latestMeta.sessionKey),
    );
}

export function buildGroupedSearchMatches(
  results: Array<{ meta: CachedSessionMeta; matches: CachedMessage[] }>,
): ChatHistoryGroupedMatch[] {
  const grouped = new Map<string, ChatHistoryGroupedMatch>();

  for (const result of results) {
    const groupKey = getChatHistorySessionGroupKey(result.meta);
    const existing = grouped.get(groupKey);
    if (!existing) {
      grouped.set(groupKey, {
        groupKey,
        meta: result.meta,
        messages: [...result.matches],
      });
      continue;
    }

    if (result.meta.updatedAt > existing.meta.updatedAt) {
      existing.meta = result.meta;
    }

    const seenMessageIds = new Set(existing.messages.map((message) => message.id));
    for (const message of result.matches) {
      if (seenMessageIds.has(message.id)) continue;
      seenMessageIds.add(message.id);
      existing.messages.push(message);
    }
  }

  for (const entry of grouped.values()) {
    entry.messages.sort(
      (a, b) => (b.timestampMs ?? 0) - (a.timestampMs ?? 0) || a.id.localeCompare(b.id),
    );
  }

  return Array.from(grouped.values());
}

function normalizeDisplayKeyPart(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function buildChatHistoryDisplayGroups(
  groups: ChatHistorySessionGroup[],
  options: {
    resolveAgentLabel: (meta: CachedSessionMeta) => string;
    resolveSessionLabel: (meta: CachedSessionMeta) => string;
  },
): ChatHistoryDisplayGroup[] {
  const drafts = new Map<
    string,
    {
      agentLabel: string;
      sessionLabel: string;
      logicalSessions: ChatHistorySessionGroup[];
    }
  >();

  for (const group of groups) {
    const latestMeta = group.latestMeta;
    const agentLabel = options.resolveAgentLabel(latestMeta);
    const sessionLabel = options.resolveSessionLabel(latestMeta);
    const key = `${normalizeDisplayKeyPart(agentLabel)}::${normalizeDisplayKeyPart(sessionLabel)}`;
    const existing = drafts.get(key);
    if (existing) {
      existing.logicalSessions.push(group);
    } else {
      drafts.set(key, {
        agentLabel,
        sessionLabel,
        logicalSessions: [group],
      });
    }
  }

  return Array.from(drafts.entries())
    .map(([key, draft]) => {
      const logicalSessions = [...draft.logicalSessions].sort(
        (a, b) =>
          b.latestMeta.updatedAt - a.latestMeta.updatedAt ||
          b.latestMeta.storageKey.localeCompare(a.latestMeta.storageKey),
      );
      return {
        key,
        agentLabel: draft.agentLabel,
        sessionLabel: draft.sessionLabel,
        latestMeta: logicalSessions[0].latestMeta,
        logicalSessions,
        snapshotCount: logicalSessions.reduce(
          (count, group) => count + group.snapshots.length,
          0,
        ),
      };
    })
    .sort(
      (a, b) =>
        b.latestMeta.updatedAt - a.latestMeta.updatedAt ||
        a.key.localeCompare(b.key),
    );
}
