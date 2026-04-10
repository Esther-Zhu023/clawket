import {
  APP_FOREGROUND_PROBE_AWAY_MS,
  shouldProbeGatewayOnForegroundResume,
} from './foregroundReconnectPolicy';

describe('shouldProbeGatewayOnForegroundResume', () => {
  it('probes on iOS after any real background gap', () => {
    expect(shouldProbeGatewayOnForegroundResume({
      platformOs: 'ios',
      awayMs: 1_000,
      connectionState: 'ready',
    })).toBe(true);
  });

  it('keeps the old threshold for non-iOS ready transports', () => {
    expect(shouldProbeGatewayOnForegroundResume({
      platformOs: 'android',
      awayMs: APP_FOREGROUND_PROBE_AWAY_MS - 1,
      connectionState: 'ready',
    })).toBe(false);
  });

  it('still probes immediately when the transport is already not ready', () => {
    expect(shouldProbeGatewayOnForegroundResume({
      platformOs: 'android',
      awayMs: 500,
      connectionState: 'closed',
    })).toBe(true);
  });

  it('does not override pairing-pending recovery state', () => {
    expect(shouldProbeGatewayOnForegroundResume({
      platformOs: 'ios',
      awayMs: 5_000,
      connectionState: 'pairing_pending',
    })).toBe(false);
  });
});
