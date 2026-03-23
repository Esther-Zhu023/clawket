import {
  errorResponse,
  jsonResponse,
  normalizeRegion,
  parsePositiveInt,
  readBearerToken,
  sha256Hex,
  type PairAccessCodeRequest,
  type PairAccessCodeResponse,
  type PairClaimRequest,
  type PairClaimResponse,
  type PairRegisterRequest,
  type PairRegisterResponse,
} from '@clawket/shared';

interface Env {
  ROUTES_KV: KVNamespace;
  RELAY_REGION_MAP: string;
  PAIR_ACCESS_CODE_TTL_SEC?: string;
  PAIR_CLIENT_TOKEN_MAX?: string;
  PAIRING_SYNC_SECRET?: string;
}

type PairClientTokenRecord = {
  hash: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

type PairGatewayRecord = {
  gatewayId: string;
  relayUrl: string;
  region: string;
  displayName: string | null;
  relaySecretHash: string;
  accessCodeHash: string | null;
  accessCodeExpiresAt: string | null;
  clientTokens: PairClientTokenRecord[];
  createdAt: string;
  updatedAt: string;
};

type PairGatewayLookupResult =
  | { ok: true; record: PairGatewayRecord | null }
  | { ok: false; gatewayId: string };

const ACCESS_CODE_TTL_FALLBACK_SEC = 10 * 60;
const PAIR_CLIENT_TOKEN_MAX_FALLBACK = 8;
const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const ACCESS_CODE_LENGTH = 6;
const ACCESS_CODE_RANDOM_LIMIT = Math.floor(256 / ACCESS_CODE_ALPHABET.length) * ACCESS_CODE_ALPHABET.length;

export default {
  async fetch(request, env): Promise<Response> {
    const startedAt = Date.now();
    if (request.method === 'OPTIONS') return handleCors();

    const url = new URL(request.url);
    let response: Response;

    if (request.method === 'GET' && url.pathname === '/v1/health') {
      response = withCors(jsonResponse({ ok: true, regions: Object.keys(readRelayMap(env)) }));
      logRegistryTelemetry('http_request', request, url, response.status, Date.now() - startedAt);
      return response;
    }

    if (request.method === 'POST' && url.pathname === '/v1/pair/register') {
      response = withCors(await handlePairRegister(request, env));
      logRegistryTelemetry('http_request', request, url, response.status, Date.now() - startedAt);
      return response;
    }

    if (request.method === 'POST' && url.pathname === '/v1/pair/access-code') {
      response = withCors(await handlePairAccessCode(request, env));
      logRegistryTelemetry('http_request', request, url, response.status, Date.now() - startedAt);
      return response;
    }

    if (request.method === 'POST' && url.pathname === '/v1/pair/claim') {
      response = withCors(await handlePairClaim(request, env));
      logRegistryTelemetry('http_request', request, url, response.status, Date.now() - startedAt);
      return response;
    }

    if (request.method === 'GET' && url.pathname.startsWith('/v1/verify/')) {
      const gatewayId = decodeURIComponent(url.pathname.slice('/v1/verify/'.length));
      response = withCors(await handleVerify(request, env, gatewayId));
      logRegistryTelemetry('http_request', request, url, response.status, Date.now() - startedAt);
      return response;
    }

    response = withCors(errorResponse('NOT_FOUND', 'Route not found', 404));
    logRegistryTelemetry('http_request', request, url, response.status, Date.now() - startedAt);
    return response;
  },
} satisfies ExportedHandler<Env>;

async function handlePairRegister(request: Request, env: Env): Promise<Response> {
  const body = await readJson<PairRegisterRequest>(request);
  const relayMap = readRelayMap(env);
  const region = resolveRegion(request, body?.preferredRegion ?? undefined);
  const relayUrl = resolveRelayUrl(relayMap, region);
  if (!relayUrl) {
    return errorResponse('RELAY_REGION_UNAVAILABLE', `No relay URL configured for region ${region}`, 500);
  }

  const now = new Date().toISOString();
  const gatewayId = `gw_${crypto.randomUUID().replace(/-/g, '')}`;
  const relaySecret = generateRelaySecret();
  const accessCode = generateAccessCode();
  const accessCodeExpiresAt = new Date(
    Date.now() + parsePositiveInt(env.PAIR_ACCESS_CODE_TTL_SEC, ACCESS_CODE_TTL_FALLBACK_SEC) * 1000,
  ).toISOString();

  const record: PairGatewayRecord = {
    gatewayId,
    relayUrl,
    region,
    displayName: body?.displayName?.trim() || null,
    relaySecretHash: await sha256Hex(relaySecret),
    accessCodeHash: await sha256Hex(accessCode),
    accessCodeExpiresAt,
    clientTokens: [],
    createdAt: now,
    updatedAt: now,
  };

  await putPairGateway(env.ROUTES_KV, record);

  const response: PairRegisterResponse = {
    gatewayId,
    relaySecret,
    relayUrl,
    accessCode,
    accessCodeExpiresAt,
    displayName: record.displayName,
    region,
  };
  return jsonResponse(response, 200);
}

async function handlePairAccessCode(request: Request, env: Env): Promise<Response> {
  const body = await readJson<PairAccessCodeRequest>(request);
  if (!body?.gatewayId?.trim()) return errorResponse('INVALID_GATEWAY_ID', 'gatewayId is required', 400);
  if (!body?.relaySecret?.trim()) return errorResponse('INVALID_RELAY_SECRET', 'relaySecret is required', 400);

  const gatewayLookup = await getPairGateway(env.ROUTES_KV, body.gatewayId.trim());
  if (!gatewayLookup.ok) return pairingRecordCorruptResponse(gatewayLookup.gatewayId);
  const record = gatewayLookup.record;
  if (!record) return errorResponse('GATEWAY_NOT_FOUND', 'Gateway not found', 404);
  if (await sha256Hex(body.relaySecret.trim()) !== record.relaySecretHash) {
    return errorResponse('UNAUTHORIZED', 'Invalid relay secret', 401);
  }

  const accessCode = generateAccessCode();
  const nextDisplayName = body.displayName === undefined
    ? record.displayName
    : body.displayName?.trim() || null;
  const next: PairGatewayRecord = {
    ...record,
    displayName: nextDisplayName,
    accessCodeHash: await sha256Hex(accessCode),
    accessCodeExpiresAt: new Date(
      Date.now() + parsePositiveInt(env.PAIR_ACCESS_CODE_TTL_SEC, ACCESS_CODE_TTL_FALLBACK_SEC) * 1000,
    ).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await putPairGateway(env.ROUTES_KV, next);

  const response: PairAccessCodeResponse = {
    gatewayId: next.gatewayId,
    relayUrl: next.relayUrl,
    accessCode,
    accessCodeExpiresAt: next.accessCodeExpiresAt as string,
    displayName: next.displayName,
    region: next.region,
  };
  return jsonResponse(response, 200);
}

async function handlePairClaim(request: Request, env: Env): Promise<Response> {
  const body = await readJson<PairClaimRequest>(request);
  if (!body?.gatewayId?.trim()) return errorResponse('INVALID_GATEWAY_ID', 'gatewayId is required', 400);
  const normalizedAccessCode = normalizeAccessCode(body?.accessCode);
  if (!normalizedAccessCode) return errorResponse('INVALID_ACCESS_CODE', 'accessCode is required', 400);

  const gatewayLookup = await getPairGateway(env.ROUTES_KV, body.gatewayId.trim());
  if (!gatewayLookup.ok) return pairingRecordCorruptResponse(gatewayLookup.gatewayId);
  const record = gatewayLookup.record;
  if (!record) return errorResponse('GATEWAY_NOT_FOUND', 'Gateway not found', 404);

  const codeHash = await sha256Hex(normalizedAccessCode);
  if (!record.accessCodeHash || !record.accessCodeExpiresAt) {
    return errorResponse('ACCESS_CODE_REQUIRED', 'Gateway does not have an active access code', 409);
  }
  if (Date.parse(record.accessCodeExpiresAt) <= Date.now()) {
    return errorResponse('ACCESS_CODE_EXPIRED', 'Access code expired', 410);
  }
  if (codeHash !== record.accessCodeHash) {
    return errorResponse('UNAUTHORIZED', 'Invalid access code', 401);
  }

  const now = new Date().toISOString();
  const issued = await mintClientToken(record, env, body.clientLabel, now);
  const next: PairGatewayRecord = {
    ...issued.record,
    accessCodeHash: null,
    accessCodeExpiresAt: null,
  };
  await putPairGateway(env.ROUTES_KV, next);
  await syncClientTokensToRelay(env, next);
  return jsonResponse(buildPairClaimResponse(next, issued.clientToken), 200);
}

async function handleVerify(request: Request, env: Env, gatewayId: string): Promise<Response> {
  if (!gatewayId.trim()) return errorResponse('INVALID_GATEWAY_ID', 'gatewayId is required', 400);
  const token = readBearerToken(request);
  if (!token) return errorResponse('UNAUTHORIZED', 'Missing token for verify', 401);

  const gatewayLookup = await getPairGateway(env.ROUTES_KV, gatewayId.trim());
  if (!gatewayLookup.ok) return pairingRecordCorruptResponse(gatewayLookup.gatewayId);
  const gateway = gatewayLookup.record;
  if (!gateway) return errorResponse('GATEWAY_NOT_FOUND', 'Gateway not found', 404);

  const tokenHash = await sha256Hex(token);
  if (tokenHash === gateway.relaySecretHash) {
    return jsonResponse({ ok: true, role: 'gateway' }, 200);
  }
  if (gateway.clientTokens.some((item) => item.hash === tokenHash)) {
    return jsonResponse({ ok: true, role: 'client' }, 200);
  }
  return errorResponse('UNAUTHORIZED', 'Invalid pairing token', 401);
}

async function getPairGateway(routesKv: KVNamespace, gatewayId: string): Promise<PairGatewayLookupResult> {
  const raw = await routesKv.get(pairGatewayKey(gatewayId));
  if (!raw) return { ok: true, record: null };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed.gatewayId !== 'string' || typeof parsed.relaySecretHash !== 'string') {
      return { ok: false, gatewayId };
    }
    const clientTokens = Array.isArray(parsed.clientTokens) ? parsed.clientTokens : [];
    return {
      ok: true,
      record: {
        gatewayId: parsed.gatewayId,
        relayUrl: typeof parsed.relayUrl === 'string' ? parsed.relayUrl : '',
        region: typeof parsed.region === 'string' ? parsed.region : 'us',
        displayName: typeof parsed.displayName === 'string' ? parsed.displayName : null,
        relaySecretHash: parsed.relaySecretHash,
        accessCodeHash: typeof parsed.accessCodeHash === 'string' ? parsed.accessCodeHash : null,
        accessCodeExpiresAt: typeof parsed.accessCodeExpiresAt === 'string' ? parsed.accessCodeExpiresAt : null,
        // Tolerate legacy stored fields such as reusableCodes or issuedByReusableCodeId.
        clientTokens: clientTokens
          .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null && typeof item.hash === 'string')
          .map((item) => ({
            hash: item.hash as string,
            label: typeof item.label === 'string' ? item.label : null,
            createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
            lastUsedAt: typeof item.lastUsedAt === 'string' ? item.lastUsedAt : null,
          })),
        createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      },
    };
  } catch {
    return { ok: false, gatewayId };
  }
}

