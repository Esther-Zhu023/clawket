import type { MutableRefObject } from 'react';
import type { GatewayClient } from '../services/gateway';
import { resolveGatewayCacheScopeId } from '../services/gateway-cache-scope';
import { RelayPairingService } from '../services/relay-pairing';
import { StorageService } from '../services/storage';
import type { GatewayConfig, GatewayConfigsState, GatewayMode, SavedGatewayConfig } from '../types';
import { buildRelayClaimKey } from './gatewayConfigForm.utils';

export const MIN_SWITCH_DURATION_MS = 1000;

export type GatewayScanPayload = {
  url: string;
  token?: string;
  password?: string;
  mode?: GatewayMode;
  relay?: {
    serverUrl: string;
    gatewayId: string;
    accessCode?: string;
    clientToken?: string;
    relayUrl?: string;
    displayName?: string;
    protocolVersion?: number;
    supportsBootstrap?: boolean;
  };
};

export function buildDefaultName(mode: GatewayMode, url: string, index: number): string {
  const host = parseHost(url);
  const modeLabel = mode === 'relay' ? 'Relay' : 'Custom';
  if (host) return `${modeLabel} (${host})`;
  return `${modeLabel} Gateway ${index}`;
}

export function toRuntimeConfig(item: SavedGatewayConfig, debugMode: boolean): GatewayConfig {
  return {
    url: item.url,
    token: item.token,
    password: item.password,
    mode: item.mode,
    relay: item.relay,
    debugMode,
  };
}

export async function claimRelayPairing(
  payload: GatewayScanPayload,
  inFlightRef: MutableRefObject<Map<string, Promise<GatewayScanPayload>>>,
): Promise<GatewayScanPayload> {
  if (!payload.relay?.accessCode) return payload;
  const claimKey = buildRelayClaimKey(
    payload.relay.serverUrl,
    payload.relay.gatewayId,
    payload.relay.accessCode,
  );
  const existing = inFlightRef.current.get(claimKey);
  if (existing) return existing;

  const task = (async (): Promise<GatewayScanPayload> => {
    const claimed = await RelayPairingService.claim({
      serverUrl: payload.relay!.serverUrl,
      gatewayId: payload.relay!.gatewayId,
      accessCode: payload.relay!.accessCode!,
    });
    const relayUrl = claimed.relayUrl.trim();
    return {
      url: relayUrl,
      token: payload.token,
      password: payload.password,
      mode: 'relay',
      relay: {
        serverUrl: payload.relay!.serverUrl,
        gatewayId: claimed.gatewayId,
        clientToken: claimed.clientToken,
        relayUrl,
        displayName: claimed.displayName ?? payload.relay!.displayName,
        protocolVersion: payload.relay!.protocolVersion,
        supportsBootstrap: payload.relay!.supportsBootstrap,
      },
    };
  })().finally(() => {
    inFlightRef.current.delete(claimKey);
  });

  inFlightRef.current.set(claimKey, task);
  return task;
}

export async function createGatewayConfigFromScan(input: {
  payload: GatewayScanPayload;
  debugMode: boolean;
}): Promise<{ created: SavedGatewayConfig; nextConfigs: SavedGatewayConfig[] }> {
  const existingState = await StorageService.getGatewayConfigsState();
  const nextState = upsertGatewayConfigFromScan({
    existingState,
    payload: input.payload,
  });
  await StorageService.setGatewayConfigsState({ activeId: nextState.created.id, configs: nextState.nextConfigs });
  return nextState;
}

export function upsertGatewayConfigFromScan(input: {
  existingState: GatewayConfigsState;
  payload: GatewayScanPayload;
  now?: number;
}): { created: SavedGatewayConfig; nextConfigs: SavedGatewayConfig[] } {
  const trimmedUrl = input.payload.url.trim();
  const now = input.now ?? Date.now();
  const mode = input.payload.mode === 'relay' || input.payload.relay ? 'relay' : 'custom';
  const relay = mode === 'relay' ? toSavedRelayConfig(input.payload) : undefined;
  const relayMatchIndex = findMatchingRelayConfigIndex(input.existingState.configs, relay);

  if (relayMatchIndex >= 0) {
    const existing = input.existingState.configs[relayMatchIndex];
    const mergedRelay = mergeRelayConfig(existing.relay, relay);
    const updated: SavedGatewayConfig = {
      ...existing,
      mode,
      url: trimmedUrl,
      token: mergeOptionalCredential(input.payload.token, existing.token),
      password: mergeOptionalCredential(input.payload.password, existing.password),
      relay: mergedRelay,
      updatedAt: now,
    };
    const nextConfigs = input.existingState.configs.map((item, index) => (index === relayMatchIndex ? updated : item));
    return { created: updated, nextConfigs };
  }

  const name = input.payload.relay?.displayName?.trim()
    || buildDefaultName(mode, trimmedUrl, input.existingState.configs.length + 1);

  const created: SavedGatewayConfig = {
    id: `gateway_${now}`,
    name,
    mode,
    url: trimmedUrl,
    token: input.payload.token || undefined,
    password: input.payload.password || undefined,
    relay,
    createdAt: now,
    updatedAt: now,
  };
  const nextConfigs = [...input.existingState.configs, created];
  return { created, nextConfigs };
}

