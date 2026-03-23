import type { CachedSessionMeta } from "../../services/chat-cache";

export type GatewayNameMap = Record<string, string>;

export type ChatHistoryAgentFilter = {
  key: string;
  gatewayConfigId: string;
  agentId: string;
  name: string;
  emoji?: string;
  gatewayName?: string;
  label: string;
  sessionCount: number;
  lastUpdatedAt: number;
};

type DraftFilter = Omit<ChatHistoryAgentFilter, "label">;

function fallbackAgentName(session: CachedSessionMeta): string {
  const trimmed = session.agentName?.trim();
  if (trimmed) return trimmed;
  return session.agentId.slice(0, 8);
}

function buildFilterKey(gatewayConfigId: string, agentId: string): string {
  return `${gatewayConfigId}::${agentId}`;
}

export function getChatHistoryFilterKey(
  meta: Pick<CachedSessionMeta, "gatewayConfigId" | "agentId">,
): string {
  return buildFilterKey(meta.gatewayConfigId, meta.agentId);
}

export function buildChatHistoryAgentFilters(
  sessions: CachedSessionMeta[],
  gatewayNames: GatewayNameMap,
): ChatHistoryAgentFilter[] {
  const drafts = new Map<string, DraftFilter>();

  for (const session of sessions) {
    const key = buildFilterKey(session.gatewayConfigId, session.agentId);
    const gatewayName = gatewayNames[session.gatewayConfigId];
    const existing = drafts.get(key);
    if (!existing) {
      drafts.set(key, {
        key,
        gatewayConfigId: session.gatewayConfigId,
        agentId: session.agentId,
        name: fallbackAgentName(session),
        emoji: session.agentEmoji,
        gatewayName,
        sessionCount: 1,
        lastUpdatedAt: session.updatedAt,
      });
      continue;
    }

    existing.sessionCount += 1;
    existing.lastUpdatedAt = Math.max(
      existing.lastUpdatedAt,
      session.updatedAt,
    );
    if (!existing.emoji && session.agentEmoji) {
      existing.emoji = session.agentEmoji;
    }
    if (
      (!existing.name || existing.name === existing.agentId.slice(0, 8)) &&
      session.agentName?.trim()
    ) {
      existing.name = session.agentName.trim();
    }
    if (!existing.gatewayName && gatewayName) {
      existing.gatewayName = gatewayName;
    }
  }

  const duplicateCounts = new Map<string, number>();
  for (const draft of drafts.values()) {
    duplicateCounts.set(draft.name, (duplicateCounts.get(draft.name) ?? 0) + 1);
  }

  return Array.from(drafts.values())
    .map((draft) => ({
      ...draft,
      label:
        (duplicateCounts.get(draft.name) ?? 0) > 1 && draft.gatewayName
          ? `${draft.name} (${draft.gatewayName})`
          : draft.name,
    }))
    .sort(
      (a, b) =>
        b.lastUpdatedAt - a.lastUpdatedAt || a.label.localeCompare(b.label),
    );
}
