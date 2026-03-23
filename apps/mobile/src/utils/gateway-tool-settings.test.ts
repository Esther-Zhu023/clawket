import { parseGatewayToolSettings, buildGatewayToolPatch, getGatewayDisabledToolIds, GatewayToolSettings } from './gateway-tool-settings';

describe('parseGatewayToolSettings', () => {
  it('returns defaults for null config', () => {
    const result = parseGatewayToolSettings(null);
    expect(result).toEqual({
      webSearchEnabled: true,
      webFetchEnabled: true,
      execSecurity: 'deny',
      execAsk: 'on-miss',
      mediaImageEnabled: true,
      mediaAudioEnabled: true,
      mediaVideoEnabled: true,
      linksEnabled: true,
    });
  });

  it('returns defaults for empty config', () => {
    const result = parseGatewayToolSettings({});
    expect(result).toEqual({
      webSearchEnabled: true,
      webFetchEnabled: true,
      execSecurity: 'deny',
      execAsk: 'on-miss',
      mediaImageEnabled: true,
      mediaAudioEnabled: true,
      mediaVideoEnabled: true,
      linksEnabled: true,
    });
  });

  it('returns defaults when tools is missing', () => {
    const result = parseGatewayToolSettings({ other: 123 });
    expect(result.webSearchEnabled).toBe(true);
    expect(result.execSecurity).toBe('deny');
  });

  it('parses full config correctly', () => {
    const config = {
      tools: {
        web: {
          search: { enabled: false },
          fetch: { enabled: false },
        },
        exec: {
          security: 'full',
          ask: 'always',
        },
        media: {
          image: { enabled: false },
          audio: { enabled: false },
          video: { enabled: false },
        },
        links: { enabled: false },
      },
    };
    const result = parseGatewayToolSettings(config);
    expect(result).toEqual({
      webSearchEnabled: false,
      webFetchEnabled: false,
      execSecurity: 'full',
      execAsk: 'always',
      mediaImageEnabled: false,
      mediaAudioEnabled: false,
      mediaVideoEnabled: false,
      linksEnabled: false,
    });
  });

  it('parses partial config with defaults for missing fields', () => {
    const config = {
      tools: {
        web: { search: { enabled: false } },
        exec: { security: 'allowlist' },
      },
    };
    const result = parseGatewayToolSettings(config);
    expect(result.webSearchEnabled).toBe(false);
    expect(result.webFetchEnabled).toBe(true);
    expect(result.execSecurity).toBe('allowlist');
    expect(result.execAsk).toBe('on-miss');
    expect(result.mediaImageEnabled).toBe(true);
    expect(result.linksEnabled).toBe(true);
  });

  it('falls back to default for invalid enum values', () => {
    const config = {
      tools: {
        exec: {
          security: 'invalid-value',
          ask: 42,
        },
      },
    };
    const result = parseGatewayToolSettings(config);
    expect(result.execSecurity).toBe('deny');
    expect(result.execAsk).toBe('on-miss');
  });

  it('falls back to default for non-boolean enabled values', () => {
    const config = {
      tools: {
        web: { search: { enabled: 'yes' } },
        links: { enabled: 1 },
      },
    };
    const result = parseGatewayToolSettings(config);
    expect(result.webSearchEnabled).toBe(true);
    expect(result.linksEnabled).toBe(true);
  });

  it('handles tools as non-object gracefully', () => {
    const result = parseGatewayToolSettings({ tools: 'not-an-object' });
    expect(result.webSearchEnabled).toBe(true);
    expect(result.execSecurity).toBe('deny');
  });
});

