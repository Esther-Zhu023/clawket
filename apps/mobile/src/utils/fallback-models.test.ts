import {
  addFallbackModel,
  moveFallbackModel,
  removeFallbackModelAt,
  sanitizeFallbackModels,
} from './fallback-models';

describe('sanitizeFallbackModels', () => {
  it('trims values, removes duplicates, and preserves order', () => {
    expect(
      sanitizeFallbackModels([
        ' openai/gpt-4.1-mini ',
        'anthropic/claude-3-5-haiku',
        'openai/gpt-4.1-mini',
        'openai/gpt-4.1-nano',
      ]),
    ).toEqual([
      'openai/gpt-4.1-mini',
      'anthropic/claude-3-5-haiku',
      'openai/gpt-4.1-nano',
    ]);
  });

  it('removes the primary model from fallbacks', () => {
    expect(
      sanitizeFallbackModels(
        [
          'openai/gpt-4.1',
          'anthropic/claude-3-5-haiku',
          'openai/gpt-4.1-mini',
          'openai/gpt-4.1',
        ],
        { primaryModel: 'openai/gpt-4.1' },
      ),
    ).toEqual([
      'anthropic/claude-3-5-haiku',
      'openai/gpt-4.1-mini',
    ]);
  });
});

describe('addFallbackModel', () => {
  it('appends a new fallback at the end', () => {
    expect(
      addFallbackModel(
        ['openai/gpt-4.1-mini'],
        'anthropic/claude-3-5-haiku',
        { primaryModel: 'openai/gpt-4.1' },
      ),
    ).toEqual([
      'openai/gpt-4.1-mini',
      'anthropic/claude-3-5-haiku',
    ]);
  });

  it('does not add duplicates or the primary model', () => {
    expect(
      addFallbackModel(
        ['openai/gpt-4.1-mini'],
        'openai/gpt-4.1-mini',
        { primaryModel: 'openai/gpt-4.1' },
      ),
    ).toEqual(['openai/gpt-4.1-mini']);

    expect(
      addFallbackModel(
        ['openai/gpt-4.1-mini'],
        'openai/gpt-4.1',
        { primaryModel: 'openai/gpt-4.1' },
      ),
    ).toEqual(['openai/gpt-4.1-mini']);
  });
});

describe('removeFallbackModelAt', () => {
  it('removes the item at the target index', () => {
    expect(
      removeFallbackModelAt(
        ['openai/gpt-4.1-mini', 'anthropic/claude-3-5-haiku', 'openai/gpt-4.1-nano'],
        1,
      ),
    ).toEqual([
      'openai/gpt-4.1-mini',
      'openai/gpt-4.1-nano',
    ]);
  });

  it('returns a copy when the index is out of range', () => {
    const models = ['openai/gpt-4.1-mini'];
    expect(removeFallbackModelAt(models, -1)).toEqual(models);
    expect(removeFallbackModelAt(models, 2)).toEqual(models);
    expect(removeFallbackModelAt(models, 2)).not.toBe(models);
  });
});

describe('moveFallbackModel', () => {
  it('moves an item forward in the fallback chain', () => {
    expect(
      moveFallbackModel(
        ['openai/gpt-4.1-mini', 'anthropic/claude-3-5-haiku', 'openai/gpt-4.1-nano'],
        2,
        0,
      ),
    ).toEqual([
      'openai/gpt-4.1-nano',
      'openai/gpt-4.1-mini',
      'anthropic/claude-3-5-haiku',
    ]);
  });

  it('moves an item later in the fallback chain', () => {
    expect(
      moveFallbackModel(
        ['openai/gpt-4.1-mini', 'anthropic/claude-3-5-haiku', 'openai/gpt-4.1-nano'],
        0,
        2,
      ),
    ).toEqual([
      'anthropic/claude-3-5-haiku',
      'openai/gpt-4.1-nano',
      'openai/gpt-4.1-mini',
    ]);
  });

  it('returns a copy when indices are invalid or unchanged', () => {
    const models = ['openai/gpt-4.1-mini', 'anthropic/claude-3-5-haiku'];
    expect(moveFallbackModel(models, 0, 0)).toEqual(models);
    expect(moveFallbackModel(models, -1, 1)).toEqual(models);
    expect(moveFallbackModel(models, 0, 3)).toEqual(models);
    expect(moveFallbackModel(models, 0, 0)).not.toBe(models);
  });
});
