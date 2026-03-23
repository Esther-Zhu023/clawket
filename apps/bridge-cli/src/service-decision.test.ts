import { describe, expect, it } from 'vitest';
import { decidePairServiceAction } from './service-decision.js';

describe('pair service decision', () => {
  it('installs when no service exists', () => {
    expect(decidePairServiceAction({ action: 'registered' }, { installed: false, running: false })).toBe('install');
  });

  it('restarts a stopped service', () => {
    expect(decidePairServiceAction({ action: 'refreshed' }, { installed: true, running: false })).toBe('restart');
  });

  it('restarts a running service when bridge identity was newly registered', () => {
    expect(decidePairServiceAction({ action: 'registered' }, { installed: true, running: true })).toBe('restart');
  });

  it('leaves a healthy running service untouched on access-code refresh', () => {
    expect(decidePairServiceAction({ action: 'refreshed' }, { installed: true, running: true })).toBe('noop');
  });
});
