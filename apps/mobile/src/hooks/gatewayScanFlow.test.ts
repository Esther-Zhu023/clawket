import {
  claimRelayPairing,
  createGatewayConfigFromScan,
  upsertGatewayConfigFromScan,
  willCreateGatewayConfigFromScan,
} from './gatewayScanFlow';
import { StorageService } from '../services/storage';
import { RelayPairingService } from '../services/relay-pairing';

jest.mock('../services/storage', () => ({
  StorageService: {
    getGatewayConfigsState: jest.fn(),
    setGatewayConfigsState: jest.fn(),
  },
}));

jest.mock('../services/relay-pairing', () => ({
  RelayPairingService: {
    claim: jest.fn(),
  },
}));

describe('gatewayScanFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new relay config when the gateway has not been seen before', () => {
    const result = upsertGatewayConfigFromScan({
      existingState: {
        activeId: null,
        configs: [],
      },
      payload: {
        url: 'wss://relay.example.com/ws',
        token: 'gateway-token',
        mode: 'relay',
        relay: {
          serverUrl: 'https://registry.example.com/',
          gatewayId: 'gw_123',
          clientToken: 'gct_new',
          displayName: 'Test Relay',
        },
      },
      now: 100,
    });

    expect(result.created).toMatchObject({
      id: 'gateway_100',
      name: 'Test Relay',
      mode: 'relay',
      url: 'wss://relay.example.com/ws',
      token: 'gateway-token',
      relay: {
        serverUrl: 'https://registry.example.com',
        gatewayId: 'gw_123',
        clientToken: 'gct_new',
        displayName: 'Test Relay',
      },
      createdAt: 100,
      updatedAt: 100,
    });
    expect(result.nextConfigs).toHaveLength(1);
  });

  it('updates an existing relay config for the same registry gateway instead of duplicating it', () => {
    const result = upsertGatewayConfigFromScan({
      existingState: {
        activeId: 'gateway_existing',
        configs: [{
          id: 'gateway_existing',
          name: 'My MacBook',
          mode: 'relay',
          url: 'wss://relay-old.example.com/ws',
          token: 'old-token',
          relay: {
            serverUrl: 'https://registry.example.com',
            gatewayId: 'gw_123',
            clientToken: 'gct_old',
            displayName: 'Old Name',
          },
          createdAt: 10,
          updatedAt: 20,
        }],
      },
      payload: {
        url: 'wss://relay.example.com/ws',
        token: 'new-token',
        mode: 'relay',
        relay: {
          serverUrl: 'https://registry.example.com/',
          gatewayId: 'gw_123',
          clientToken: 'gct_new',
          displayName: 'New Name',
        },
      },
      now: 200,
    });

    expect(result.created).toEqual({
      id: 'gateway_existing',
      name: 'My MacBook',
      mode: 'relay',
      url: 'wss://relay.example.com/ws',
      token: 'new-token',
      password: undefined,
      relay: {
        serverUrl: 'https://registry.example.com',
        gatewayId: 'gw_123',
        clientToken: 'gct_new',
        displayName: 'New Name',
      },
      createdAt: 10,
      updatedAt: 200,
    });
    expect(result.nextConfigs).toHaveLength(1);
    expect(result.nextConfigs[0]).toEqual(result.created);
  });

  it('preserves existing legacy credentials when a refreshed relay QR omits them', () => {
    const result = upsertGatewayConfigFromScan({
      existingState: {
        activeId: 'gateway_existing',
        configs: [{
          id: 'gateway_existing',
          name: 'My MacBook',
          mode: 'relay',
          url: 'wss://relay-old.example.com/ws',
          token: 'old-token',
          password: 'old-password',
          relay: {
            serverUrl: 'https://registry.example.com',
            gatewayId: 'gw_123',
            clientToken: 'gct_old',
            displayName: 'Old Name',
          },
          createdAt: 10,
          updatedAt: 20,
        }],
      },
      payload: {
        url: 'wss://relay.example.com/ws',
        mode: 'relay',
        relay: {
          serverUrl: 'https://registry.example.com',
          gatewayId: 'gw_123',
          clientToken: 'gct_new',
          displayName: 'New Name',
          protocolVersion: 2,
          supportsBootstrap: true,
        },
      },
      now: 300,
    });

    expect(result.created).toEqual({
      id: 'gateway_existing',
      name: 'My MacBook',
      mode: 'relay',
      url: 'wss://relay.example.com/ws',
      token: 'old-token',
      password: 'old-password',
      relay: {
        serverUrl: 'https://registry.example.com',
        gatewayId: 'gw_123',
        clientToken: 'gct_new',
        displayName: 'New Name',
        protocolVersion: 2,
        supportsBootstrap: true,
      },
      createdAt: 10,
      updatedAt: 300,
    });
  });

  it('treats a rescan of the same relay gateway as an update instead of a new config', () => {
    expect(willCreateGatewayConfigFromScan([
      {
        id: 'gateway_existing',
        name: 'My MacBook',
        mode: 'relay',
        url: 'wss://relay-old.example.com/ws',
        token: 'old-token',
        relay: {
          serverUrl: 'https://registry.example.com',
          gatewayId: 'gw_123',
          clientToken: 'gct_old',
        },
        createdAt: 10,
        updatedAt: 20,
      },
    ], {
      url: 'wss://relay.example.com/ws',
      mode: 'relay',
      relay: {
        serverUrl: 'https://registry.example.com/',
        gatewayId: 'gw_123',
        accessCode: '123456',
      },
    })).toBe(false);
  });

  it('persists the upserted config as the active gateway', async () => {
    (StorageService.getGatewayConfigsState as jest.Mock).mockResolvedValue({
      activeId: 'gateway_existing',
      configs: [{
        id: 'gateway_existing',
        name: 'My MacBook',
        mode: 'relay',
        url: 'wss://relay-old.example.com/ws',
        token: 'old-token',
        relay: {
          serverUrl: 'https://registry.example.com',
          gatewayId: 'gw_123',
          clientToken: 'gct_old',
        },
        createdAt: 10,
        updatedAt: 20,
      }],
    });

    const result = await createGatewayConfigFromScan({
      payload: {
        url: 'wss://relay.example.com/ws',
        token: 'new-token',
        mode: 'relay',
        relay: {
          serverUrl: 'https://registry.example.com',
          gatewayId: 'gw_123',
          clientToken: 'gct_new',
        },
      },
      debugMode: false,
    });

    expect(result.created.id).toBe('gateway_existing');
    expect(StorageService.setGatewayConfigsState).toHaveBeenCalledWith({
      activeId: 'gateway_existing',
      configs: [result.created],
    });
  });

  it('preserves relay bootstrap capability flags when saving scanned configs', () => {
    const result = upsertGatewayConfigFromScan({
      existingState: {
        activeId: null,
        configs: [],
      },
      payload: {
        url: 'wss://relay.example.com/ws',
        token: 'gateway-token',
        mode: 'relay',
        relay: {
          serverUrl: 'https://registry.example.com',
          gatewayId: 'gw_123',
          clientToken: 'gct_new',
          protocolVersion: 2,
          supportsBootstrap: true,
        },
      },
      now: 300,
    });

    expect(result.created.relay).toEqual({
      serverUrl: 'https://registry.example.com',
      gatewayId: 'gw_123',
      clientToken: 'gct_new',
      protocolVersion: 2,
      supportsBootstrap: true,
    });
  });

  it('claims a new-format relay QR without legacy credentials and returns a usable relay config', async () => {
    const accessCode = 'AB7K9Q';
    (RelayPairingService.claim as jest.Mock).mockResolvedValue({
      gatewayId: 'gw_123',
      relayUrl: 'wss://relay.example.com/ws',
      clientToken: 'gct_new',
      displayName: 'Lucy Mac',
      region: 'us',
    });

    const result = await claimRelayPairing({
      url: '',
      mode: 'relay',
      relay: {
        serverUrl: 'https://registry.example.com',
        gatewayId: 'gw_123',
        accessCode,
        protocolVersion: 2,
        supportsBootstrap: true,
      },
    }, { current: new Map() });

    expect(RelayPairingService.claim).toHaveBeenCalledWith({
      serverUrl: 'https://registry.example.com',
      gatewayId: 'gw_123',
      accessCode,
    });

    expect(result).toEqual({
      url: 'wss://relay.example.com/ws',
      token: undefined,
      password: undefined,
      mode: 'relay',
      relay: {
        serverUrl: 'https://registry.example.com',
        gatewayId: 'gw_123',
        clientToken: 'gct_new',
        relayUrl: 'wss://relay.example.com/ws',
        displayName: 'Lucy Mac',
        protocolVersion: 2,
        supportsBootstrap: true,
      },
    });
  });

  it('claims a legacy relay QR and keeps legacy gateway credentials for fallback auth', async () => {
    (RelayPairingService.claim as jest.Mock).mockResolvedValue({
      gatewayId: 'gw_123',
      relayUrl: 'wss://relay.example.com/ws',
      clientToken: 'gct_new',
      displayName: 'Lucy Mac',
      region: 'us',
    });

    const result = await claimRelayPairing({
      url: '',
      token: 'legacy-token',
      password: 'legacy-password',
      mode: 'relay',
      relay: {
        serverUrl: 'https://registry.example.com',
        gatewayId: 'gw_123',
        accessCode: '123456',
      },
    }, { current: new Map() });

    expect(result.token).toBe('legacy-token');
    expect(result.password).toBe('legacy-password');
    expect(result.relay?.clientToken).toBe('gct_new');
  });
});
