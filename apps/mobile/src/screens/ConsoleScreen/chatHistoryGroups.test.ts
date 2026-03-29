import type { CachedMessage, CachedSessionMeta } from "../../services/chat-cache";
import {
  buildChatHistoryDisplayGroups,
  buildChatHistorySessionGroups,
  buildGroupedSearchMatches,
  countUniqueMessages,
  getChatHistorySessionGroupKey,
} from "./chatHistoryGroups";

function makeMeta(meta: Partial<CachedSessionMeta>): CachedSessionMeta {
  return {
    storageKey: "storage",
    gatewayConfigId: "gw1",
    agentId: "main",
    sessionKey: "agent:main:main",
    messageCount: 2,
    updatedAt: 100,
    ...meta,
  };
}

function makeMessage(message: Partial<CachedMessage>): CachedMessage {
  return {
    id: "msg-1",
    role: "assistant",
    text: "hello",
    ...message,
  };
}

describe("chatHistoryGroups", () => {
  it("builds one logical group per gateway, agent, and session key", () => {
    expect(
      getChatHistorySessionGroupKey(
        makeMeta({
          gatewayConfigId: "gw1",
          agentId: "main",
          sessionKey: "agent:main:main",
        }),
      ),
    ).toBe("gw1::main::agent:main:main");
  });

  it("merges multiple snapshots of the same logical session", () => {
    const groups = buildChatHistorySessionGroups([
      makeMeta({
        storageKey: "older",
        sessionId: "sess-1",
        updatedAt: 100,
        agentName: "Lucy",
      }),
      makeMeta({
        storageKey: "newer",
        sessionId: "sess-2",
        updatedAt: 200,
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.snapshots).toHaveLength(2);
    expect(groups[0]?.latestMeta.storageKey).toBe("newer");
    expect(groups[0]?.latestMeta.agentName).toBe("Lucy");
  });

  it("keeps different session keys as separate groups", () => {
    const groups = buildChatHistorySessionGroups([
      makeMeta({
        storageKey: "main",
        sessionKey: "agent:main:main",
        updatedAt: 200,
      }),
      makeMeta({
        storageKey: "telegram",
        sessionKey: "agent:main:telegram",
        updatedAt: 100,
      }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.latestMeta.storageKey)).toEqual([
      "main",
      "telegram",
    ]);
  });

  it("groups content search matches by logical session", () => {
    const grouped = buildGroupedSearchMatches([
      {
        meta: makeMeta({
          storageKey: "older",
          sessionId: "sess-1",
          updatedAt: 100,
        }),
        matches: [makeMessage({ id: "m1", text: "older match", timestampMs: 100 })],
      },
      {
        meta: makeMeta({
          storageKey: "newer",
          sessionId: "sess-2",
          updatedAt: 200,
        }),
        matches: [makeMessage({ id: "m2", text: "newer match", timestampMs: 200 })],
      },
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.meta.storageKey).toBe("newer");
    expect(grouped[0]?.messages.map((message) => message.id)).toEqual([
      "m2",
      "m1",
    ]);
  });

  it("merges display groups that render to the same agent and session labels", () => {
    const logicalGroups = buildChatHistorySessionGroups([
      makeMeta({
        storageKey: "main-1",
        agentId: "lucy-a",
        agentName: "Lucy",
        sessionKey: "agent:lucy-a:main",
        sessionLabel: "Lucy (Main session)",
        updatedAt: 100,
      }),
      makeMeta({
        storageKey: "main-2",
        agentId: "lucy-b",
        agentName: "Lucy",
        sessionKey: "agent:lucy-b:main",
        sessionLabel: "Lucy (Main session)",
        updatedAt: 200,
      }),
    ]);

    const displayGroups = buildChatHistoryDisplayGroups(logicalGroups, {
      resolveAgentLabel: (meta) => meta.agentName ?? meta.agentId,
      resolveSessionLabel: (meta) => meta.sessionLabel ?? meta.sessionKey,
    });

    expect(displayGroups).toHaveLength(1);
    expect(displayGroups[0]?.logicalSessions).toHaveLength(2);
    expect(displayGroups[0]?.latestMeta.storageKey).toBe("main-2");
  });

  it("counts unique messages across merged collections", () => {
    const count = countUniqueMessages([
      [
        makeMessage({ id: "m1" }),
        makeMessage({ id: "m2" }),
      ],
      [
        makeMessage({ id: "m2" }),
        makeMessage({ id: "m3" }),
      ],
    ]);

    expect(count).toBe(3);
  });
});
