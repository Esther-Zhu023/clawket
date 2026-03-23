import { buildModelSections, resolveProviderModel } from './model-picker-data';

describe('ModelPickerModal helpers', () => {
  it('groups models by provider and sorts providers and models', () => {
    const sections = buildModelSections([
      { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'anthropic' },
      { id: 'gpt-5', name: 'GPT-5', provider: 'openai' },
      { id: 'claude-opus-4-1', name: 'Claude Opus 4.1', provider: 'anthropic' },
    ], '');

    expect(sections.map((section) => section.provider)).toEqual(['anthropic', 'openai']);
    expect(sections[0]?.data.map((model) => model.id)).toEqual([
      'claude-opus-4-1',
      'claude-sonnet-4-5',
    ]);
  });

  it('keeps provider grouping when filtering by search query', () => {
    const sections = buildModelSections([
      { id: 'gpt-5', name: 'GPT-5', provider: 'openai' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 mini', provider: 'openai' },
      { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'anthropic' },
    ], 'gpt');

    expect(sections).toHaveLength(1);
    expect(sections[0]?.provider).toBe('openai');
    expect(sections[0]?.data).toHaveLength(2);
  });

  it('builds provider-qualified model ids when missing from source id', () => {
    expect(resolveProviderModel({
      id: 'gpt-5',
      name: 'GPT-5',
      provider: 'openai',
    })).toBe('openai/gpt-5');
  });
});
