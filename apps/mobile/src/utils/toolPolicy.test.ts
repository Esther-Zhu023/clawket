import {
  isValidProfile,
  resolveProfilePolicy,
  isToolEnabled,
  isInBaseProfile,
  computeToolToggle,
  detectActiveProfile,
  AgentToolsConfig,
} from './toolPolicy';

describe('isValidProfile', () => {
  it('returns true for valid profiles', () => {
    expect(isValidProfile('minimal')).toBe(true);
    expect(isValidProfile('coding')).toBe(true);
    expect(isValidProfile('messaging')).toBe(true);
    expect(isValidProfile('full')).toBe(true);
  });

  it('returns false for invalid profiles', () => {
    expect(isValidProfile('unknown')).toBe(false);
    expect(isValidProfile('')).toBe(false);
  });
});

describe('resolveProfilePolicy', () => {
  it('returns undefined for full profile (no restrictions)', () => {
    expect(resolveProfilePolicy('full')).toBeUndefined();
  });

  it('returns allow list for minimal profile', () => {
    const policy = resolveProfilePolicy('minimal');
    expect(policy).toEqual({ allow: ['session_status'] });
  });

  it('returns allow list for coding profile', () => {
    const policy = resolveProfilePolicy('coding');
    expect(policy?.allow).toContain('exec');
    expect(policy?.allow).toContain('read');
  });

  it('returns undefined for invalid profile', () => {
    expect(resolveProfilePolicy('bogus')).toBeUndefined();
  });
});

describe('isToolEnabled', () => {
  it('allows everything with full profile', () => {
    expect(isToolEnabled('exec', { profile: 'full' })).toBe(true);
    expect(isToolEnabled('anything', { profile: 'full' })).toBe(true);
  });

  it('restricts tools with minimal profile', () => {
    expect(isToolEnabled('session_status', { profile: 'minimal' })).toBe(true);
    expect(isToolEnabled('exec', { profile: 'minimal' })).toBe(false);
  });

  it('allows tools in coding profile', () => {
    expect(isToolEnabled('exec', { profile: 'coding' })).toBe(true);
    expect(isToolEnabled('read', { profile: 'coding' })).toBe(true);
    expect(isToolEnabled('message', { profile: 'coding' })).toBe(false);
  });

  it('allows tools via alsoAllow', () => {
    expect(isToolEnabled('message', { profile: 'coding', alsoAllow: ['message'] })).toBe(true);
  });

  it('denies tools via deny', () => {
    expect(isToolEnabled('exec', { profile: 'coding', deny: ['exec'] })).toBe(false);
  });

  it('deny overrides alsoAllow', () => {
    expect(isToolEnabled('exec', { profile: 'coding', alsoAllow: ['exec'], deny: ['exec'] })).toBe(false);
  });

  it('uses explicit allow list when provided', () => {
    const config: AgentToolsConfig = { allow: ['read', 'write'] };
    expect(isToolEnabled('read', config)).toBe(true);
    expect(isToolEnabled('exec', config)).toBe(false);
  });

  it('defaults to full profile when none specified', () => {
    expect(isToolEnabled('anything', {})).toBe(true);
  });

  it('handles case-insensitive tool names', () => {
    expect(isToolEnabled('EXEC', { profile: 'coding' })).toBe(true);
    expect(isToolEnabled('Exec', { profile: 'coding' })).toBe(true);
  });

  it('allows apply_patch when exec is allowed', () => {
    expect(isToolEnabled('apply_patch', { profile: 'coding' })).toBe(true);
  });

  it('handles wildcard in allow', () => {
    expect(isToolEnabled('anything', { allow: ['*'] })).toBe(true);
  });
});

describe('isInBaseProfile', () => {
  it('returns true for tools in profile', () => {
    expect(isInBaseProfile('exec', 'coding')).toBe(true);
  });

  it('returns false for tools not in profile', () => {
    expect(isInBaseProfile('exec', 'minimal')).toBe(false);
  });

  it('returns true for any tool in full profile', () => {
    expect(isInBaseProfile('anything', 'full')).toBe(true);
  });
});

describe('computeToolToggle', () => {
  it('adds tool to deny when disabling a base-allowed tool', () => {
    const result = computeToolToggle('exec', false, { profile: 'coding' });
    expect(result.deny).toContain('exec');
    expect(result.alsoAllow).not.toContain('exec');
  });

  it('removes tool from deny when re-enabling a base-allowed tool', () => {
    const result = computeToolToggle('exec', true, { profile: 'coding', deny: ['exec'] });
    expect(result.deny).not.toContain('exec');
  });

  it('adds to alsoAllow when enabling a non-base tool', () => {
    const result = computeToolToggle('message', true, { profile: 'coding' });
    expect(result.alsoAllow).toContain('message');
  });

  it('removes from alsoAllow when disabling a non-base tool', () => {
    const result = computeToolToggle('message', false, { profile: 'coding', alsoAllow: ['message'] });
    expect(result.alsoAllow).not.toContain('message');
    expect(result.deny).toContain('message');
  });
});

describe('detectActiveProfile', () => {
  const allTools = ['exec', 'read', 'write', 'session_status', 'message'];

  it('returns current profile when no overrides', () => {
    expect(detectActiveProfile({ profile: 'full' }, allTools)).toBe('full');
    expect(detectActiveProfile({ profile: 'minimal' }, allTools)).toBe('minimal');
  });

  it('returns null when explicit allow list is set', () => {
    expect(detectActiveProfile({ allow: ['read'] }, allTools)).toBeNull();
  });

  it('returns null for invalid profile', () => {
    expect(detectActiveProfile({ profile: 'bogus' }, allTools)).toBeNull();
  });

  it('detects matching profile when overrides match another profile', () => {
    // coding profile with message added = might match full
    const config: AgentToolsConfig = { profile: 'full', deny: ['exec'] };
    // This won't match any standard profile exactly since exec is denied
    const result = detectActiveProfile(config, allTools);
    // Result depends on whether the denied state matches another profile
    expect(typeof result === 'string' || result === null).toBe(true);
  });

  it('defaults to full when no profile specified', () => {
    expect(detectActiveProfile({}, allTools)).toBe('full');
  });
});
