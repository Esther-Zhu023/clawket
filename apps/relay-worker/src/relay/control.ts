import {
  CONTROL_PREFIX,
  SOCKET_CLOSE_CODES,
  type RelayControlEnvelope,
  type SocketAttachment,
} from './types';
import { logRelayTelemetry } from './telemetry';
import type { RelayRuntime } from './runtime';

export function replaceGateway(runtime: RelayRuntime, nextGateway: WebSocket): void {
  if (runtime.gatewaySocket
    && runtime.gatewaySocket !== nextGateway
    && runtime.gatewaySocket.readyState === WebSocket.OPEN) {
    runtime.pendingChallenge = null;
    runtime.gatewaySocket.close(SOCKET_CLOSE_CODES.REPLACED_BY_NEW_GATEWAY, 'replaced_by_new_gateway');
  }
  runtime.gatewaySocket = nextGateway;
}

export function parseControlEnvelope(text: string): RelayControlEnvelope | null {
  if (!text.startsWith(CONTROL_PREFIX)) return null;
  try {
    const parsed = JSON.parse(text.slice(CONTROL_PREFIX.length));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as RelayControlEnvelope;
  } catch {
    return null;
  }
}

export function serializeControlEnvelope(envelope: RelayControlEnvelope): string {
  return `${CONTROL_PREFIX}${JSON.stringify(envelope)}`;
}

function normalizeControlEvent(envelope: RelayControlEnvelope): string | null {
  return typeof envelope.event === 'string' && envelope.event.trim()
    ? envelope.event.trim()
    : null;
}

export function sendControlToGateway(
  runtime: RelayRuntime,
  event: string,
  payload?: Record<string, unknown>,
): void {
  if (!runtime.gatewaySocket || runtime.gatewaySocket.readyState !== WebSocket.OPEN) return;
  runtime.gatewaySocket.send(serializeControlEnvelope({
    type: 'control',
    event,
    ...(payload ?? {}),
  }));
  logRelayTelemetry('relay_worker', 'control_sent', {
    controlEvent: event,
    count: payload?.count,
    clientCount: runtime.clients.size,
  });
}

export function logControlRoutingTelemetry(
  runtime: RelayRuntime,
  event: string,
  attachment: SocketAttachment,
  envelope: RelayControlEnvelope,
  extra: Record<string, unknown> = {},
): void {
  logRelayTelemetry('relay_worker', event, {
    role: attachment.role,
    controlEvent: normalizeControlEvent(envelope),
    hasSourceClient: typeof envelope.sourceClientId === 'string' && envelope.sourceClientId.trim().length > 0,
    hasTargetClient: typeof envelope.targetClientId === 'string' && envelope.targetClientId.trim().length > 0,
    clientCount: runtime.clients.size,
    ...extra,
  });
}
