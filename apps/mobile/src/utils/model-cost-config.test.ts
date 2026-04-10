import {
  areModelCostsEqual,
  buildAddModelPatch,
  buildBatchModelAllowlistPatch,
  buildModelAllowlistPatch,
  buildModelCostPatch,
  hasConfiguredModel,
  hasExplicitModelAllowlist,
  isModelInAllowlist,
  listConfiguredModelAllowlistRefs,
  listExplicitConfiguredModels,
  listExplicitProviders,
  resolveModelCostEditorState,
  type ModelCostValue,
} from './model-cost-config';

const CATALOG_COST: ModelCostValue = {
  input: 1.25,
  output: 5,
  cacheRead: 0.25,
  cacheWrite: 1.5,
};

describe('model-cost-config', () => {
  it('lists explicit providers in sorted order', () => {
    expect(listExplicitProviders({
      models: {
        providers: {
          zed: { baseUrl: 'https://z.example.com', models: [] },
          openai: { baseUrl: 'https://api.openai.com/v1', models: [] },
        },
      },
    })).toEqual(['openai', 'zed']);
  });

  it('lists explicitly configured models', () => {
    expect(listExplicitConfiguredModels({
      models: {
        providers: {
          openai: {
            baseUrl: 'https://api.openai.com/v1',
            models: [{ id: 'gpt-5', name: 'GPT-5' }],
          },
          anthropic: {
            baseUrl: 'https://api.anthropic.com',
            models: [{ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' }],
          },
        },
      },
    })).toEqual([
      { provider: 'anthropic', modelId: 'claude-sonnet-4-6', modelName: 'Claude Sonnet 4.6' },
      { provider: 'openai', modelId: 'gpt-5', modelName: 'GPT-5' },
    ]);
  });

  it('uses configured override when model exists in provider config', () => {
    const state = resolveModelCostEditorState({
      config: {
        models: {
          providers: {
            openai: {
              baseUrl: 'https://api.openai.com/v1',
              models: [
                {
                  id: 'gpt-5',
                  name: 'GPT-5',
                  cost: CATALOG_COST,
                },
              ],
            },
          },
        },
      },
      provider: 'openai',
      modelId: 'gpt-5',
      catalogCost: null,
    });

    expect(state).toEqual({
      editable: true,
      hasExistingOverride: true,
      source: 'configured',
      cost: CATALOG_COST,
    });
  });

  it('falls back to catalog cost for configured provider without explicit model override', () => {
    const state = resolveModelCostEditorState({
      config: {
        models: {
          providers: {
            openai: {
              baseUrl: 'https://api.openai.com/v1',
              models: [],
            },
          },
        },
      },
      provider: 'openai',
      modelId: 'gpt-5',
      catalogCost: CATALOG_COST,
    });

    expect(state).toEqual({
      editable: true,
      hasExistingOverride: false,
      source: 'catalog',
      cost: CATALOG_COST,
    });
  });

  it('blocks editing when provider is not explicitly configured', () => {
    const state = resolveModelCostEditorState({
      config: {
        models: {
          providers: {},
        },
      },
      provider: 'openai',
      modelId: 'gpt-5',
      catalogCost: CATALOG_COST,
    });

    expect(state).toEqual({
      editable: false,
      hasExistingOverride: false,
      source: 'catalog',
      blockReason: 'provider_missing',
      cost: CATALOG_COST,
    });
  });

  it('builds a minimal merge patch for an existing model', () => {
    const patch = buildModelCostPatch({
      config: {
        models: {
          providers: {
            openai: {
              baseUrl: 'https://api.openai.com/v1',
              models: [{ id: 'gpt-5', name: 'GPT-5' }],
            },
          },
        },
      },
      provider: 'openai',
      modelId: 'gpt-5',
      modelName: 'GPT-5',
      cost: CATALOG_COST,
    });

    expect(patch).toEqual({
      models: {
        providers: {
          openai: {
            models: [
              {
                id: 'gpt-5',
                cost: CATALOG_COST,
              },
            ],
          },
        },
      },
    });
  });

  it('adds the name when creating a new model override in an existing provider', () => {
    const patch = buildModelCostPatch({
      config: {
        models: {
          providers: {
            openai: {
              baseUrl: 'https://api.openai.com/v1',
              models: [],
            },
          },
        },
      },
      provider: 'openai',
      modelId: 'gpt-5',
      modelName: 'GPT-5',
      cost: CATALOG_COST,
    });

    expect(patch).toEqual({
      models: {
        providers: {
          openai: {
            models: [
              {
                id: 'gpt-5',
                name: 'GPT-5',
                cost: CATALOG_COST,
              },
            ],
          },
        },
      },
    });
  });

  it('refuses to build a patch when provider config is missing', () => {
    const patch = buildModelCostPatch({
      config: { models: { providers: {} } },
      provider: 'openai',
      modelId: 'gpt-5',
      modelName: 'GPT-5',
      cost: CATALOG_COST,
    });

    expect(patch).toBeNull();
  });

  it('detects whether a model already exists in the explicit provider config', () => {
    expect(hasConfiguredModel({
      models: {
        providers: {
          openai: {
            baseUrl: 'https://api.openai.com/v1',
            models: [{ id: 'gpt-5', name: 'GPT-5' }],
          },
        },
      },
    }, 'openai', 'gpt-5')).toBe(true);

    expect(hasConfiguredModel({
      models: {
        providers: {
          openai: {
            baseUrl: 'https://api.openai.com/v1',
            models: [{ id: 'gpt-5', name: 'GPT-5' }],
          },
        },
      },
    }, 'openai', 'gpt-5-mini')).toBe(false);
  });

  it('tracks raw allowlist membership independently of effective visibility', () => {
    const config = {
      agents: {
        defaults: {
          models: {
            'openai/gpt-5': {},
          },
        },
      },
    };

    expect(hasExplicitModelAllowlist(config)).toBe(true);
    expect(listConfiguredModelAllowlistRefs(config)).toEqual(['openai/gpt-5']);
    expect(isModelInAllowlist(config, 'openai', 'gpt-5')).toBe(true);
    expect(isModelInAllowlist(config, 'openai', 'gpt-5.4-pro')).toBe(false);
  });

  it('builds a minimal patch for adding a new model to an explicit provider', () => {
    const patch = buildAddModelPatch({
      config: {
        models: {
          providers: {
            openai: {
              baseUrl: 'https://api.openai.com/v1',
              models: [{ id: 'gpt-5', name: 'GPT-5' }],
            },
          },
        },
      },
      provider: 'openai',
      modelId: 'gpt-5.4-pro',
      modelName: 'GPT-5.4 Pro',
    });

    expect(patch).toEqual({
      models: {
        providers: {
          openai: {
            models: [
              {
                id: 'gpt-5.4-pro',
                name: 'GPT-5.4 Pro',
              },
            ],
          },
        },
      },
    });
  });

  it('adds the new model to agents.defaults.models when a non-empty allowlist already exists', () => {
    const patch = buildAddModelPatch({
      config: {
        models: {
          providers: {
            openai: {
              baseUrl: 'https://api.openai.com/v1',
              models: [{ id: 'gpt-5', name: 'GPT-5' }],
            },
          },
        },
        agents: {
          defaults: {
            models: {
              'openai/gpt-5': {},
            },
          },
        },
      },
      provider: 'openai',
      modelId: 'gpt-5.4-pro',
      modelName: 'GPT-5.4 Pro',
    });

    expect(patch).toEqual({
      models: {
        providers: {
          openai: {
            models: [
              {
                id: 'gpt-5.4-pro',
                name: 'GPT-5.4 Pro',
              },
            ],
          },
        },
      },
      agents: {
        defaults: {
          models: {
            'openai/gpt-5.4-pro': { alias: 'GPT-5.4 Pro' },
          },
        },
      },
    });
  });

  it('refuses to add a duplicate model to an explicit provider', () => {
    const patch = buildAddModelPatch({
      config: {
        models: {
          providers: {
            openai: {
              baseUrl: 'https://api.openai.com/v1',
              models: [{ id: 'gpt-5', name: 'GPT-5' }],
            },
          },
        },
      },
      provider: 'openai',
      modelId: 'gpt-5',
      modelName: 'GPT-5',
    });

    expect(patch).toBeNull();
  });

  it('builds a patch for enabling a model in the allowlist', () => {
    const patch = buildModelAllowlistPatch({
      config: {
        agents: {
          defaults: {
            models: {
              'openai/gpt-5': {},
            },
          },
        },
      },
      provider: 'openai',
      modelId: 'gpt-5.4-pro',
      enabled: true,
    });

    expect(patch).toEqual({
      agents: {
        defaults: {
          models: {
            'openai/gpt-5.4-pro': {},
          },
        },
      },
    });
  });

  it('builds a patch for disabling a model in the allowlist', () => {
    const patch = buildModelAllowlistPatch({
      config: {
        agents: {
          defaults: {
            models: {
              'openai/gpt-5.4-pro': {},
            },
          },
        },
      },
      provider: 'openai',
      modelId: 'gpt-5.4-pro',
      enabled: false,
    });

    expect(patch).toEqual({
      agents: {
        defaults: {
          models: {
            'openai/gpt-5.4-pro': null,
          },
        },
      },
    });
  });

  it('does not build an allowlist patch when the membership is unchanged', () => {
    expect(buildModelAllowlistPatch({
      config: {
        agents: {
          defaults: {
            models: {
              'openai/gpt-5': {},
            },
          },
        },
      },
      provider: 'openai',
      modelId: 'gpt-5',
      enabled: true,
    })).toBeNull();
  });

  it('builds a single batch patch for mixed allowlist changes', () => {
    const patch = buildBatchModelAllowlistPatch({
      config: {
        agents: {
          defaults: {
            models: {
              'openai/gpt-5': {},
              'anthropic/claude-sonnet-4-6': {},
            },
          },
        },
      },
      changes: [
        { provider: 'openai', modelId: 'gpt-5', enabled: false },
        { provider: 'openai', modelId: 'gpt-5.4-pro', enabled: true },
        { provider: 'anthropic', modelId: 'claude-sonnet-4-6', enabled: true },
      ],
    });

    expect(patch).toEqual({
      agents: {
        defaults: {
          models: {
            'openai/gpt-5': null,
            'openai/gpt-5.4-pro': {},
          },
        },
      },
    });
  });

  it('skips a batch allowlist patch when every membership is unchanged', () => {
    expect(buildBatchModelAllowlistPatch({
      config: {
        agents: {
          defaults: {
            models: {
              'openai/gpt-5': {},
            },
          },
        },
      },
      changes: [
        { provider: 'openai', modelId: 'gpt-5', enabled: true },
      ],
    })).toBeNull();
  });

  it('compares model costs exactly', () => {
    expect(areModelCostsEqual(CATALOG_COST, { ...CATALOG_COST })).toBe(true);
    expect(areModelCostsEqual(CATALOG_COST, { ...CATALOG_COST, output: 6 })).toBe(false);
  });
});
