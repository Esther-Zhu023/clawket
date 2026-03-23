import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useGatewayToolSettings } from './useGatewayToolSettings';

const patchWithRestart = jest.fn();

jest.mock('../../../hooks/useGatewayPatch', () => ({
  useGatewayPatch: () => ({
    patchWithRestart,
  }),
}));

describe('useGatewayToolSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('restores the previous value when confirmation is cancelled', async () => {
    const gateway = {
      getConfig: jest.fn().mockResolvedValue({
        config: {
          tools: {
            web: {
              search: { enabled: true },
              fetch: { enabled: true },
            },
            exec: {
              security: 'deny',
              ask: 'on-miss',
            },
            media: {
              image: { enabled: true },
              audio: { enabled: true },
              video: { enabled: true },
            },
            links: { enabled: true },
          },
        },
        hash: 'hash-1',
      }),
    } as any;
    patchWithRestart.mockResolvedValue(false);

    const { result } = renderHook(() => useGatewayToolSettings({
      gateway,
      gatewayEpoch: 0,
      hasActiveGateway: true,
    }));

    await waitFor(() => {
      expect(result.current.webSearchEnabled).toBe(true);
    });

    await act(async () => {
      result.current.setWebSearchEnabled(false);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.webSearchEnabled).toBe(true);
    });

    expect(patchWithRestart).toHaveBeenCalledWith(expect.objectContaining({
      confirmation: true,
      configHash: 'hash-1',
    }));
  });
});
