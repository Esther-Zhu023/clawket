import { GatewayMode } from '../../types';
import { PairingQrPayload } from '../../services/relay-pairing';

export type QRScanResult = {
  url: string;
  token?: string;
  password?: string;
  /** Connection mode encoded in the QR payload — lets the app auto-switch modes. */
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

/**
 * Parse a scanned QR code value into gateway connection info.
 *
 * Supported formats:
 * 1. JSON object: { "host": "192.168.1.x", "port": 18789, "token": "..." }
 * 2. URL format:  openclaw://connect?host=192.168.1.x&port=18789&token=...
 */
export function parseQRPayload(raw: string): QRScanResult | null {
  const trimmed = raw.trim();
  const normalizeMode = (value: unknown): GatewayMode | undefined => (
    value === 'local' || value === 'tailscale' || value === 'cloudflare' || value === 'custom' || value === 'relay'
      ? value
      : undefined
  );
  const readRelay = (value: unknown): QRScanResult['relay'] => {
    if (!value || typeof value !== 'object') return undefined;
    const relay = value as Record<string, unknown>;
    const serverUrl = typeof relay.serverUrl === 'string' ? relay.serverUrl.trim() : '';
    const gatewayId = typeof relay.gatewayId === 'string' ? relay.gatewayId.trim() : '';
    const protocolVersion = typeof relay.protocolVersion === 'number'
      && Number.isFinite(relay.protocolVersion)
      && relay.protocolVersion >= 1
      ? Math.trunc(relay.protocolVersion)
      : undefined;
    const supportsBootstrap = typeof relay.supportsBootstrap === 'boolean'
      ? relay.supportsBootstrap
      : undefined;
    if (!serverUrl || !gatewayId) return undefined;
    return {
      serverUrl,
      gatewayId,
      accessCode: typeof relay.accessCode === 'string' ? relay.accessCode.trim() : undefined,
      clientToken: typeof relay.clientToken === 'string' ? relay.clientToken.trim() : undefined,
      relayUrl: typeof relay.relayUrl === 'string' ? relay.relayUrl.trim() : undefined,
      displayName: typeof relay.displayName === 'string' ? relay.displayName.trim() : undefined,
      protocolVersion,
      supportsBootstrap,
    };
  };
  const readPairingPayload = (value: unknown): QRScanResult | null => {
    if (!value || typeof value !== 'object') return null;
    const payload = value as Record<string, unknown>;
    const isCompact = payload.k === 'cp' && payload.v === 2;
    const isLegacy = payload.kind === 'clawket_pair' && payload.version === 1;
    if (!isCompact && !isLegacy) return null;
    const serverUrl = typeof payload.s === 'string'
      ? payload.s.trim()
      : typeof payload.server === 'string'
        ? payload.server.trim()
        : '';
    const gatewayId = typeof payload.g === 'string'
      ? payload.g.trim()
      : typeof payload.gatewayId === 'string'
        ? payload.gatewayId.trim()
        : '';
    const accessCode = typeof payload.a === 'string'
      ? payload.a.trim()
      : typeof payload.accessCode === 'string'
        ? payload.accessCode.trim()
        : '';
    if (!serverUrl || !gatewayId || !accessCode) return null;
    const relayUrl = typeof payload.relayUrl === 'string' ? payload.relayUrl.trim() : '';
    const token = typeof payload.t === 'string'
      ? payload.t.trim()
      : typeof payload.token === 'string'
        ? payload.token.trim()
        : '';
    const password = typeof payload.p === 'string'
      ? payload.p.trim()
      : typeof payload.password === 'string'
        ? payload.password.trim()
        : '';
    const displayName = typeof payload.n === 'string'
      ? payload.n.trim()
      : typeof payload.displayName === 'string'
        ? payload.displayName.trim()
        : undefined;
    const protocolVersion = typeof payload.pv === 'number'
      && Number.isFinite(payload.pv)
      && payload.pv >= 1
      ? Math.trunc(payload.pv)
      : typeof payload.protocolVersion === 'number'
        && Number.isFinite(payload.protocolVersion)
        && payload.protocolVersion >= 1
        ? Math.trunc(payload.protocolVersion)
        : undefined;
    const supportsBootstrap = typeof payload.sb === 'boolean'
      ? payload.sb
      : typeof payload.supportsBootstrap === 'boolean'
        ? payload.supportsBootstrap
        : undefined;
    return {
      url: relayUrl,
      token: token || undefined,
      password: password || undefined,
      mode: 'relay',
      relay: {
        serverUrl,
        gatewayId,
        accessCode,
        relayUrl: relayUrl || undefined,
        displayName,
        protocolVersion,
        supportsBootstrap,
      },
    };
  };

  // Try JSON first
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed);
      // Check QR code expiration (v2+)
      if (typeof obj.expiresAt === 'number' && obj.expiresAt < Date.now()) {
        return null; // QR code expired
      }
      const pairingPayload = readPairingPayload(obj);
      if (pairingPayload) return pairingPayload;
      if (obj.url && (obj.token || obj.password)) {
        const mode = normalizeMode(obj.mode);
        const relay = readRelay(obj.relay);
        return {
          url: String(obj.url),
          token: typeof obj.token === 'string' ? obj.token : undefined,
          password: typeof obj.password === 'string' ? obj.password : undefined,
          mode,
          relay,
        };
      }
      if (obj.host && (obj.token || obj.password)) {
        const scheme = obj.tls ? 'wss' : 'ws';
        const port = obj.port ?? 18789;
        const mode = normalizeMode(obj.mode);
        const relay = readRelay(obj.relay);
        return {
          url: `${scheme}://${obj.host}:${port}`,
          token: typeof obj.token === 'string' ? obj.token : undefined,
          password: typeof obj.password === 'string' ? obj.password : undefined,
          mode,
          relay,
        };
      }
    } catch {
      // not JSON, continue
    }
  }

  // Try URL format: openclaw://connect?host=...&port=...&token=...
  if (trimmed.startsWith('openclaw://')) {
    try {
      const url = new URL(trimmed);
      const directUrl = url.searchParams.get('url');
      const tokenFromUrl = url.searchParams.get('token');
      const passwordFromUrl = url.searchParams.get('password');
      if (directUrl && (tokenFromUrl || passwordFromUrl)) {
        const modeParam = url.searchParams.get('mode');
        const mode = normalizeMode(modeParam);
        const serverUrl = (url.searchParams.get('serverUrl') ?? '').trim();
        const gatewayId = (url.searchParams.get('gatewayId') ?? '').trim();
        const relayProtocolVersionRaw = url.searchParams.get('relayProtocolVersion');
        const relayProtocolVersion = relayProtocolVersionRaw && /^\d+$/.test(relayProtocolVersionRaw)
          ? Number(relayProtocolVersionRaw)
          : undefined;
        const relaySupportsBootstrapRaw = url.searchParams.get('relaySupportsBootstrap');
        const relaySupportsBootstrap = relaySupportsBootstrapRaw === '1'
          ? true
          : relaySupportsBootstrapRaw === '0'
            ? false
            : relaySupportsBootstrapRaw === 'true'
              ? true
              : relaySupportsBootstrapRaw === 'false'
                ? false
                : undefined;
        const relay = serverUrl && gatewayId
          ? {
            serverUrl,
            gatewayId,
            ...(relayProtocolVersion ? { protocolVersion: relayProtocolVersion } : {}),
            ...(relaySupportsBootstrap !== undefined ? { supportsBootstrap: relaySupportsBootstrap } : {}),
          }
          : undefined;
        return {
          url: directUrl,
          token: tokenFromUrl ?? undefined,
          password: passwordFromUrl ?? undefined,
          mode,
          relay,
        };
      }
      const host = url.searchParams.get('host');
      const token = url.searchParams.get('token');
      const password = url.searchParams.get('password');
      if (host && (token || password)) {
        const port = url.searchParams.get('port') ?? '18789';
        const tls = url.searchParams.get('tls') === '1';
        const scheme = tls ? 'wss' : 'ws';
        const modeParam = url.searchParams.get('mode');
        const mode = normalizeMode(modeParam);
        const serverUrl = (url.searchParams.get('serverUrl') ?? '').trim();
        const gatewayId = (url.searchParams.get('gatewayId') ?? '').trim();
        const relayProtocolVersionRaw = url.searchParams.get('relayProtocolVersion');
        const relayProtocolVersion = relayProtocolVersionRaw && /^\d+$/.test(relayProtocolVersionRaw)
          ? Number(relayProtocolVersionRaw)
          : undefined;
        const relaySupportsBootstrapRaw = url.searchParams.get('relaySupportsBootstrap');
        const relaySupportsBootstrap = relaySupportsBootstrapRaw === '1'
          ? true
          : relaySupportsBootstrapRaw === '0'
            ? false
            : relaySupportsBootstrapRaw === 'true'
              ? true
              : relaySupportsBootstrapRaw === 'false'
                ? false
                : undefined;
        const relay = serverUrl && gatewayId
          ? {
            serverUrl,
            gatewayId,
            ...(relayProtocolVersion ? { protocolVersion: relayProtocolVersion } : {}),
            ...(relaySupportsBootstrap !== undefined ? { supportsBootstrap: relaySupportsBootstrap } : {}),
          }
          : undefined;
        return {
          url: `${scheme}://${host}:${port}`,
          token: token ?? undefined,
          password: password ?? undefined,
          mode,
          relay,
        };
      }
    } catch {
      // not a valid URL
    }
  }

  return null;
}
