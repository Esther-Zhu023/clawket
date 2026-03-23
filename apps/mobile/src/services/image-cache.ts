/**
 * Local image cache for sent images.
 *
 * Gateway chat.history strips large messages (>128KB), so images sent via
 * Clawket disappear after reload. This cache saves sent images to the
 * local filesystem and maintains an index keyed by stable message identifiers.
 *
 * On history load, truncated messages are detected by the __openclaw.truncated
 * flag, and we attempt to match them using:
 * 1. idempotencyKey (most stable, if available from history)
 * 2. Stable fallback key: role + timestamp + content hash
 */
import * as FileSystem from 'expo-file-system/legacy';
import { createHash } from './crypto-hash';

const CACHE_DIR = `${FileSystem.documentDirectory}image-cache/`;
const INDEX_FILE = `${CACHE_DIR}index.json`;

// Cache entry version for migration handling
const CACHE_ENTRY_VERSION = 1;

type CacheEntry = {
  version: number;
  sessionKey: string;
  messageText: string;
  fileNames: string[];
  inlineDataUris?: string[]; // filesystem failed fallback
  imageDimensions?: Array<{ width: number; height: number }>;
  timestamp: number;
  // Stable lookup keys
  idempotencyKey?: string;
  stableKey: string; // role + timestamp + content hash
  contentHash: string; // role + content hash (timestamp-free fallback)
};

type CacheIndex = {
  version: number;
  entries: CacheEntry[];
};

let indexCache: CacheIndex | null = null;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

async function loadIndex(): Promise<CacheIndex> {
  if (indexCache) return indexCache;
  try {
    const raw = await FileSystem.readAsStringAsync(INDEX_FILE);
    const parsed = JSON.parse(raw) as CacheIndex;
    // Handle migration from old format (entries without version/stableKey)
    if (!parsed.version) {
      parsed.version = 1;
    }
    if (parsed.entries) {
      for (const entry of parsed.entries) {
        if (!entry.version) {
          entry.version = 1;
        }
        // Migrate old entries: generate stableKey from available data
        if (!entry.stableKey) {
          entry.stableKey = generateStableKey('user', entry.timestamp, entry.messageText);
        }
        if (!entry.contentHash) {
          entry.contentHash = generateContentHash('user', entry.messageText);
        }
      }
    }
    indexCache = parsed;
  } catch {
    indexCache = { version: 1, entries: [] };
  }
  return indexCache;
}

async function saveIndex(index: CacheIndex): Promise<void> {
  indexCache = index;
  await FileSystem.writeAsStringAsync(INDEX_FILE, JSON.stringify(index));
}

/**
 * Generate a stable key for message-image association.
 * Uses role + timestamp + content hash to ensure reproducibility.
 */
function normalizeContent(content: string): string {
  return content.replace(/\s+/g, ' ').trim();
}

export function generateStableKey(
  role: string,
  timestamp: number,
  content: string,
): string {
  const normalized = normalizeContent(content);
  const hash = createHash(`${role}:${timestamp}:${normalized}`);
  return `${role}:${timestamp}:${hash}`;
}

export function generateContentHash(role: string, content: string): string {
  const normalized = normalizeContent(content);
  return `${role}:${createHash(`${role}:${normalized}`)}`;
}