export function willCreateGatewayConfigFromScan(
  configs: SavedGatewayConfig[],
  payload: GatewayScanPayload,
): boolean {
  const mode = payload.mode === 'relay' || payload.relay ? 'relay' : 'custom';
  if (mode !== 'relay') return true;
  return findMatchingRelayConfigIndex(configs, toSavedRelayConfig(payload)) < 0;
}

export function reconnectGatewayWithOverlay(input: {
  gateway: GatewayClient;
  runtimeConfig: GatewayConfig;
  nextGatewayScopeId?: string | null;
  onSaved: (config: GatewayConfig, nextGatewayScopeId?: string | null) => void;
  showOverlay: (message: string) => void;
  hideOverlay: () => void;
  message: string;
  switchTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
}): void {
  if (input.switchTimerRef.current) clearTimeout(input.switchTimerRef.current);
  input.showOverlay(input.message);
  input.gateway.disconnect();
  input.onSaved(
    input.runtimeConfig,
    input.nextGatewayScopeId ?? resolveGatewayCacheScopeId({ config: input.runtimeConfig }),
  );
  input.gateway.configure(input.runtimeConfig);
  input.gateway.connect();
  input.switchTimerRef.current = setTimeout(() => {
    input.hideOverlay();
    input.switchTimerRef.current = null;
  }, MIN_SWITCH_DURATION_MS);
}

function parseHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

function findMatchingRelayConfigIndex(
  configs: SavedGatewayConfig[],
  relay: { serverUrl: string; gatewayId: string } | undefined,
): number {
  if (!relay) return -1;
  return configs.findIndex((item) => (
    normalizeRelayServerUrl(item.relay?.serverUrl) === normalizeRelayServerUrl(relay.serverUrl)
    && item.relay?.gatewayId === relay.gatewayId
  ));
}

function toSavedRelayConfig(
  payload: GatewayScanPayload,
): {
  serverUrl: string;
  gatewayId: string;
  clientToken?: string;
  displayName?: string;
  protocolVersion?: number;
  supportsBootstrap?: boolean;
} | undefined {
  if (!payload.relay) return undefined;
  const serverUrl = normalizeRelayServerUrl(payload.relay.serverUrl);
  const gatewayId = payload.relay.gatewayId.trim();
  if (!serverUrl || !gatewayId) return undefined;
  return {
    serverUrl,
    gatewayId,
    clientToken: payload.relay.clientToken?.trim() || undefined,
    displayName: payload.relay.displayName?.trim() || undefined,
    protocolVersion: payload.relay.protocolVersion,
    supportsBootstrap: payload.relay.supportsBootstrap,
  };
}

function normalizeRelayServerUrl(serverUrl?: string): string {
  return (serverUrl ?? '').trim().replace(/\/+$/, '');
}

function mergeOptionalCredential(next?: string, existing?: string): string | undefined {
  const nextTrimmed = next?.trim();
  if (nextTrimmed) return nextTrimmed;
  const existingTrimmed = existing?.trim();
  return existingTrimmed || undefined;
}

function mergeRelayConfig(
  existing: SavedGatewayConfig['relay'],
  next: SavedGatewayConfig['relay'],
): SavedGatewayConfig['relay'] {
  if (!next) return existing;
  return {
    serverUrl: next.serverUrl,
    gatewayId: next.gatewayId,
    clientToken: mergeOptionalCredential(next.clientToken, existing?.clientToken),
    displayName: mergeOptionalCredential(next.displayName, existing?.displayName),
    protocolVersion: next.protocolVersion ?? existing?.protocolVersion,
    supportsBootstrap: next.supportsBootstrap ?? existing?.supportsBootstrap,
  };
}
