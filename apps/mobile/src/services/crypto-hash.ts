/**
 * Simple hash utility for generating stable keys.
 * Uses a lightweight FNV-1a hash algorithm (works in React Native without Node crypto).
 */

/**
 * Generate a 32-character hex hash from a string.
 * Uses FNV-1a algorithm for good distribution and speed.
 */
export function createHash(input: string): string {
  // FNV-1a 32-bit hash
  let hash = 0x811c9dc5; // FNV offset basis
  const fnvPrime = 0x01000193;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, fnvPrime);
  }

  // Convert to unsigned 32-bit and then to hex
  const unsignedHash = hash >>> 0;
  return unsignedHash.toString(16).padStart(8, '0');
}

/**
 * Generate a stable key from multiple parts.
 * Useful for creating cache keys from composite data.
 */
export function createCompositeHash(parts: (string | number | undefined)[]): string {
  const normalized = parts.map((p) => (p === undefined ? '' : String(p))).join(':');
  return createHash(normalized);
}