describe('buildGatewayToolPatch', () => {
  it('builds full patch structure', () => {
    const input: GatewayToolSettings = {
      webSearchEnabled: false,
      webFetchEnabled: true,
      execSecurity: 'allowlist',
      execAsk: 'always',
      mediaImageEnabled: true,
      mediaAudioEnabled: false,
      mediaVideoEnabled: true,
      linksEnabled: false,
    };
    const patch = buildGatewayToolPatch(input);
    expect(patch).toEqual({
      tools: {
        web: {
          search: { enabled: false },
          fetch: { enabled: true },
        },
        exec: {
          security: 'allowlist',
          ask: 'always',
        },
        media: {
          image: { enabled: true },
          audio: { enabled: false },
          video: { enabled: true },
        },
        links: { enabled: false },
      },
    });
  });

  it('builds patch with default values', () => {
    const input: GatewayToolSettings = {
      webSearchEnabled: true,
      webFetchEnabled: true,
      execSecurity: 'deny',
      execAsk: 'on-miss',
      mediaImageEnabled: true,
      mediaAudioEnabled: true,
      mediaVideoEnabled: true,
      linksEnabled: true,
    };
    const patch = buildGatewayToolPatch(input);
    const tools = patch.tools as Record<string, unknown>;
    const exec = tools.exec as Record<string, unknown>;
    expect(exec.security).toBe('deny');
    expect(exec.ask).toBe('on-miss');
  });
});

describe('getGatewayDisabledToolIds', () => {
  const allEnabled: GatewayToolSettings = {
    webSearchEnabled: true,
    webFetchEnabled: true,
    execSecurity: 'full',
    execAsk: 'on-miss',
    mediaImageEnabled: true,
    mediaAudioEnabled: true,
    mediaVideoEnabled: true,
    linksEnabled: true,
  };

  it('returns empty set when all capabilities are enabled', () => {
    expect(getGatewayDisabledToolIds(allEnabled).size).toBe(0);
  });

  it('returns empty set when exec is allowlist (not deny)', () => {
    const settings = { ...allEnabled, execSecurity: 'allowlist' as const };
    expect(getGatewayDisabledToolIds(settings).has('exec')).toBe(false);
    expect(getGatewayDisabledToolIds(settings).has('apply_patch')).toBe(false);
  });

  it('includes exec and apply_patch when exec security is deny', () => {
    const settings = { ...allEnabled, execSecurity: 'deny' as const };
    const ids = getGatewayDisabledToolIds(settings);
    expect(ids.has('exec')).toBe(true);
    expect(ids.has('apply_patch')).toBe(true);
  });

  it('includes web_search when disabled', () => {
    const ids = getGatewayDisabledToolIds({ ...allEnabled, webSearchEnabled: false });
    expect(ids.has('web_search')).toBe(true);
    expect(ids.has('web_fetch')).toBe(false);
  });

  it('includes web_fetch when disabled', () => {
    const ids = getGatewayDisabledToolIds({ ...allEnabled, webFetchEnabled: false });
    expect(ids.has('web_fetch')).toBe(true);
  });

  it('includes media tool ids when disabled', () => {
    const ids = getGatewayDisabledToolIds({
      ...allEnabled,
      mediaImageEnabled: false,
      mediaAudioEnabled: false,
      mediaVideoEnabled: false,
    });
    expect(ids.has('image')).toBe(true);
    expect(ids.has('audio')).toBe(true);
    expect(ids.has('video')).toBe(true);
  });

  it('includes links when disabled', () => {
    const ids = getGatewayDisabledToolIds({ ...allEnabled, linksEnabled: false });
    expect(ids.has('links')).toBe(true);
  });

  it('returns all tool ids when everything is disabled', () => {
    const allDisabled: GatewayToolSettings = {
      webSearchEnabled: false,
      webFetchEnabled: false,
      execSecurity: 'deny',
      execAsk: 'on-miss',
      mediaImageEnabled: false,
      mediaAudioEnabled: false,
      mediaVideoEnabled: false,
      linksEnabled: false,
    };
    const ids = getGatewayDisabledToolIds(allDisabled);
    expect(ids).toEqual(new Set(['web_search', 'web_fetch', 'exec', 'apply_patch', 'image', 'audio', 'video', 'links']));
  });
});
