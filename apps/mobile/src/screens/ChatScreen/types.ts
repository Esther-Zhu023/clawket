import { GatewayClient } from '../../services/gateway';
import { GatewayConfig } from '../../types';

export type ChatScreenProps = {
  gateway: GatewayClient;
  config: GatewayConfig | null;
  debugMode?: boolean;
  showAgentAvatar?: boolean;
  officeChatRequest?: {
    sessionKey: string;
    requestedAt: number;
    sourceRole?: string;
  } | null;
  clearOfficeChatRequest?: () => void;
};
