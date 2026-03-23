import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEVICE_BOOTSTRAP_TOKEN_TTL_MS,
  configureOpenClawLanAccess,
  getOpenClawBootstrapPath,
  getOpenClawConfigCandidates,
  getOpenClawConfigDir,
  getOpenClawConfigPath,
  getOpenClawMediaDir,
  getOpenClawStateDir,
  issueOpenClawBootstrapToken,
  readOpenClawInfo,
  restartOpenClawGateway,
  resolveGatewayAuth,
} from './openclaw.js';

const childProcessMock = vi.hoisted(() => ({
  execFile: vi.fn(),
}));

const fsMock = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

const fsPromisesMock = vi.hoisted(() => ({
  chmod: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  rename: vi.fn(),
  rm: vi.fn(),
  writeFile: vi.fn(),
}));

const osMock = vi.hoisted(() => ({
  homedir: vi.fn(() => '/Users/tester'),
}));

vi.mock('node:child_process', () => childProcessMock);
vi.mock('node:fs', () => fsMock);
vi.mock('node:fs/promises', () => fsPromisesMock);
vi.mock('node:os', () => osMock);

describe('openclaw auth resolution', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('prefers password when auth mode is password', () => {
    fsMock.existsSync.mockReturnValue(true);
    fsMock.readFileSync.mockReturnValue(JSON.stringify({
      gateway: {
        port: 18789,
        auth: {
          mode: 'password',
          token: 'legacy-token',
          password: 'gateway-password',
        },
      },
    }));

    expect(readOpenClawInfo()).toMatchObject({
      authMode: 'password',
      token: 'legacy-token',
      password: 'gateway-password',
    });
    expect(resolveGatewayAuth()).toEqual({
      token: null,
      password: 'gateway-password',
      label: 'password',
    });
  });

  it('returns an explicit error when both token and password exist without mode', () => {
    fsMock.existsSync.mockReturnValue(true);
    fsMock.readFileSync.mockReturnValue(JSON.stringify({
      gateway: {
        auth: {
          token: 'gateway-token',
          password: 'gateway-password',
        },
      },
    }));

    expect(resolveGatewayAuth()).toMatchObject({
      token: 'gateway-token',
      password: 'gateway-password',
      error: expect.stringContaining('gateway.auth.mode is unset'),
    });
  });

  it('falls back to env-provided password when config is absent', () => {
    fsMock.existsSync.mockReturnValue(false);
    vi.stubEnv('OPENCLAW_GATEWAY_PASSWORD', 'password-from-env');

    expect(resolveGatewayAuth()).toEqual({
      token: null,
      password: 'password-from-env',
      label: 'password',
    });
  });

  it('falls back to /root/.openclaw when the user home config is absent', () => {
    fsMock.existsSync.mockImplementation((path) => path === '/root/.openclaw/openclaw.json');
    fsMock.readFileSync.mockReturnValue(JSON.stringify({
      gateway: {
        port: 28789,
        auth: {
          token: 'root-token',
        },
      },
    }));

    expect(readOpenClawInfo()).toMatchObject({
      configFound: true,
      gatewayPort: 28789,
      token: 'root-token',
    });
    expect(getOpenClawConfigDir()).toBe('/root/.openclaw');
    expect(getOpenClawConfigPath()).toBe('/root/.openclaw/openclaw.json');
    expect(getOpenClawStateDir()).toBe('/root/.openclaw');
    expect(getOpenClawMediaDir()).toBe('/root/.openclaw/media');
  });

  it('reports both user and root config candidates without duplicates', () => {
    expect(getOpenClawConfigCandidates()).toEqual([
      '/Users/tester/.openclaw',
      '/root/.openclaw',
    ]);
  });

  it('does not let OPENCLAW_CONFIG_PATH override the bootstrap state dir', () => {
    vi.stubEnv('OPENCLAW_CONFIG_PATH', '/opt/openclaw/custom/openclaw.json');
    fsMock.existsSync.mockImplementation((path) => path === '/opt/openclaw/custom/openclaw.json');
    fsMock.readFileSync.mockReturnValue(JSON.stringify({
      gateway: {
        port: 28789,
      },
    }));

    expect(readOpenClawInfo()).toMatchObject({
      configFound: true,
      gatewayPort: 28789,
    });
    expect(getOpenClawConfigDir()).toBe('/opt/openclaw/custom');
    expect(getOpenClawStateDir()).toBe('/Users/tester/.openclaw');
    expect(getOpenClawBootstrapPath()).toBe('/Users/tester/.openclaw/devices/bootstrap.json');
  });

  it('uses OPENCLAW_STATE_DIR as the bootstrap state root when provided', () => {
    vi.stubEnv('OPENCLAW_STATE_DIR', '/srv/openclaw-state');
    fsMock.existsSync.mockReturnValue(false);

    expect(getOpenClawStateDir()).toBe('/srv/openclaw-state');
    expect(getOpenClawBootstrapPath()).toBe('/srv/openclaw-state/devices/bootstrap.json');
  });

  it('writes bound bootstrap tokens to the active state dir and prunes expired entries', async () => {
    const disk = new Map<string, string>();
    const bootstrapPath = '/root/.openclaw/devices/bootstrap.json';
    const nowMs = 1_700_000_000_000;
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(nowMs);

    fsMock.existsSync.mockImplementation((path) => path === '/root/.openclaw/openclaw.json');
    fsMock.readFileSync.mockReturnValue(JSON.stringify({
      gateway: {
        port: 28789,
        auth: {
          token: 'root-token',
        },
      },
    }));

    disk.set(bootstrapPath, JSON.stringify({
      expired: {
        token: 'expired',
        ts: nowMs - DEVICE_BOOTSTRAP_TOKEN_TTL_MS - 1,
        deviceId: 'old-device',
        publicKey: 'old-public-key',
        roles: ['operator'],
        scopes: ['operator.read'],
        issuedAtMs: nowMs - DEVICE_BOOTSTRAP_TOKEN_TTL_MS - 1,
      },
    }));

    fsPromisesMock.readFile.mockImplementation(async (path) => {
      const key = String(path);
      const existing = disk.get(key);
      if (existing == null) {
        throw new Error('ENOENT');
      }
      return existing;
    });
    fsPromisesMock.writeFile.mockImplementation(async (path, content) => {
      disk.set(String(path), String(content));
    });
    fsPromisesMock.rename.mockImplementation(async (from, to) => {
      const content = disk.get(String(from));
      if (content == null) {
        throw new Error('ENOENT');
      }
      disk.set(String(to), content);
      disk.delete(String(from));
    });
    fsPromisesMock.rm.mockImplementation(async (path) => {
      disk.delete(String(path));
    });
    fsPromisesMock.mkdir.mockResolvedValue(undefined);
    fsPromisesMock.chmod.mockResolvedValue(undefined);

    const issued = await issueOpenClawBootstrapToken({
      deviceId: 'device-1',
      publicKey: 'public-key-1',
      role: 'operator',
      scopes: ['operator.write', 'operator.read', 'operator.read'],
    });

    const persisted = JSON.parse(disk.get(bootstrapPath) ?? '{}') as Record<string, {
      token: string;
      ts: number;
      deviceId?: string;
      publicKey?: string;
      roles?: string[];
      scopes?: string[];
      issuedAtMs: number;
    }>;

    expect(issued.statePath).toBe(bootstrapPath);
    expect(issued.expiresAtMs).toBe(nowMs + DEVICE_BOOTSTRAP_TOKEN_TTL_MS);
    expect(Object.keys(persisted)).toHaveLength(1);
    expect(persisted[issued.token]).toEqual({
      token: issued.token,
      ts: nowMs,
      deviceId: 'device-1',
      publicKey: 'public-key-1',
      roles: ['operator'],
      scopes: ['operator.read', 'operator.write'],
      issuedAtMs: nowMs,
    });

    expect(fsPromisesMock.rename).toHaveBeenCalledOnce();
    dateNowSpy.mockRestore();
  });

  it('configures LAN bind/origin against the active root-owned config', async () => {
    const calls: Array<{ command: string; args: string[]; env: NodeJS.ProcessEnv }> = [];
    fsMock.existsSync.mockImplementation((path) => path === '/root/.openclaw/openclaw.json');
    childProcessMock.execFile.mockImplementation((command, args, options, callback) => {
      calls.push({
        command: String(command),
        args: (args as string[]).slice(),
        env: (options as { env: NodeJS.ProcessEnv }).env,
      });
      const joined = (args as string[]).join(' ');
      if (joined === 'config get gateway.bind') {
        callback(null, 'loopback\n', '');
        return;
      }
      if (joined === 'config get gateway.controlUi.allowedOrigins --json') {
        callback(null, '["http://127.0.0.1:18789"]\n', '');
        return;
      }
      if (joined === 'config set gateway.bind lan') {
        callback(null, 'Updated gateway.bind. Restart the gateway to apply.\n', '');
        return;
      }
      if (
        joined === 'config set gateway.controlUi.allowedOrigins ["http://127.0.0.1:18789","http://192.168.1.12:18789"] --strict-json'
      ) {
        callback(null, 'Updated gateway.controlUi.allowedOrigins. Restart the gateway to apply.\n', '');
        return;
      }
      callback(new Error(`Unexpected command: ${joined}`), '', '');
    });

    const result = await configureOpenClawLanAccess({
      controlUiOrigin: 'http://192.168.1.12:18789',
    });

    expect(result).toEqual({
      configPath: '/root/.openclaw/openclaw.json',
      bindChanged: true,
      allowedOriginAdded: true,
      allowedOrigins: ['http://127.0.0.1:18789', 'http://192.168.1.12:18789'],
      controlUiOrigin: 'http://192.168.1.12:18789',
    });
    expect(calls).toHaveLength(4);
    expect(calls.every((call) => call.command === 'openclaw')).toBe(true);
    expect(calls.every((call) => call.env.OPENCLAW_STATE_DIR === '/root/.openclaw')).toBe(true);
    expect(calls.every((call) => call.env.OPENCLAW_CONFIG_PATH === '/root/.openclaw/openclaw.json')).toBe(true);
  });

  it('reuses an existing allowed origin without rewriting config', async () => {
    fsMock.existsSync.mockImplementation((path) => path === '/Users/tester/.openclaw/openclaw.json');
    childProcessMock.execFile.mockImplementation((_command, args, _options, callback) => {
      const joined = (args as string[]).join(' ');
      if (joined === 'config get gateway.bind') {
        callback(null, 'lan\n', '');
        return;
      }
      if (joined === 'config get gateway.controlUi.allowedOrigins --json') {
        callback(null, '["http://192.168.1.12:18789"]\n[plugins] noisy suffix\n', '');
        return;
      }
      callback(new Error(`Unexpected command: ${joined}`), '', '');
    });

    const result = await configureOpenClawLanAccess({
      controlUiOrigin: 'http://192.168.1.12:18789',
    });

    expect(result.bindChanged).toBe(false);
    expect(result.allowedOriginAdded).toBe(false);
    expect(childProcessMock.execFile).toHaveBeenCalledTimes(2);
  });

  it('treats missing gateway.bind and allowedOrigins as unset config paths', async () => {
    const calls: string[] = [];
    fsMock.existsSync.mockImplementation((path) => path === '/Users/tester/.openclaw/openclaw.json');
    childProcessMock.execFile.mockImplementation((_command, args, _options, callback) => {
      const joined = (args as string[]).join(' ');
      calls.push(joined);
      if (joined === 'config get gateway.bind') {
        const error = new Error('exit 1') as Error & { code?: number };
        error.code = 1;
        callback(error, 'Config path not found: gateway.bind\n', '');
        return;
      }
      if (joined === 'config get gateway.controlUi.allowedOrigins --json') {
        const error = new Error('exit 1') as Error & { code?: number };
        error.code = 1;
        callback(error, 'Config path not found: gateway.controlUi.allowedOrigins\n', '');
        return;
      }
      if (joined === 'config set gateway.bind lan') {
        callback(null, 'Updated gateway.bind. Restart the gateway to apply.\n', '');
        return;
      }
      if (joined === 'config set gateway.controlUi.allowedOrigins ["http://192.168.1.12:18789"] --strict-json') {
        callback(null, 'Updated gateway.controlUi.allowedOrigins. Restart the gateway to apply.\n', '');
        return;
      }
      callback(new Error(`Unexpected command: ${joined}`), '', '');
    });

    const result = await configureOpenClawLanAccess({
      controlUiOrigin: 'http://192.168.1.12:18789',
    });

    expect(result.bindChanged).toBe(true);
    expect(result.allowedOriginAdded).toBe(true);
    expect(result.allowedOrigins).toEqual(['http://192.168.1.12:18789']);
    expect(calls).toEqual([
      'config get gateway.bind',
      'config get gateway.controlUi.allowedOrigins --json',
      'config set gateway.bind lan',
      'config set gateway.controlUi.allowedOrigins ["http://192.168.1.12:18789"] --strict-json',
    ]);
  });

  it('starts the gateway when restart reports service not loaded', async () => {
    fsMock.existsSync.mockImplementation((path) => path === '/Users/tester/.openclaw/openclaw.json');
    childProcessMock.execFile.mockImplementation((_command, args, _options, callback) => {
      const joined = (args as string[]).join(' ');
      if (joined === 'gateway restart --json') {
        callback(null, [
          '[plugins] noisy startup log',
          JSON.stringify({
            ok: true,
            action: 'restart',
            result: 'not-loaded',
            message: 'Gateway service is not loaded.',
          }, null, 2),
        ].join('\n'), '');
        return;
      }
      if (joined === 'gateway start --json') {
        callback(null, JSON.stringify({
          ok: true,
          action: 'start',
          result: 'started',
          message: 'Gateway started.',
        }), '');
        return;
      }
      callback(new Error(`Unexpected command: ${joined}`), '', '');
    });

    await expect(restartOpenClawGateway()).resolves.toEqual({
      action: 'started',
      result: 'started',
      message: 'Gateway started.',
      warnings: [],
    });
  });
});
