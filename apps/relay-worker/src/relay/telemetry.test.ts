import { describe, expect, it, vi } from 'vitest';
import { logRelayTelemetry } from './telemetry';

describe('relay telemetry', () => {
  it('keeps authSource while redacting sensitive identifiers and secrets', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logRelayTelemetry('relay_worker', 'ws_connected', {
      authSource: 'bearer',
      gatewayId: 'gw_sensitive',
      clientId: 'ios_sensitive',
      traceId: 'trace_sensitive',
      token: 'token_sensitive',
      secret: 'secret_sensitive',
    });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(consoleSpy.mock.calls[0][0])) as Record<string, unknown>;
    expect(payload).toMatchObject({
      scope: 'relay_worker',
      event: 'ws_connected',
      authSource: 'bearer',
    });
    expect(payload.gatewayId).toBeUndefined();
    expect(payload.clientId).toBeUndefined();
    expect(payload.traceId).toBeUndefined();
    expect(payload.token).toBeUndefined();
    expect(payload.secret).toBeUndefined();
  });
});
