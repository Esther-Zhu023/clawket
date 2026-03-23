function parseVersionParts(version: string): number[] | null {
  const trimmed = version.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/^v/i, '').split('-')[0]?.split('+')[0] ?? '';
  if (!normalized) return null;
  const rawParts = normalized.split('.');
  if (rawParts.length === 0) return null;
  const parts: number[] = [];
  for (const raw of rawParts) {
    if (!/^\d+$/.test(raw)) return null;
    parts.push(Number(raw));
  }
  return parts;
}

export function compareVersions(a: string, b: string): number {
  const aParts = parseVersionParts(a);
  const bParts = parseVersionParts(b);
  if (!aParts || !bParts) return 0;
  const maxLen = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < maxLen; i += 1) {
    const left = aParts[i] ?? 0;
    const right = bParts[i] ?? 0;
    if (left > right) return 1;
    if (left < right) return -1;
  }
  return 0;
}

export function isNewerVersion(latestVersion: string, currentVersion: string): boolean {
  return compareVersions(latestVersion, currentVersion) > 0;
}

