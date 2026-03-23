import { createHash, createCompositeHash } from './crypto-hash';

describe('createHash', () => {
  it('returns an 8-char hex string', () => {
    const hash = createHash('test');
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('produces deterministic output', () => {
    expect(createHash('hello')).toBe(createHash('hello'));
  });

  it('produces different hashes for different inputs', () => {
    expect(createHash('hello')).not.toBe(createHash('world'));
  });

  it('handles empty string', () => {
    const hash = createHash('');
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('handles long strings', () => {
    const hash = createHash('a'.repeat(10000));
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('handles unicode', () => {
    const hash = createHash('emoji 🎉');
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('createCompositeHash', () => {
  it('produces deterministic output from parts', () => {
    const hash1 = createCompositeHash(['a', 'b', 'c']);
    const hash2 = createCompositeHash(['a', 'b', 'c']);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different parts', () => {
    expect(createCompositeHash(['a', 'b'])).not.toBe(createCompositeHash(['c', 'd']));
  });

  it('handles undefined parts by converting to empty string', () => {
    const hash = createCompositeHash([undefined, 'b', undefined]);
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
    // Should be same as hashing ':b:'
    expect(hash).toBe(createHash(':b:'));
  });

  it('handles number parts', () => {
    const hash = createCompositeHash([42, 'test']);
    expect(hash).toBe(createHash('42:test'));
  });

  it('handles empty array', () => {
    const hash = createCompositeHash([]);
    expect(hash).toBe(createHash(''));
  });
});
