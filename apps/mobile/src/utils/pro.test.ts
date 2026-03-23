import {
  DEFAULT_FREE_AGENT_ID,
  SETTINGS_MEMBERSHIP_PREVIEW_FEATURE,
  canAddAgent,
  canAddGatewayConnection,
  canUseAgent,
  normalizeAccessibleAgentId,
  resolvePreviewPaywallFeature,
  resolveProAccessEnabled,
} from './pro';

describe('resolveProAccessEnabled', () => {
  it('returns true when RevenueCat is not configured for the build', () => {
    expect(resolveProAccessEnabled(undefined, {} as NodeJS.ProcessEnv)).toBe(true);
  });

  it('returns true for supported truthy flags', () => {
    const env = {
      EXPO_PUBLIC_REVENUECAT_ENABLED: 'true',
      EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY: 'appl_test',
      EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID: 'pro',
    } as unknown as NodeJS.ProcessEnv;
    expect(resolveProAccessEnabled('1', env)).toBe(true);
    expect(resolveProAccessEnabled('true', env)).toBe(true);
    expect(resolveProAccessEnabled('YES', env)).toBe(true);
  });

  it('returns false for missing or falsy values when RevenueCat is configured', () => {
    const env = {
      EXPO_PUBLIC_REVENUECAT_ENABLED: 'true',
      EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY: 'appl_test',
      EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID: 'pro',
    } as unknown as NodeJS.ProcessEnv;
    expect(resolveProAccessEnabled(undefined, env)).toBe(false);
    expect(resolveProAccessEnabled('0', env)).toBe(false);
    expect(resolveProAccessEnabled('false', env)).toBe(false);
  });
});

describe('canAddGatewayConnection', () => {
  it('allows the first gateway for free users', () => {
    expect(canAddGatewayConnection(0, false)).toBe(true);
  });

  it('blocks extra gateways for free users', () => {
    expect(canAddGatewayConnection(1, false)).toBe(false);
    expect(canAddGatewayConnection(3, false)).toBe(false);
  });

  it('allows unlimited gateways for pro users', () => {
    expect(canAddGatewayConnection(5, true)).toBe(true);
  });
});

describe('canAddAgent', () => {
  it('allows up to two agents for free users', () => {
    expect(canAddAgent(0, false)).toBe(true);
    expect(canAddAgent(1, false)).toBe(true);
  });

  it('blocks the third agent for free users', () => {
    expect(canAddAgent(2, false)).toBe(false);
    expect(canAddAgent(3, false)).toBe(false);
  });

  it('allows unlimited agents for pro users', () => {
    expect(canAddAgent(5, true)).toBe(true);
  });
});

describe('canUseAgent', () => {
  it('allows the default agent for free users', () => {
    expect(canUseAgent(DEFAULT_FREE_AGENT_ID, false)).toBe(true);
  });

  it('allows non-default agents for free users', () => {
    expect(canUseAgent('researcher', false)).toBe(true);
  });

  it('allows all agents for pro users', () => {
    expect(canUseAgent('researcher', true)).toBe(true);
  });
});

describe('resolvePreviewPaywallFeature', () => {
  it('returns the stable blocked feature for settings membership preview paywalls', () => {
    expect(resolvePreviewPaywallFeature()).toBe('settingsMembershipPreview');
    expect(resolvePreviewPaywallFeature()).toBe(SETTINGS_MEMBERSHIP_PREVIEW_FEATURE);
  });
});

describe('normalizeAccessibleAgentId', () => {
  it('falls back to the default free agent when empty', () => {
    expect(normalizeAccessibleAgentId(null, false)).toBe(DEFAULT_FREE_AGENT_ID);
    expect(normalizeAccessibleAgentId('', false)).toBe(DEFAULT_FREE_AGENT_ID);
  });

  it('preserves non-default agents for free users', () => {
    expect(normalizeAccessibleAgentId('researcher', false)).toBe('researcher');
  });

  it('preserves allowed agents', () => {
    expect(normalizeAccessibleAgentId(DEFAULT_FREE_AGENT_ID, false)).toBe(DEFAULT_FREE_AGENT_ID);
    expect(normalizeAccessibleAgentId('researcher', true)).toBe('researcher');
  });
});
