import { ConnectionState, GatewayConfig } from '../../../types';

type ConsoleHeaderRefreshStateInput = {
  config: GatewayConfig | null;
  connectionState: ConnectionState;
  refreshing: boolean;
};

export function isConsoleConnecting(connectionState: ConnectionState): boolean {
  return connectionState === 'connecting'
    || connectionState === 'challenging'
    || connectionState === 'reconnecting'
    || connectionState === 'pairing_pending';
}

export function getConsoleHeaderRefreshState(input: ConsoleHeaderRefreshStateInput): {
  disabled: boolean;
  spinning: boolean;
} {
  const hasActiveGatewayConfig = typeof input.config?.url === 'string' && input.config.url.trim().length > 0;
  const connecting = isConsoleConnecting(input.connectionState);

  return {
    disabled: !hasActiveGatewayConfig || input.refreshing || connecting,
    spinning: input.refreshing || connecting,
  };
}
