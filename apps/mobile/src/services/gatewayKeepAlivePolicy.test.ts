import { shouldRunGatewayKeepAlive } from './gatewayKeepAlivePolicy';

describe('shouldRunGatewayKeepAlive', () => {
  it('runs only when app is active and transport is ready', () => {
    expect(shouldRunGatewayKeepAlive('ready', 'active')).toBe(true);
    expect(shouldRunGatewayKeepAlive('connecting', 'active')).toBe(false);
    expect(shouldRunGatewayKeepAlive('reconnecting', 'active')).toBe(false);
    expect(shouldRunGatewayKeepAlive('challenging', 'active')).toBe(false);
    expect(shouldRunGatewayKeepAlive('pairing_pending', 'active')).toBe(false);
    expect(shouldRunGatewayKeepAlive('ready', 'inactive')).toBe(false);
    expect(shouldRunGatewayKeepAlive('ready', 'background')).toBe(false);
  });
});
