import type { AppStateStatus } from 'react-native';
import type { ConnectionState } from '../types';

export function shouldRunGatewayKeepAlive(connectionState: ConnectionState, appState: AppStateStatus): boolean {
  return connectionState === 'ready' && appState === 'active';
}
