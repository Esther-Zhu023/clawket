import type { CachedSessionMeta } from "../../services/chat-cache";
import {
  buildChatHistoryAgentFilters,
  getChatHistoryFilterKey,
} from "./chatHistoryFilters";

function makeSession(meta: Partial<CachedSessionMeta>): CachedSessionMeta {
  return {
    storageKey: `key-${meta.gatewayConfigId}-${meta.agentId}-${meta.sessionKey}`,
    gatewayConfigId: "gw1",
    agentId: "main",
    sessionKey: "agent:main:main",
    messageCount: 2,
    updatedAt: 100,
    ...meta,
  };
}

describe("chatHistoryFilters", () => {
  it("builds distinct filter keys per gateway and agent pair", () => {
    expect(
      getChatHistoryFilterKey(
        makeSession({ gatewayConfigId: "gw1", agentId: "main" }),
      ),
    ).toBe("gw1::main");
    expect(
      getChatHistoryFilterKey(
        makeSession({ gatewayConfigId: "gw2", agentId: "main" }),
      ),
    ).toBe("gw2::main");
  });

  it("keeps same agent ids from different gateways as separate filters", () => {
    const filters = buildChatHistoryAgentFilters(
      [
        makeSession({
          gatewayConfigId: "gw1",
          agentId: "main",
          agentName: "Main Agent",
          updatedAt: 10,
        }),
        makeSession({
          gatewayConfigId: "gw2",
          agentId: "main",
          agentName: "Main Agent",
          updatedAt: 20,
        }),
      ],
      {
        gw1: "Office",
        gw2: "Home",
      },
    );

    expect(filters).toHaveLength(2);
    expect(filters[0].label).toBe("Main Agent (Home)");
    expect(filters[1].label).toBe("Main Agent (Office)");
  });

  it("keeps a simple label when the agent name is unique", () => {
    const filters = buildChatHistoryAgentFilters(
      [
        makeSession({
          gatewayConfigId: "gw1",
          agentId: "writer",
          agentName: "Writer",
          updatedAt: 20,
        }),
        makeSession({
          gatewayConfigId: "gw1",
          agentId: "main",
          agentName: "Main Agent",
          updatedAt: 10,
        }),
      ],
      {
        gw1: "Office",
      },
    );

    expect(filters[0].label).toBe("Writer");
    expect(filters[1].label).toBe("Main Agent");
  });
});