/** Save images for a sent message. Returns array of local file URIs. */
export async function cacheMessageImages(
  sessionKey: string,
  messageText: string,
  images: Array<{ base64: string; mimeType: string; width?: number; height?: number }>,
  options?: {
    timestamp?: number;
    idempotencyKey?: string;
    role?: string;
  },
): Promise<string[]> {
  await ensureDir();
  const index = await loadIndex();
  const ts = options?.timestamp ?? Date.now();
  const role = options?.role ?? 'user';
  const stableKey = generateStableKey(role, ts, messageText);
  const prefix = `img_${ts}`;

  const fileNames: string[] = [];
  let inlineDataUris: string[] | undefined;
  try {
    for (let i = 0; i < images.length; i++) {
      const ext = images[i].mimeType.includes('png') ? 'png' : 'jpg';
      const fileName = `${prefix}_${i}.${ext}`;
      await FileSystem.writeAsStringAsync(
        `${CACHE_DIR}${fileName}`,
        images[i].base64,
        { encoding: FileSystem.EncodingType.Base64 },
      );
      fileNames.push(fileName);
    }
  } catch {
    // Fallback: keep inline data URIs so session switch still preserves images.
    inlineDataUris = images.map((img) => `data:${img.mimeType};base64,${img.base64}`);
  }

  // Check if we already have an entry with this stableKey (avoid duplicates)
  const existingIndex = index.entries.findIndex(
    (e) => e.sessionKey === sessionKey && e.stableKey === stableKey,
  );

  // Store image dimensions if any are available
  const dims = images.some((img) => (img.width ?? 0) > 0 || (img.height ?? 0) > 0)
    ? images.map((img) => ({ width: img.width ?? 0, height: img.height ?? 0 }))
    : undefined;

  const newEntry: CacheEntry = {
    version: CACHE_ENTRY_VERSION,
    sessionKey,
    messageText,
    fileNames,
    inlineDataUris,
    imageDimensions: dims,
    timestamp: ts,
    idempotencyKey: options?.idempotencyKey,
    stableKey,
    contentHash: generateContentHash(role, messageText),
  };

  if (existingIndex >= 0) {
    // Replace existing entry (same message sent again)
    // Clean up old files first
    const oldEntry = index.entries[existingIndex];
    for (const fn of oldEntry.fileNames) {
      FileSystem.deleteAsync(`${CACHE_DIR}${fn}`, { idempotent: true }).catch(() => {});
    }
    index.entries[existingIndex] = newEntry;
  } else {
    index.entries.push(newEntry);
  }

  // Keep max 100 entries (prune oldest)
  if (index.entries.length > 100) {
    const removed = index.entries.splice(0, index.entries.length - 100);
    // Clean up old files
    for (const entry of removed) {
      for (const fn of entry.fileNames) {
        FileSystem.deleteAsync(`${CACHE_DIR}${fn}`, { idempotent: true }).catch(() => {});
      }
    }
  }

  await saveIndex(index);
  return fileNames.map((f) => `${CACHE_DIR}${f}`);
}

/** Find cached images for a session by stable key. */
export async function getCachedImagesByStableKey(
  sessionKey: string,
  stableKey: string,
): Promise<string[] | null> {
  const index = await loadIndex();
  const entry = index.entries.find(
    (e) => e.sessionKey === sessionKey && e.stableKey === stableKey,
  );
  if (!entry) return null;

  const uris: string[] = [];
  for (const fn of entry.fileNames) {
    const path = `${CACHE_DIR}${fn}`;
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) uris.push(path);
  }
  if (uris.length > 0) return uris;
  if (entry.inlineDataUris && entry.inlineDataUris.length > 0) return entry.inlineDataUris;
  return null;
}

/** Find cached images by idempotency key. */
export async function getCachedImagesByIdempotencyKey(
  sessionKey: string,
  idempotencyKey: string,
): Promise<string[] | null> {
  const index = await loadIndex();
  const entry = index.entries.find(
    (e) => e.sessionKey === sessionKey && e.idempotencyKey === idempotencyKey,
  );
  if (!entry) return null;

  const uris: string[] = [];
  for (const fn of entry.fileNames) {
    const path = `${CACHE_DIR}${fn}`;
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) uris.push(path);
  }
  if (uris.length > 0) return uris;
  if (entry.inlineDataUris && entry.inlineDataUris.length > 0) return entry.inlineDataUris;
  return null;
}

/** Legacy: Find cached images for a session, matching by message text. */
export async function getCachedMessageImages(
  sessionKey: string,
  messageText: string,
): Promise<string[] | null> {
  const index = await loadIndex();
  const entry = index.entries.find(
    (e) => e.sessionKey === sessionKey && e.messageText === messageText,
  );
  if (!entry) return null;

  const uris: string[] = [];
  for (const fn of entry.fileNames) {
    const path = `${CACHE_DIR}${fn}`;
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) uris.push(path);
  }
  if (uris.length > 0) return uris;
  if (entry.inlineDataUris && entry.inlineDataUris.length > 0) return entry.inlineDataUris;
  return null;
}

/** Cache entry metadata for matching. */
export type CacheMatchEntry = {
  messageText: string;
  timestamp: number;
  uris: string[];
  imageDimensions?: Array<{ width: number; height: number }>;
  stableKey: string;
  contentHash: string;
  idempotencyKey?: string;
};

