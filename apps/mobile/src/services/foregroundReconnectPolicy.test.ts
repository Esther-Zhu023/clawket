import {
  APP_FOREGROUND_RECONNECT_AWAY_MS,
  shouldReconnectGatewayOnForegroundResume,
} from './foregroundReconnectPolicy';

describe('shouldReconnectGatewayOnForegroundResume', () => {
  it('forces reconnect on iOS after any real background gap', () => {
    expect(shouldReconnectGatewayOnForegroundResume({
      platformOs: 'ios',
      awayMs: 1_000,
      connectionState: 'ready',
    })).toBe(true);
  });

  it('keeps the old threshold for non-iOS ready transports', () => {
    expect(shouldReconnectGatewayOnForegroundResume({
      platformOs: 'android',
      awayMs: APP_FOREGROUND_RECONNECT_AWAY_MS - 1,
      connectionState: 'ready',
    })).toBe(false);
  });

  it('still reconnects immediately when the transport is already not ready', () => {
    expect(shouldReconnectGatewayOnForegroundResume({
      platformOs: 'android',
      awayMs: 500,
      connectionState: 'closed',
    })).toBe(true);
  });

  it('does not override pairing-pending recovery state', () => {
    expect(shouldReconnectGatewayOnForegroundResume({
      platformOs: 'ios',
      awayMs: 5_000,
      connectionState: 'pairing_pending',
    })).toBe(false);
  });
});
