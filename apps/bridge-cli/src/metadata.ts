import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type PackageMetadata = {
  version?: string;
};

export function readCliVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const packageJsonPath = resolve(here, '../package.json');
  const raw = readFileSync(packageJsonPath, 'utf8');
  const parsed = JSON.parse(raw) as PackageMetadata;
  return parsed.version ?? 'unknown';
}
