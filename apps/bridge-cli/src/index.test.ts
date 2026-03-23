import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  pairGatewayMock,
  qrcodeGenerateMock,
  refreshAccessCodeMock,
  writePairingQrPngMock,
  resolveGatewayAuthMock,
  getServiceStatusMock,
} = vi.hoisted(() => ({
  pairGatewayMock: vi.fn(),
  qrcodeGenerateMock: vi.fn(),
  refreshAccessCodeMock: vi.fn(),
  writePairingQrPngMock: vi.fn(),
  resolveGatewayAuthMock: vi.fn(),
  getServiceStatusMock: vi.fn(() => ({
    installed: true,
    running: true,
    method: 'launchagent',
    servicePath: '/tmp/clawket.plist',
    logPath: '/tmp/clawket.log',
    errorLogPath: '/tmp/clawket-error.log',
    pid: 123,
  })),
}));

vi.mock('qrcode-terminal', () => ({
  default: {
    generate: qrcodeGenerateMock,
  },
}));

vi.mock('./diagnostics.js', () => ({
  buildDoctorReport: vi.fn(),
  ensurePairPrerequisites: vi.fn(),
  readRecentCliLogs: vi.fn(() => []),
}));

vi.mock('./log-parse.js', () => ({
  parseLookbackToMs: vi.fn(() => null),
}));

vi.mock('./local-pair.js', () => ({
  buildGatewayControlUiOrigin: vi.fn(),
  buildLocalPairingInfo: vi.fn(),
}));

vi.mock('./metadata.js', () => ({
  readCliVersion: vi.fn(() => '0.0.0-test'),
}));

vi.mock('./pairing-output.js', () => ({
  buildLocalPairingJson: vi.fn(() => ({})),
  buildPairingJson: vi.fn(() => ({})),
}));

vi.mock('./qr-file.js', () => ({
  writePairingQrPng: writePairingQrPngMock,
  writeRawQrPng: vi.fn(),
}));

vi.mock('./service-decision.js', () => ({
  decidePairServiceAction: vi.fn(() => 'noop'),
}));

vi.mock('@clawket/bridge-core', () => ({
  clearServiceState: vi.fn(),
  deletePairingConfig: vi.fn(),
  getDefaultBridgeDisplayName: vi.fn(() => 'Lucy'),
  getPairingConfigPath: vi.fn(() => '/tmp/bridge-cli.json'),
  getServicePaths: vi.fn(() => ({
    logPath: '/tmp/clawket.log',
    errorLogPath: '/tmp/clawket-error.log',
  })),
  getServiceStatus: getServiceStatusMock,
  installService: vi.fn(),
  isAutostartUnsupportedError: vi.fn(() => false),
  listRuntimeProcesses: vi.fn(() => []),
  pairGateway: pairGatewayMock,
  readPairingConfig: vi.fn(() => null),
  refreshAccessCode: refreshAccessCodeMock,
  registerRuntimeProcess: vi.fn(),
  restartService: vi.fn(),
  startTransientRuntime: vi.fn(),
  stopRuntimeProcesses: vi.fn(),
  stopService: vi.fn(),
  uninstallService: vi.fn(),
  unregisterRuntimeProcess: vi.fn(),
  writeServiceState: vi.fn(),
}));

vi.mock('@clawket/bridge-runtime', () => ({
  BridgeRuntime: vi.fn(),
  configureOpenClawLanAccess: vi.fn(),
  resolveGatewayAuth: resolveGatewayAuthMock,
  resolveGatewayUrl: vi.fn(() => 'ws://127.0.0.1:18789'),
  restartOpenClawGateway: vi.fn(),
}));

describe('cli pairing output', () => {
  const originalArgv = process.argv.slice();
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.argv = ['node', 'clawket', 'refresh-code'];
    resolveGatewayAuthMock.mockReturnValue({ token: 'gateway-token', password: null });
    refreshAccessCodeMock.mockResolvedValue({
      config: {
        serverUrl: 'https://registry.example.com',
        gatewayId: 'gw_test_123',
        relaySecret: 'secret',
        relayUrl: 'wss://relay.example.com/ws',
        instanceId: 'inst_test',
        displayName: 'Lucy',
        createdAt: '2026-03-08T00:00:00.000Z',
        updatedAt: '2026-03-08T00:00:00.000Z',
      },
      accessCode: 'AB7K9Q',
      accessCodeExpiresAt: '2026-03-08T01:00:00.000Z',
      qrPayload: '{"v":2,"k":"cp","g":"gw_test_123","a":"AB7K9Q"}',
      action: 'refreshed',
    });
    writePairingQrPngMock.mockResolvedValue('/tmp/clawket-pair.png');
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.argv = originalArgv.slice();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('prints the standard refresh flow for alphanumeric access codes', async () => {
    await import('./index.js');

    await vi.waitFor(() => {
      expect(refreshAccessCodeMock).toHaveBeenCalledTimes(1);
    });

    expect(qrcodeGenerateMock).toHaveBeenCalledWith('{"v":2,"k":"cp","g":"gw_test_123","a":"AB7K9Q"}', { small: true });
    expect(consoleLogSpy).toHaveBeenCalledWith('Bridge already paired. Refreshed the pairing code.');
    expect(consoleLogSpy).toHaveBeenCalledWith('Gateway ID: gw_test_123');
    expect(consoleLogSpy).toHaveBeenCalledWith('QR image: /tmp/clawket-pair.png');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('requires an explicit registry server when pairing in a source checkout', async () => {
    process.argv = ['node', 'clawket', 'pair'];
    vi.stubEnv('CLAWKET_REGISTRY_URL', '');
    vi.stubEnv('CLAWKET_PACKAGE_DEFAULT_REGISTRY_URL', '');
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined as never));

    await import('./index.js');

    await vi.waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'No registry server configured. Pass --server https://registry.example.com or set CLAWKET_REGISTRY_URL.',
      );
    });
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(pairGatewayMock).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });
});
