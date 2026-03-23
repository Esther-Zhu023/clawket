import { GatewayClient } from '../../services/gateway';
import { GatewayConfig } from '../../types';

export type ConfigScreenProps = {
  gateway: GatewayClient;
  initialConfig: GatewayConfig | null;
  debugMode: boolean;
  onDebugToggle: (enabled: boolean) => void;
  onSaved: (config: GatewayConfig, nextGatewayScopeId?: string | null) => void;
  onReset: () => void;
};
