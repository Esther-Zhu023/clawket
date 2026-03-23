export type ConnectionRole = 'gateway' | 'client';

export interface RelayAuthQuery {
  gatewayId: string;
  role: ConnectionRole;
  clientId?: string;
  token?: string;
}

export type RelayAuthSource = 'query' | 'bearer' | 'none';

export interface RelayAuthTokenResolution {
  token: string | null;
  authSource: RelayAuthSource;
}

export interface PairRegisterRequest {
  displayName?: string | null;
  preferredRegion?: string;
  gatewayVersion?: string;
}

export interface PairRegisterResponse {
  gatewayId: string;
  relaySecret: string;
  relayUrl: string;
  accessCode: string;
  accessCodeExpiresAt: string;
  displayName: string | null;
  region: string;
}

export interface PairAccessCodeRequest {
  gatewayId: string;
  relaySecret: string;
  displayName?: string | null;
}

export interface PairAccessCodeResponse {
  gatewayId: string;
  relayUrl: string;
  accessCode: string;
  accessCodeExpiresAt: string;
  displayName: string | null;
  region: string;
}

export interface PairClaimRequest {
  gatewayId: string;
  accessCode: string;
  clientLabel?: string | null;
}

export interface PairClaimResponse {
  gatewayId: string;
  relayUrl: string;
  clientToken: string;
  displayName: string | null;
  region: string;
}

export interface RegistryErrorShape {
  error: {
    code: string;
    message: string;
  };
}

export function parseRelayAuthQuery(url: URL): RelayAuthQuery {
  const roleRaw = url.searchParams.get('role');
  const gatewayId = (url.searchParams.get('gatewayId') ?? '').trim();
  const clientId = (url.searchParams.get('clientId') ?? '').trim() || undefined;
  const token = (url.searchParams.get('token') ?? '').trim() || undefined;
  const role: ConnectionRole = roleRaw === 'gateway' ? 'gateway' : 'client';

  return {
    gatewayId,
    role,
    clientId,
    token,
  };
}

export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export function errorResponse(code: string, message: string, status = 400): Response {
  return jsonResponse({ error: { code, message } }, status);
}

export function readBearerToken(request: Request): string | null {
  const auth = request.headers.get('authorization') ?? '';
  if (!auth.toLowerCase().startsWith('bearer ')) return null;
  const token = auth.slice(7).trim();
  return token || null;
}

export function resolveRelayAuthToken(queryToken: string | undefined, request: Request): RelayAuthTokenResolution {
  const normalizedQueryToken = queryToken?.trim() || '';
  if (normalizedQueryToken) {
    return {
      token: normalizedQueryToken,
      authSource: 'query',
    };
  }

  const bearerToken = readBearerToken(request);
  if (bearerToken) {
    return {
      token: bearerToken,
      authSource: 'bearer',
    };
  }

  return {
    token: null,
    authSource: 'none',
  };
}

export async function constantTimeSecretEqual(left: string, right: string): Promise<boolean> {
  const [leftHash, rightHash] = await Promise.all([sha256Hex(left), sha256Hex(right)]);
  return safeEqual(leftHash, rightHash);
}

export function normalizeRegion(region: string): string {
  const value = region.trim().toLowerCase();
  if (!value) return 'us';
  return value;
}

export async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
}

export function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const value = parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

function safeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let diff = left.length === right.length ? 0 : 1;
  for (let index = 0; index < length; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return diff === 0;
}
