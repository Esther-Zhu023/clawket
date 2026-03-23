import { getConsoleHeaderRefreshState, isConsoleConnecting } from './consoleHeaderRefreshPolicy';

describe('consoleHeaderRefreshPolicy', () => {
  it('treats reconnect-related states as connecting', () => {
    expect(isConsoleConnecting('connecting')).toBe(true);
    expect(isConsoleConnecting('challenging')).toBe(true);
    expect(isConsoleConnecting('reconnecting')).toBe(true);
    expect(isConsoleConnecting('pairing_pending')).toBe(true);
    expect(isConsoleConnecting('ready')).toBe(false);
    expect(isConsoleConnecting('closed')).toBe(false);
  });

  it('disables and spins while the gateway is reconnecting', () => {
    expect(getConsoleHeaderRefreshState({
      config: { url: 'wss://example.com' },
      connectionState: 'reconnecting',
      refreshing: false,
    })).toEqual({
      disabled: true,
      spinning: true,
    });
  });

  it('disables and spins during a manual refresh', () => {
    expect(getConsoleHeaderRefreshState({
      config: { url: 'wss://example.com' },
      connectionState: 'ready',
      refreshing: true,
    })).toEqual({
      disabled: true,
      spinning: true,
    });
  });

  it('keeps the button idle when the console is ready', () => {
    expect(getConsoleHeaderRefreshState({
      config: { url: 'wss://example.com' },
      connectionState: 'ready',
      refreshing: false,
    })).toEqual({
      disabled: false,
      spinning: false,
    });
  });

  it('disables without spinning when no gateway is configured', () => {
    expect(getConsoleHeaderRefreshState({
      config: null,
      connectionState: 'idle',
      refreshing: false,
    })).toEqual({
      disabled: true,
      spinning: false,
    });
  });
});
