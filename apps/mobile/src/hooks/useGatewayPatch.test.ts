import { act, renderHook } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useGatewayPatch } from './useGatewayPatch';

const showOverlay = jest.fn();
const hideOverlay = jest.fn();
const beginExpectedRestart = jest.fn();
const endExpectedRestart = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../contexts/GatewayOverlayContext', () => ({
  useGatewayOverlay: () => ({
    showOverlay,
    hideOverlay,
    beginExpectedRestart,
    endExpectedRestart,
  }),
}));

describe('useGatewayPatch', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((message?: unknown) => {
      if (typeof message === 'string' && message.includes('react-test-renderer is deprecated')) {
        return;
      }
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('does not patch config when confirmation is cancelled', async () => {
    const patchConfig = jest.fn().mockResolvedValue({ ok: true });
    const gateway = {
      patchConfig,
      on: jest.fn(() => jest.fn()),
    } as any;

    const { result } = renderHook(() => useGatewayPatch(gateway));

    let pending!: Promise<boolean>;
    act(() => {
      pending = result.current.patchWithRestart({
        patch: { test: true },
        configHash: 'hash-1',
        confirmation: true,
      });
    });

    const alertCall = (Alert.alert as jest.Mock).mock.calls.at(-1);
    expect(alertCall?.[0]).toBe('Confirm Save');

    const cancelAction = alertCall?.[2]?.find((action: { style?: string }) => action.style === 'cancel');
    expect(cancelAction).toBeTruthy();

    await act(async () => {
      cancelAction.onPress();
      await pending;
    });

    expect(patchConfig).not.toHaveBeenCalled();
    expect(showOverlay).not.toHaveBeenCalled();
    expect(hideOverlay).not.toHaveBeenCalled();
  });

  it('patches config after confirmation and waits for gateway readiness', async () => {
    const patchConfig = jest.fn().mockResolvedValue({ ok: true });
    const probeConnection = jest.fn().mockResolvedValue(true);
    let connectionHandler: ((payload: { state: string }) => void) | null = null;
    const gateway = {
      patchConfig,
      probeConnection,
      on: jest.fn((_event: string, handler: (payload: { state: string }) => void) => {
        connectionHandler = handler;
        return jest.fn();
      }),
    } as any;

    const { result } = renderHook(() => useGatewayPatch(gateway));

    let pending!: Promise<boolean>;
    act(() => {
      pending = result.current.patchWithRestart({
        patch: { test: true },
        configHash: 'hash-2',
        confirmation: true,
      });
    });

    const alertCall = (Alert.alert as jest.Mock).mock.calls.at(-1);
    const saveAction = alertCall?.[2]?.find((action: { text?: string }) => action.text === 'Save');
    expect(saveAction).toBeTruthy();

    await act(async () => {
      saveAction.onPress();
      await Promise.resolve();
    });

    expect(patchConfig).toHaveBeenCalledWith(JSON.stringify({ test: true }), 'hash-2');
    expect(showOverlay).toHaveBeenCalledWith('Saving settings...');
    expect(beginExpectedRestart).toHaveBeenCalledTimes(1);

    await act(async () => {
      connectionHandler?.({ state: 'ready' });
      await pending;
    });

    expect(showOverlay).toHaveBeenLastCalledWith('Restarting Gateway to apply changes...');
    expect(probeConnection).toHaveBeenCalledWith(15_000);
    expect(endExpectedRestart).toHaveBeenCalledTimes(1);
    expect(hideOverlay).toHaveBeenCalledTimes(1);
  });

  it('replaces config after confirmation and waits for gateway readiness', async () => {
    const setConfig = jest.fn().mockResolvedValue({ ok: true, path: '/tmp/openclaw.json' });
    const probeConnection = jest.fn().mockResolvedValue(true);
    let connectionHandler: ((payload: { state: string }) => void) | null = null;
    const gateway = {
      setConfig,
      probeConnection,
      on: jest.fn((_event: string, handler: (payload: { state: string }) => void) => {
        connectionHandler = handler;
        return jest.fn();
      }),
    } as any;

    const { result } = renderHook(() => useGatewayPatch(gateway));

    let pending!: Promise<boolean>;
    act(() => {
      pending = result.current.setWithRestart({
        config: { test: true },
        configHash: 'hash-3',
        confirmation: true,
      });
    });

    const alertCall = (Alert.alert as jest.Mock).mock.calls.at(-1);
    const saveAction = alertCall?.[2]?.find((action: { text?: string }) => action.text === 'Save');
    expect(saveAction).toBeTruthy();

    await act(async () => {
      saveAction.onPress();
      await Promise.resolve();
    });

    expect(setConfig).toHaveBeenCalledWith(JSON.stringify({ test: true }), 'hash-3');

    await act(async () => {
      connectionHandler?.({ state: 'ready' });
      await pending;
    });

    expect(probeConnection).toHaveBeenCalledWith(15_000);
    expect(endExpectedRestart).toHaveBeenCalledTimes(1);
  });
});
