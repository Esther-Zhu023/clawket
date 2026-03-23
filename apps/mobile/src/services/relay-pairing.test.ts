import { RelayPairingService, normalizeHttpBase } from './relay-pairing';

describe('RelayPairingService', () => {
  beforeEach(() => {
    (globalThis as { fetch?: unknown }).fetch = jest.fn();
  });

  it('claims a pairing code and returns relay credentials', async () => {
    const accessCode = 'AB7K9Q';
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        gatewayId: 'gateway_123',
        relayUrl: 'wss://relay-us.example.com/ws',
        clientToken: 'client-token',
        displayName: 'Lucy Mac',
        region: 'us',
      }),
    });

    await expect(RelayPairingService.claim({
      serverUrl: 'registry.example.com',
      gatewayId: 'gateway_123',
      accessCode,
    })).resolves.toEqual({
      gatewayId: 'gateway_123',
      relayUrl: 'wss://relay-us.example.com/ws',
      clientToken: 'client-token',
      displayName: 'Lucy Mac',
      region: 'us',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://registry.example.com/v1/pair/claim',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          gatewayId: 'gateway_123',
          accessCode,
          clientLabel: null,
        }),
      }),
    );
  });

  it('normalizes http base urls', () => {
    expect(normalizeHttpBase('registry.example.com')).toBe('https://registry.example.com');
    expect(normalizeHttpBase('wss://registry.example.com/')).toBe('https://registry.example.com');
  });

  it('maps expired QR codes to a friendly error', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: {
          code: 'ACCESS_CODE_EXPIRED',
          message: 'Access code expired',
        },
      }),
    });

    await expect(RelayPairingService.claim({
      serverUrl: 'registry.example.com',
      gatewayId: 'gateway_123',
      accessCode: '123456',
    })).rejects.toThrow('This QR code has expired. Generate a new QR code in Clawket Bridge and try again.');
  });

  it('maps used QR codes to a friendly error', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: {
          code: 'ACCESS_CODE_REQUIRED',
          message: 'Gateway does not have an active access code',
        },
      }),
    });

    await expect(RelayPairingService.claim({
      serverUrl: 'registry.example.com',
      gatewayId: 'gateway_123',
      accessCode: '123456',
    })).rejects.toThrow('This QR code has already been used. Generate a new QR code in Clawket Bridge and try again.');
  });
});
