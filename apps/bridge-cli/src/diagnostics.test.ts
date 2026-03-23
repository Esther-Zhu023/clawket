import { describe, expect, it } from 'vitest';
import { listPairPrerequisiteFailures } from './diagnostics.js';
import { parseLookbackToMs } from './log-parse.js';

describe('diagnostics helpers', () => {
  it('parses lookback durations', () => {
    expect(parseLookbackToMs('30s')).toBe(30_000);
    expect(parseLookbackToMs('2m')).toBe(120_000);
    expect(parseLookbackToMs('1h')).toBe(3_600_000);
    expect(parseLookbackToMs('1d')).toBe(86_400_000);
    expect(parseLookbackToMs()).toBeNull();
  });

  it('rejects invalid lookback durations', () => {
    expect(() => parseLookbackToMs('2 minutes')).toThrow(/Invalid --last value/);
    expect(() => parseLookbackToMs('abc')).toThrow(/Invalid --last value/);
  });

  it('reports missing OpenClaw prerequisites before pairing', () => {
    expect(listPairPrerequisiteFailures({
      openclawConfigFound: false,
      openclawAuthMode: null,
      openclawTokenFound: false,
      openclawPasswordFound: false,
      localGatewayUrl: 'ws://127.0.0.1:18789',
      localGatewayReachable: false,
    })).toEqual([
      `OpenClaw config was not found under ${process.env.HOME}/.openclaw or /root/.openclaw.`,
      'OpenClaw gateway auth is missing (token or password).',
      'Local OpenClaw Gateway is not reachable at ws://127.0.0.1:18789.',
    ]);
  });

  it('accepts pairing when OpenClaw prerequisites are ready', () => {
    expect(listPairPrerequisiteFailures({
      openclawConfigFound: true,
      openclawAuthMode: 'token',
      openclawTokenFound: true,
      openclawPasswordFound: false,
      localGatewayUrl: 'ws://127.0.0.1:18789',
      localGatewayReachable: true,
    })).toEqual([]);
  });

  it('accepts password-based pairing when password auth is configured', () => {
    expect(listPairPrerequisiteFailures({
      openclawConfigFound: true,
      openclawAuthMode: 'password',
      openclawTokenFound: false,
      openclawPasswordFound: true,
      localGatewayUrl: 'ws://127.0.0.1:18789',
      localGatewayReachable: true,
    })).toEqual([]);
  });

  it('fails fast when both token and password exist without explicit auth mode', () => {
    expect(listPairPrerequisiteFailures({
      openclawConfigFound: true,
      openclawAuthMode: null,
      openclawTokenFound: true,
      openclawPasswordFound: true,
      localGatewayUrl: 'ws://127.0.0.1:18789',
      localGatewayReachable: true,
    })).toEqual([
      'OpenClaw has both gateway token and password configured, but gateway.auth.mode is unset.',
    ]);
  });
});
