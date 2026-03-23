import { act, renderHook } from '@testing-library/react-native';
import { useChatAutoCache } from './useChatAutoCache';
import { ChatCacheService } from '../services/chat-cache';

jest.mock('../services/chat-cache', () => ({
  ChatCacheService: {
    saveMessages: jest.fn(),
  },
}));

describe('useChatAutoCache', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((message?: unknown) => {
      if (typeof message === 'string' && message.includes('react-test-renderer is deprecated')) {
        return;
      }
    });
    (ChatCacheService.saveMessages as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.useRealTimers();
  });

  it('rewrites the cache entry when sessionId is populated after initial save', async () => {
    const messages = [
      { id: '1', role: 'user', text: 'hello', streaming: false },
      { id: '2', role: 'assistant', text: 'world', streaming: false },
    ] as any;

    const { rerender } = renderHook((props: {
      sessionId?: string;
      sessionLabel?: string;
    }) => useChatAutoCache({
      gatewayConfigId: 'gw-1',
      agentId: 'agent-1',
      agentName: 'Agent',
      agentEmoji: 'A',
      sessionKey: 'agent:agent-1:main',
      sessionId: props.sessionId,
      sessionLabel: props.sessionLabel,
      messages,
      historyLoaded: true,
    }), {
      initialProps: {
        sessionId: undefined,
        sessionLabel: undefined,
      },
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(ChatCacheService.saveMessages).toHaveBeenCalledTimes(1);
    expect(ChatCacheService.saveMessages).toHaveBeenLastCalledWith(expect.objectContaining({
      sessionId: undefined,
      sessionLabel: undefined,
    }), messages);

    rerender({
      sessionId: 'sess-1',
      sessionLabel: 'Main session',
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(ChatCacheService.saveMessages).toHaveBeenCalledTimes(2);
    expect(ChatCacheService.saveMessages).toHaveBeenLastCalledWith(expect.objectContaining({
      sessionId: 'sess-1',
      sessionLabel: 'Main session',
    }), messages);
  });
});
