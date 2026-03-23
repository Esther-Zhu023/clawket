import {
  analyzeModelDeletion,
  buildDeleteModelConfig,
} from './model-config-delete';

describe('model-config-delete', () => {
  it('blocks deletion when the model is not explicitly configured', () => {
    const result = analyzeModelDeletion({
      config: {},
      provider: 'openai',
      modelId: 'gpt-5.4',
    });

    expect(result.canDelete).toBe(false);
    expect(result.hasConfiguredModel).toBe(false);
    expect(result.hasAllowlistEntry).toBe(false);
    expect(result.blocks).toEqual([
      {
        path: 'models.providers',
        reason: 'model_not_configured',
      },
    ]);
  });

  it('blocks deletion when the model is used as a primary reference', () => {
    const result = analyzeModelDeletion({
      config: {
        models: {
          providers: {
            openai: {
              baseUrl: 'https://api.openai.com/v1',
              models: [{ id: 'gpt-5.4', name: 'GPT 5.4' }],
            },
          },
        },
        agents: {
          defaults: {
            model: { primary: 'openai/gpt-5.4' },
          },
        },
      },
      provider: 'openai',
      modelId: 'gpt-5.4',
    });

    expect(result.canDelete).toBe(false);
    expect(result.blocks).toEqual([
      {
        path: 'agents.defaults.model.primary',
        reason: 'defaults_primary',
      },
    ]);
  });

  it('removes the configured model, allowlist entry, and fallback references when safe', () => {
    const result = buildDeleteModelConfig({
      config: {
        models: {
          providers: {
            openai: {
              baseUrl: 'https://api.openai.com/v1',
              models: [
                { id: 'gpt-5.4', name: 'GPT 5.4' },
                { id: 'gpt-5.5', name: 'GPT 5.5' },
              ],
            },
          },
        },
        agents: {
          defaults: {
            models: {
              'openai/gpt-5.4': { alias: 'fast-gpt' },
            },
            model: {
              primary: 'openai/gpt-5.5',
              fallbacks: ['openai/gpt-5.4', 'fast-gpt'],
            },
            imageModel: {
              fallbacks: ['fast-gpt'],
            },
            subagents: {
              model: {
                fallbacks: ['openai/gpt-5.4'],
              },
            },
          },
          list: [
            {
              id: 'writer',
              model: {
                primary: 'openai/gpt-5.5',
                fallbacks: ['fast-gpt'],
              },
              subagents: {
                model: {
                  fallbacks: ['openai/gpt-5.4'],
                },
              },
            },
          ],
        },
      },
      provider: 'openai',
      modelId: 'gpt-5.4',
    });

    expect(result.analysis.canDelete).toBe(true);
    expect(result.analysis.hasConfiguredModel).toBe(true);
    expect(result.analysis.hasAllowlistEntry).toBe(true);
    expect(result.nextConfig).not.toBeNull();
    expect(result.nextConfig?.models).toEqual({
      providers: {
        openai: {
          baseUrl: 'https://api.openai.com/v1',
          models: [{ id: 'gpt-5.5', name: 'GPT 5.5' }],
        },
      },
    });
    expect(result.nextConfig?.agents).toEqual({
      defaults: {
        models: {},
        model: {
          primary: 'openai/gpt-5.5',
          fallbacks: [],
        },
        imageModel: {
          fallbacks: [],
        },
        subagents: {
          model: {
            fallbacks: [],
          },
        },
      },
      list: [
        {
          id: 'writer',
          model: {
            primary: 'openai/gpt-5.5',
            fallbacks: [],
          },
          subagents: {
            model: {
              fallbacks: [],
            },
          },
        },
      ],
    });
  });

  it('blocks deletion when a hook or channel override still references the model alias', () => {
    const result = analyzeModelDeletion({
      config: {
        models: {
          providers: {
            openai: {
              baseUrl: 'https://api.openai.com/v1',
              models: [{ id: 'gpt-5.4', name: 'GPT 5.4' }],
            },
          },
        },
        agents: {
          defaults: {
            models: {
              'openai/gpt-5.4': { alias: 'fast-gpt' },
            },
          },
        },
        channels: {
          modelByChannel: {
            slack: {
              ops: 'fast-gpt',
            },
          },
        },
        hooks: {
          mappings: [{ id: 'build-failures', model: 'openai/gpt-5.4' }],
        },
      },
      provider: 'openai',
      modelId: 'gpt-5.4',
    });

    expect(result.canDelete).toBe(false);
    expect(result.blocks).toEqual([
      {
        path: 'channels.modelByChannel.slack.ops',
        reason: 'channel_model_override',
        detail: 'slack/ops',
      },
      {
        path: 'hooks.mappings.0.model',
        reason: 'hook_mapping_model',
        detail: 'build-failures',
      },
    ]);
  });

  it('treats allowlist-only models as deletable without explicit provider config', () => {
    const result = buildDeleteModelConfig({
      config: {
        agents: {
          defaults: {
            models: {
              'openai/gpt-5.4': {},
            },
          },
        },
      },
      provider: 'openai',
      modelId: 'gpt-5.4',
    });

    expect(result.analysis.canDelete).toBe(true);
    expect(result.analysis.hasConfiguredModel).toBe(false);
    expect(result.analysis.hasAllowlistEntry).toBe(true);
    expect(result.analysis.cleanup).toEqual([
      {
        path: 'agents.defaults.models.openai/gpt-5.4',
        action: 'remove_allowlist_entry',
      },
    ]);
    expect(result.nextConfig).toEqual({
      agents: {
        defaults: {
          models: {},
        },
      },
    });
  });
});
