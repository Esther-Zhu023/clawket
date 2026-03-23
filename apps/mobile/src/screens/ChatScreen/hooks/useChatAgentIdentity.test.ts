import { act, renderHook } from '@testing-library/react-native';
import { StorageService } from '../../../services/storage';
import { useChatAgentIdentity } from './useChatAgentIdentity';

jest.mock('../../../services/storage', () => ({
  StorageService: {
    getLastOpenedSessionSnapshot: jest.fn().mockResolvedValue(null),
    getCachedAgentIdentity: jest.fn().mockResolvedValue(null),
    setLastOpenedSessionSnapshot: jest.fn().mockResolvedValue(undefined),
    setCachedAgentIdentity: jest.fn().mockResolvedValue(undefined),
  },
}));

function createGateway(connectionState: 'ready' | 'connecting' = 'connecting') {
  return {
    fetchIdentity: jest.fn().mockResolvedValue({}),
    getBaseUrl: jest.fn(() => 'https://example.com'),
    getConnectionState: jest.fn(() => connectionState),
  };
}

describe('useChatAgentIdentity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hydrates identity from cached storage before the gateway reconnects', async () => {
    const mockedStorage = StorageService as jest.Mocked<typeof StorageService>;
    const agents: any[] = [];
    mockedStorage.getLastOpenedSessionSnapshot.mockResolvedValueOnce({
      sessionKey: 'agent:main:main',
      updatedAt: 1234,
      agentId: 'main',
      agentName: 'Snapshot Agent',
      agentEmoji: '🤖',
      agentAvatarUri: 'https://example.com/avatar.png',
    } as any);
    mockedStorage.getCachedAgentIdentity.mockResolvedValueOnce({
      agentId: 'main',
      updatedAt: 1234,
      agentName: 'Cached Agent',
      agentEmoji: '🛰️',
      agentAvatarUri: 'https://example.com/cached.png',
    } as any);

    const gateway = createGateway('connecting');
    const { result } = renderHook(() => useChatAgentIdentity({
      agents,
      cacheAgentName: undefined,
      currentAgentId: 'main',
      currentSessionInfo: undefined,
      gateway,
      gatewayConfigId: 'cfg:one',
      initialPreview: null,
      sessionKey: 'agent:main:main',
    }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current).toEqual({
      displayName: 'Snapshot Agent',
      avatarUri: 'https://example.com/avatar.png',
      emoji: '🤖',
    });
  });

  it('updates identity from loaded agent metadata and persists the cache', async () => {
    const mockedStorage = StorageService as jest.Mocked<typeof StorageService>;
    const gateway = createGateway('ready');
    const agents = [
      {
        id: 'main',
        name: 'Main',
        identity: {
          name: 'Main Agent',
          emoji: '🤖',
          avatar: '/avatar.png',
        },
      },
    ];

    const { result } = renderHook(() => useChatAgentIdentity({
      agents,
      cacheAgentName: 'Main Agent',
      currentAgentId: 'main',
      currentSessionInfo: {
        key: 'agent:main:main',
        kind: 'unknown',
        sessionId: 'sess-1',
      },
      gateway,
      gatewayConfigId: 'cfg:one',
      initialPreview: null,
      sessionKey: 'agent:main:main',
    }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current).toEqual({
      displayName: 'Main Agent',
      avatarUri: 'https://example.com/avatar.png',
      emoji: '🤖',
    });
    expect(mockedStorage.setCachedAgentIdentity).toHaveBeenCalledWith(
      'cfg:one',
      expect.objectContaining({
        agentId: 'main',
        agentName: 'Main Agent',
        agentEmoji: '🤖',
        agentAvatarUri: 'https://example.com/avatar.png',
      }),
    );
  });

  it('keeps the cached identity when the agent list is still empty', async () => {
    const mockedStorage = StorageService as jest.Mocked<typeof StorageService>;
    const agents: any[] = [];
    mockedStorage.getCachedAgentIdentity.mockResolvedValueOnce({
      agentId: 'main',
      updatedAt: 1234,
      agentName: 'Cached Main',
      agentEmoji: '🤖',
      agentAvatarUri: 'https://example.com/cached-main.png',
    } as any);

    const gateway = createGateway('connecting');
    const { result } = renderHook(() => useChatAgentIdentity({
      agents,
      cacheAgentName: undefined,
      currentAgentId: 'main',
      currentSessionInfo: undefined,
      gateway,
      gatewayConfigId: 'cfg:one',
      initialPreview: null,
      sessionKey: 'agent:main:main',
    }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current).toEqual({
      displayName: 'Cached Main',
      avatarUri: 'https://example.com/cached-main.png',
      emoji: '🤖',
    });
  });

  it('does not persist last-session snapshot or agent cache for non-primary sessions', async () => {
    const mockedStorage = StorageService as jest.Mocked<typeof StorageService>;
    const gateway = createGateway('connecting');

    renderHook(() => useChatAgentIdentity({
      agents: [
        {
          id: 'writer',
          name: 'Writer',
          identity: {
            name: 'Writer Agent',
            emoji: '✍️',
            avatar: '/avatar.png',
          },
        },
      ],
      cacheAgentName: 'Writer Agent',
      currentAgentId: 'writer',
      currentSessionInfo: {
        key: 'agent:writer:dm:alice',
        kind: 'unknown',
        sessionId: 'sess-writer',
      },
      gateway,
      gatewayConfigId: 'cfg:one',
      initialPreview: null,
      sessionKey: 'agent:writer:dm:alice',
    }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedStorage.setLastOpenedSessionSnapshot).not.toHaveBeenCalled();
    expect(mockedStorage.setCachedAgentIdentity).not.toHaveBeenCalled();
  });
});
