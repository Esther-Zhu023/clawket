import AsyncStorage from '@react-native-async-storage/async-storage';
import { MessageFavoritesService } from './message-favorites';
import type { UiMessage } from '../types/chat';

let store: Record<string, string> = {};

function makeMessage(overrides: Partial<UiMessage> = {}): UiMessage {
  return {
    id: 'msg-1',
    role: 'assistant',
    text: 'Hello world',
    timestampMs: 1700000000000,
    ...overrides,
  };
}

beforeEach(() => {
  store = {};
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(store[key] ?? null),
  );
  (AsyncStorage.multiGet as jest.Mock).mockImplementation((keys: string[]) =>
    Promise.resolve(keys.map((key) => [key, store[key] ?? null])),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation(
    (key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    },
  );
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
    delete store[key];
    return Promise.resolve();
  });
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation((keys: string[]) => {
    for (const key of keys) delete store[key];
    return Promise.resolve();
  });
});

describe('MessageFavoritesService', () => {
  it('stores a favorited message in its own index branch', async () => {
    const result = await MessageFavoritesService.toggleFavorite({
      gatewayConfigId: 'gw1',
      agentId: 'agent1',
      agentName: 'Agent',
      sessionKey: 'agent:agent1:main',
      message: makeMessage(),
    });

    expect(result.favorited).toBe(true);
    await expect(MessageFavoritesService.listFavorites()).resolves.toMatchObject([
      {
        favoriteKey: result.favoriteKey,
        gatewayConfigId: 'gw1',
        agentId: 'agent1',
        messageId: 'msg-1',
      },
    ]);
  });

  it('toggles an existing favorite off', async () => {
    const params = {
      gatewayConfigId: 'gw1',
      agentId: 'agent1',
      sessionKey: 'agent:agent1:main',
      message: makeMessage(),
    };

    await MessageFavoritesService.toggleFavorite(params);
    const result = await MessageFavoritesService.toggleFavorite(params);

    expect(result.favorited).toBe(false);
    await expect(MessageFavoritesService.listFavorites()).resolves.toEqual([]);
  });

  it('returns an O(1)-friendly key set for render-time checks', async () => {
    const first = await MessageFavoritesService.toggleFavorite({
      gatewayConfigId: 'gw1',
      agentId: 'agent1',
      sessionKey: 'agent:agent1:main',
      message: makeMessage({ id: 'msg-1' }),
    });
    await MessageFavoritesService.toggleFavorite({
      gatewayConfigId: 'gw1',
      agentId: 'agent1',
      sessionKey: 'agent:agent1:main',
      message: makeMessage({ id: 'msg-2', text: 'Second message' }),
    });

    const keySet = await MessageFavoritesService.getFavoriteKeySet();
    expect(keySet.has(first.favoriteKey)).toBe(true);
    expect(keySet.size).toBe(2);
  });

  it('reads a single favorite by key', async () => {
    const created = await MessageFavoritesService.toggleFavorite({
      gatewayConfigId: 'gw1',
      agentId: 'agent1',
      sessionKey: 'agent:agent1:main',
      message: makeMessage({ id: 'msg-9', text: '# Heading' }),
    });

    await expect(
      MessageFavoritesService.getFavoriteByKey(created.favoriteKey),
    ).resolves.toMatchObject({
      favoriteKey: created.favoriteKey,
      messageId: 'msg-9',
      text: '# Heading',
    });
  });
});
