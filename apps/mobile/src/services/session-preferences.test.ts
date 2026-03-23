import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionPreferencesService } from './session-preferences';

let store: Record<string, string> = {};

beforeEach(() => {
  store = {};
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(store[key] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    store[key] = value;
    return Promise.resolve();
  });
});

describe('SessionPreferencesService', () => {
  it('stores pinned session keys per gateway and agent scope', async () => {
    await SessionPreferencesService.setPinnedSession('gw1', 'agentA', 'session:1', true);
    await SessionPreferencesService.setPinnedSession('gw1', 'agentB', 'session:2', true);

    await expect(SessionPreferencesService.getPinnedSessionKeys('gw1', 'agentA')).resolves.toEqual(['session:1']);
    await expect(SessionPreferencesService.getPinnedSessionKeys('gw1', 'agentB')).resolves.toEqual(['session:2']);
  });

  it('deduplicates pinned keys and keeps latest pin at the front', async () => {
    await SessionPreferencesService.setPinnedSession('gw1', 'agentA', 'session:1', true);
    await SessionPreferencesService.setPinnedSession('gw1', 'agentA', 'session:2', true);
    await SessionPreferencesService.setPinnedSession('gw1', 'agentA', 'session:1', true);

    await expect(SessionPreferencesService.getPinnedSessionKeys('gw1', 'agentA')).resolves.toEqual(['session:1', 'session:2']);
  });

  it('toggles and clears pinned state', async () => {
    await SessionPreferencesService.togglePinnedSession('gw1', 'agentA', 'session:1');
    await expect(SessionPreferencesService.getPinnedSessionKeys('gw1', 'agentA')).resolves.toEqual(['session:1']);

    await SessionPreferencesService.togglePinnedSession('gw1', 'agentA', 'session:1');
    await expect(SessionPreferencesService.getPinnedSessionKeys('gw1', 'agentA')).resolves.toEqual([]);

    await SessionPreferencesService.setPinnedSession('gw1', 'agentA', 'session:2', true);
    await SessionPreferencesService.clearSession('gw1', 'agentA', 'session:2');
    await expect(SessionPreferencesService.getPinnedSessionKeys('gw1', 'agentA')).resolves.toEqual([]);
  });
});
