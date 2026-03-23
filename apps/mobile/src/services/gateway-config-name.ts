import type { GatewayMode } from '../types';

export function resolveSavedGatewayName(input: {
  name: string;
  mode: GatewayMode;
  url: string;
  relayDisplayName?: string;
}): string {
  const trimmedName = input.name.trim();
  const relayDisplayName = input.relayDisplayName?.trim();
  if (!relayDisplayName || input.mode !== 'relay') return trimmedName;
  if (!trimmedName) return relayDisplayName;
  if (trimmedName === relayDisplayName) return relayDisplayName;
  if (trimmedName === 'Gateway') return relayDisplayName;

  const host = parseHost(input.url);
  if (host && trimmedName === `Relay (${host})`) return relayDisplayName;
  if (/^Relay Gateway \d+$/u.test(trimmedName)) return relayDisplayName;
  return trimmedName;
}

function parseHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}
