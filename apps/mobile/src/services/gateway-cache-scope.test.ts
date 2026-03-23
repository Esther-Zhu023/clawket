import { resolveGatewayCacheScopeId } from './gateway-cache-scope';

describe('resolveGatewayCacheScopeId', () => {
  it('prefers the saved config id when available', () => {
    expect(resolveGatewayCacheScopeId({
      activeConfigId: 'gateway_123',
      config: {
        url: 'https://example.com',
        token: 'secret-a',
      },
    })).toBe('cfg:gateway_123');
  });

  it('falls back to a deterministic runtime fingerprint', () => {
    const first = resolveGatewayCacheScopeId({
      config: {
        url: 'https://example.com/',
        token: 'secret-a',
        mode: 'custom',
      },
    });
    const second = resolveGatewayCacheScopeId({
      config: {
        url: 'https://example.com',
        token: 'secret-a',
        mode: 'custom',
      },
    });

    expect(first).toBe(second);
    expect(first.startsWith('runtime:')).toBe(true);
  });

  it('separates configs that share a URL but use different credentials', () => {
    const tokenScope = resolveGatewayCacheScopeId({
      config: {
        url: 'https://example.com',
        token: 'secret-a',
      },
    });
    const passwordScope = resolveGatewayCacheScopeId({
      config: {
        url: 'https://example.com',
        password: 'secret-b',
      },
    });

    expect(tokenScope).not.toBe(passwordScope);
  });
});