/** Get all cached image entries for a session (for matching truncated history). */
export async function getAllCachedForSession(
  sessionKey: string,
): Promise<CacheMatchEntry[]> {
  const index = await loadIndex();
  const results: CacheMatchEntry[] = [];
  for (const entry of index.entries) {
    if (entry.sessionKey !== sessionKey) continue;
    const fileUris = entry.fileNames.map((fn) => `${CACHE_DIR}${fn}`);
    const uris = fileUris.length > 0 ? fileUris : (entry.inlineDataUris ?? []);
    results.push({
      messageText: entry.messageText,
      timestamp: entry.timestamp,
      uris,
      imageDimensions: entry.imageDimensions,
      stableKey: entry.stableKey,
      contentHash: entry.contentHash,
      idempotencyKey: entry.idempotencyKey,
    });
  }
  return results;
}

/**
 * Find cached image match using stable strategy:
 * 1. If idempotencyKey is provided and matches, use it (most stable)
 * 2. Otherwise match by stableKey (role + timestamp + content hash)
 * 3. Legacy fallback: timestamp proximity (within 5 seconds)
 */
export function findCachedEntry(
  cached: CacheMatchEntry[],
  params: {
    idempotencyKey?: string;
    stableKey?: string;
    timestamp?: number;
    role?: string;
    content?: string;
  },
  usedIndices: Set<number>,
): { index: number; entry: CacheMatchEntry } | null {
  // Priority 1: Match by idempotencyKey (most reliable)
  if (params.idempotencyKey) {
    for (let i = 0; i < cached.length; i++) {
      if (usedIndices.has(i)) continue;
      if (cached[i].idempotencyKey === params.idempotencyKey) {
        return { index: i, entry: cached[i] };
      }
    }
  }

  // Priority 2: Match by stableKey
  if (params.stableKey) {
    for (let i = 0; i < cached.length; i++) {
      if (usedIndices.has(i)) continue;
      if (cached[i].stableKey === params.stableKey) {
        return { index: i, entry: cached[i] };
      }
    }
  }

  // Priority 3: Generate stableKey from params and match
  if (params.role && params.timestamp && params.content !== undefined) {
    const computedStableKey = generateStableKey(params.role, params.timestamp, params.content);
    for (let i = 0; i < cached.length; i++) {
      if (usedIndices.has(i)) continue;
      if (cached[i].stableKey === computedStableKey) {
        return { index: i, entry: cached[i] };
      }
    }
  }

  // Priority 4: timestamp-free content hash fallback
  // Useful when server rewrites timestamps between send/history paths.
  if (params.role && params.content !== undefined) {
    const computedContentHash = generateContentHash(params.role, params.content);
    for (let i = 0; i < cached.length; i++) {
      if (usedIndices.has(i)) continue;
      if (cached[i].contentHash === computedContentHash) {
        return { index: i, entry: cached[i] };
      }
    }
  }

  // Legacy fallback: timestamp proximity (within 5 seconds)
  if (params.timestamp) {
    const MAX_DRIFT_MS = 5000;
    let bestIdx = -1;
    let bestDrift = Infinity;
    for (let i = 0; i < cached.length; i++) {
      if (usedIndices.has(i)) continue;
      const drift = Math.abs(cached[i].timestamp - params.timestamp);
      if (drift < bestDrift && drift <= MAX_DRIFT_MS) {
        bestDrift = drift;
        bestIdx = i;
      }
    }
    if (bestIdx !== -1) {
      return { index: bestIdx, entry: cached[bestIdx] };
    }
  }

  return null;
}

/**
 * @deprecated Use findCachedEntry instead for stable matching
 * Find the best cached image match for a truncated history message by timestamp.
 * Returns the closest match within 5 seconds, or null.
 */
export function findCachedByTimestamp(
  cached: Array<{ messageText: string; timestamp: number; uris: string[] }>,
  targetTs: number,
  usedIndices: Set<number>,
): { index: number; entry: { messageText: string; timestamp: number; uris: string[] } } | null {
  const MAX_DRIFT_MS = 5000;
  let bestIdx = -1;
  let bestDrift = Infinity;
  for (let i = 0; i < cached.length; i++) {
    if (usedIndices.has(i)) continue;
    const drift = Math.abs(cached[i].timestamp - targetTs);
    if (drift < bestDrift && drift <= MAX_DRIFT_MS) {
      bestDrift = drift;
      bestIdx = i;
    }
  }
  if (bestIdx === -1) return null;
  return { index: bestIdx, entry: cached[bestIdx] };
}