async function putPairGateway(routesKv: KVNamespace, record: PairGatewayRecord): Promise<void> {
  await routesKv.put(pairGatewayKey(record.gatewayId), JSON.stringify(record), {
    expirationTtl: 365 * 24 * 3600,
  });
}

async function syncClientTokensToRelay(env: Env, record: PairGatewayRecord): Promise<void> {
  const secret = env.PAIRING_SYNC_SECRET?.trim() ?? '';
  if (!secret) return;
  const endpoint = buildRelayPairingSyncUrl(record.relayUrl);
  if (!endpoint) return;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-clawket-pairing-sync-secret': secret,
      },
      body: JSON.stringify({
        gatewayId: record.gatewayId,
        clientTokenHashes: record.clientTokens.map((item) => item.hash),
        updatedAt: Date.now(),
      }),
    });
    if (!response.ok) {
      console.warn(JSON.stringify({
        scope: 'registry_worker',
        event: 'relay_token_sync_failed',
        ts: new Date().toISOString(),
        status: response.status,
      }));
    }
  } catch (error) {
    console.warn(JSON.stringify({
      scope: 'registry_worker',
      event: 'relay_token_sync_failed',
      ts: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error),
    }));
  }
}

function buildRelayPairingSyncUrl(relayUrl: string): string | null {
  const trimmed = relayUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    parsed.protocol = parsed.protocol === 'wss:' ? 'https:' : 'http:';
    parsed.pathname = '/v1/internal/pairing/client-tokens';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

function resolveRegion(request: Request, preferred?: string): string {
  if (preferred?.trim()) return normalizeRegion(preferred);
  const country = (request as Request & { cf?: { country?: string } }).cf?.country ?? 'US';
  if (country === 'CN') return 'cn';
  if (['SG', 'MY', 'TH', 'VN', 'ID', 'PH', 'JP', 'KR', 'TW', 'HK', 'MO', 'IN', 'AU', 'NZ'].includes(country)) return 'sg';
  if (['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'AT', 'CH', 'BE', 'IE', 'PT'].includes(country)) return 'eu';
  return 'us';
}

function resolveRelayUrl(map: Record<string, string>, region: string): string | null {
  return map[region] ?? map.us ?? null;
}

function readRelayMap(env: Env): Record<string, string> {
  const defaults: Record<string, string> = {
    cn: 'wss://relay-cn.clawket.ai/ws',
    sg: 'wss://relay-sg.clawket.ai/ws',
    us: 'wss://relay-us.clawket.ai/ws',
    eu: 'wss://relay-eu.clawket.ai/ws',
  };
  const raw = env.RELAY_REGION_MAP;
  if (!raw?.trim()) return defaults;
  const parsed = safeParseJson<Record<string, string>>(raw, {});
  return {
    ...defaults,
    ...Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => typeof value === 'string' && value.trim().startsWith('ws'))
        .map(([key, value]) => [key.trim().toLowerCase(), value.trim()]),
    ),
  };
}

function normalizeRequestPath(pathname: string): string {
  if (pathname.startsWith('/v1/verify/')) return '/v1/verify/:gatewayId';
  return pathname;
}

function logRegistryTelemetry(
  event: string,
  request: Request,
  url: URL,
  status: number,
  elapsedMs: number,
  extra?: Record<string, unknown>,
): void {
  console.log(JSON.stringify({
    scope: 'registry_worker',
    event,
    ts: new Date().toISOString(),
    method: request.method,
    path: normalizeRequestPath(url.pathname),
    status,
    elapsedMs,
    ...extra,
  }));
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function mintClientToken(
  record: PairGatewayRecord,
  env: Env,
  clientLabel: string | null | undefined,
  now: string,
): Promise<{ record: PairGatewayRecord; clientToken: string }> {
  const clientToken = generateClientToken();
  return {
    clientToken,
    record: {
      ...record,
      clientTokens: [
        {
          hash: await sha256Hex(clientToken),
          label: clientLabel?.trim() || null,
          createdAt: now,
          lastUsedAt: null,
        },
        ...record.clientTokens,
      ].slice(0, parsePositiveInt(env.PAIR_CLIENT_TOKEN_MAX, PAIR_CLIENT_TOKEN_MAX_FALLBACK)),
      updatedAt: now,
    },
  };
}

function buildPairClaimResponse(record: PairGatewayRecord, clientToken: string): PairClaimResponse {
  return {
    gatewayId: record.gatewayId,
    relayUrl: record.relayUrl,
    clientToken,
    displayName: record.displayName,
    region: record.region,
  };
}

function pairGatewayKey(gatewayId: string): string {
  return `pair-gateway:${gatewayId}`;
}

function pairingRecordCorruptResponse(gatewayId: string): Response {
  return errorResponse(
    'PAIRING_RECORD_CORRUPT',
    `Stored pairing record for ${gatewayId} is invalid. Reset the bridge pairing and pair again.`,
    500,
  );
}

function generateAccessCode(): string {
  let code = '';
  while (code.length < ACCESS_CODE_LENGTH) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(ACCESS_CODE_LENGTH));
    for (const byte of randomBytes) {
      if (byte >= ACCESS_CODE_RANDOM_LIMIT) continue;
      code += ACCESS_CODE_ALPHABET[byte % ACCESS_CODE_ALPHABET.length];
      if (code.length === ACCESS_CODE_LENGTH) break;
    }
  }
  return code;
}

function normalizeAccessCode(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toUpperCase();
}

function generateRelaySecret(): string {
  return `grs_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;
}

function generateClientToken(): string {
  return `gct_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;
}

function handleCors(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders())) headers.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function corsHeaders(): Record<string, string> {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type,x-relay-trace-id,x-clawket-admin-secret',
  };
}
