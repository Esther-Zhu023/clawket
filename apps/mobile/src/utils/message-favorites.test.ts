import { buildFavoriteMessageKey } from './message-favorites';

describe('buildFavoriteMessageKey', () => {
  it('returns the same key for the same message identity', () => {
    const first = buildFavoriteMessageKey({
      gatewayConfigId: 'gw1',
      agentId: 'agent1',
      sessionKey: 'agent:agent1:main',
      message: {
        id: 'msg-1',
        role: 'assistant',
        text: 'Hello world',
        timestampMs: 123,
        modelLabel: 'gpt',
      },
    });
    const second = buildFavoriteMessageKey({
      gatewayConfigId: 'gw1',
      agentId: 'agent1',
      sessionKey: 'agent:agent1:main',
      message: {
        id: 'msg-1',
        role: 'assistant',
        text: 'Hello world',
        timestampMs: 123,
        modelLabel: 'gpt',
      },
    });

    expect(first).toBe(second);
  });

  it('changes when the session identity changes', () => {
    const first = buildFavoriteMessageKey({
      gatewayConfigId: 'gw1',
      agentId: 'agent1',
      sessionKey: 'agent:agent1:main',
      message: {
        id: 'msg-1',
        role: 'assistant',
        text: 'Hello world',
      },
    });
    const second = buildFavoriteMessageKey({
      gatewayConfigId: 'gw1',
      agentId: 'agent1',
      sessionKey: 'agent:agent1:channel:telegram:42',
      message: {
        id: 'msg-1',
        role: 'assistant',
        text: 'Hello world',
      },
    });

    expect(first).not.toBe(second);
  });

  it('distinguishes messages with the same id but different text', () => {
    const first = buildFavoriteMessageKey({
      gatewayConfigId: 'gw1',
      agentId: 'agent1',
      sessionKey: 'agent:agent1:main',
      message: {
        id: 'msg-1',
        role: 'assistant',
        text: 'Hello world',
      },
    });
    const second = buildFavoriteMessageKey({
      gatewayConfigId: 'gw1',
      agentId: 'agent1',
      sessionKey: 'agent:agent1:main',
      message: {
        id: 'msg-1',
        role: 'assistant',
        text: 'Hello Lucy',
      },
    });

    expect(first).not.toBe(second);
  });
});
