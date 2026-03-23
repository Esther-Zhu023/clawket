import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readCliVersion } from './metadata.js';

describe('cli metadata', () => {
  it('reads the published cli version from package.json', () => {
    const packageJsonPath = resolve(import.meta.dirname, '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string };
    expect(readCliVersion()).toBe(packageJson.version);
  });
});
