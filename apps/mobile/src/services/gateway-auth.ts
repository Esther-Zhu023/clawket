import nacl from 'tweetnacl';
import { sha256 } from 'js-sha256';
import { StorageService } from './storage';
import type { DeviceIdentity } from '../types';

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function randomHex(numBytes = 16): string {
  const arr = new Uint8Array(numBytes);
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure random generator unavailable');
  }
  globalThis.crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

export function generateId(): string {
  return randomHex(16);
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Derive deviceId as SHA-256 hex of the raw public key bytes (matches Gateway's deriveDeviceIdFromPublicKey). */
export function deriveDeviceId(publicKeyBytes: Uint8Array): string {
  return sha256(publicKeyBytes);
}

/** Build the v3 device auth payload string that must be signed.
 *  v3 adds platform and deviceFamily fields for cross-platform consistency. */
export function buildDeviceAuthPayload(params: {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token?: string;
  nonce: string;
  platform: string;
  deviceFamily: string;
}): string {
  return [
    'v3',
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(','),
    String(params.signedAtMs),
    params.token ?? '',
    params.nonce,
    params.platform,
    params.deviceFamily,
  ].join('|');
}

export function normalizeWsUrl(url: string): string {
  if (url.startsWith('ws://') || url.startsWith('wss://')) return url;
  if (url.startsWith('http://')) return `ws://${url.slice('http://'.length)}`;
  if (url.startsWith('https://')) return `wss://${url.slice('https://'.length)}`;
  return `wss://${url}`;
}

function isValidStoredIdentity(identity: DeviceIdentity): boolean {
  if (identity.deviceId.length !== 64 || identity.deviceId.startsWith('pc_')) return false;
  if (identity.publicKeyHex.length !== 64 || identity.secretKeyHex.length !== 128) return false;
  try {
    const publicKey = hexToBytes(identity.publicKeyHex);
    const secretKey = hexToBytes(identity.secretKeyHex);
    if (publicKey.length !== 32 || secretKey.length !== 64) return false;
    const derived = nacl.sign.keyPair.fromSecretKey(secretKey).publicKey;
    if (bytesToHex(derived) !== identity.publicKeyHex) return false;
    return deriveDeviceId(publicKey) === identity.deviceId;
  } catch {
    return false;
  }
}

/** Ensure a valid device identity exists in storage, creating one if needed. */
export async function ensureIdentity(): Promise<DeviceIdentity> {
  const existing = await StorageService.getIdentity();
  if (existing && isValidStoredIdentity(existing)) {
    return existing;
  }
  if (existing) await StorageService.clearIdentity();

  const keyPair = nacl.sign.keyPair();
  const publicKeyHex = bytesToHex(keyPair.publicKey);
  const deviceId = deriveDeviceId(keyPair.publicKey);
  const identity: DeviceIdentity = {
    deviceId,
    publicKeyHex,
    secretKeyHex: bytesToHex(keyPair.secretKey),
    createdAt: new Date().toISOString(),
  };
  await StorageService.setIdentity(identity);
  return identity;
}
