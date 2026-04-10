export type ModelCostValue = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
};

export type ModelCostEditorState = {
  editable: boolean;
  hasExistingOverride: boolean;
  source: 'configured' | 'catalog' | 'none';
  blockReason?: 'provider_missing';
  cost: ModelCostValue;
};

export type ExplicitConfiguredModel = {
  provider: string;
  modelId: string;
  modelName: string;
};

type ConfigObject = Record<string, unknown>;
type ModelEntry = {
  id?: unknown;
  name?: unknown;
  cost?: unknown;
};

const ZERO_COST: ModelCostValue = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function resolveCostValue(value: unknown): ModelCostValue | null {
  if (!isRecord(value)) {
    return null;
  }
  const input = toFiniteNumber(value.input);
  const output = toFiniteNumber(value.output);
  const cacheRead = toFiniteNumber(value.cacheRead);
  const cacheWrite = toFiniteNumber(value.cacheWrite);
  if (input === null || output === null || cacheRead === null || cacheWrite === null) {
    return null;
  }
  return { input, output, cacheRead, cacheWrite };
}

function findProviderConfig(config: ConfigObject | null | undefined, provider: string): Record<string, unknown> | null {
  const providers = config?.models;
  if (!isRecord(providers)) return null;
  const providerMap = providers.providers;
  if (!isRecord(providerMap)) return null;
  const providerEntry = providerMap[provider];
  return isRecord(providerEntry) ? providerEntry : null;
}

function findModelEntry(config: ConfigObject | null | undefined, provider: string, modelId: string): ModelEntry | null {
  const providerConfig = findProviderConfig(config, provider);
  const models = providerConfig?.models;
  if (!Array.isArray(models)) return null;
  const match = models.find((entry) => isRecord(entry) && entry.id === modelId);
  return isRecord(match) ? match : null;
}

function readConfiguredModelAllowlist(config: ConfigObject | null | undefined): Record<string, unknown> | null {
  const agents = config?.agents;
  if (!isRecord(agents)) return null;
  const defaults = agents.defaults;
  if (!isRecord(defaults)) return null;
  const models = defaults.models;
  return isRecord(models) ? models : null;
}

function normalizeAllowlistKey(value: string): string {
  return value.trim().toLowerCase();
}

export function listExplicitProviders(config: ConfigObject | null | undefined): string[] {
  const providers = config?.models;
  if (!isRecord(providers)) return [];
  const providerMap = providers.providers;
  if (!isRecord(providerMap)) return [];
  return Object.keys(providerMap)
    .map((provider) => provider.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export function listExplicitConfiguredModels(config: ConfigObject | null | undefined): ExplicitConfiguredModel[] {
  const providers = config?.models;
  if (!isRecord(providers)) return [];
  const providerMap = providers.providers;
  if (!isRecord(providerMap)) return [];

  const rows: ExplicitConfiguredModel[] = [];
  for (const [provider, providerEntry] of Object.entries(providerMap)) {
    if (!isRecord(providerEntry) || !Array.isArray(providerEntry.models)) {
      continue;
    }
    for (const model of providerEntry.models) {
      if (!isRecord(model)) {
        continue;
      }
      const modelId = typeof model.id === 'string' ? model.id.trim() : '';
      if (!modelId) {
        continue;
      }
      const modelName = typeof model.name === 'string' && model.name.trim()
        ? model.name.trim()
        : modelId;
      rows.push({
        provider,
        modelId,
        modelName,
      });
    }
  }

  return rows.sort((a, b) => {
    const providerCompare = a.provider.localeCompare(b.provider);
    if (providerCompare !== 0) return providerCompare;
    return a.modelName.localeCompare(b.modelName);
  });
}

export function hasExplicitModelAllowlist(config: ConfigObject | null | undefined): boolean {
  const allowlist = readConfiguredModelAllowlist(config);
  return !!allowlist && Object.keys(allowlist).length > 0;
}

export function listConfiguredModelAllowlistRefs(config: ConfigObject | null | undefined): string[] {
  const allowlist = readConfiguredModelAllowlist(config);
  if (!allowlist) return [];
  return Object.keys(allowlist)
    .map((key) => key.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export function isModelInAllowlist(config: ConfigObject | null | undefined, provider: string, modelId: string): boolean {
  const allowlist = readConfiguredModelAllowlist(config);
  if (!allowlist) return false;
  const targetKey = normalizeAllowlistKey(`${provider}/${modelId}`);
  return Object.keys(allowlist).some((key) => normalizeAllowlistKey(key) === targetKey);
}

export function hasConfiguredModel(config: ConfigObject | null | undefined, provider: string, modelId: string): boolean {
  return !!findModelEntry(config, provider, modelId);
}

export function resolveModelCostEditorState(params: {
  config: ConfigObject | null | undefined;
  provider: string;
  modelId: string;
  catalogCost?: ModelCostValue | null;
}): ModelCostEditorState {
  const providerConfig = findProviderConfig(params.config, params.provider);
  if (!providerConfig) {
    return {
      editable: false,
      hasExistingOverride: false,
      source: params.catalogCost ? 'catalog' : 'none',
      blockReason: 'provider_missing',
      cost: params.catalogCost ?? ZERO_COST,
    };
  }

  const modelEntry = findModelEntry(params.config, params.provider, params.modelId);
  const configuredCost = resolveCostValue(modelEntry?.cost);
  if (configuredCost) {
    return {
      editable: true,
      hasExistingOverride: true,
      source: 'configured',
      cost: configuredCost,
    };
  }

  return {
    editable: true,
    hasExistingOverride: false,
    source: params.catalogCost ? 'catalog' : 'none',
    cost: params.catalogCost ?? ZERO_COST,
  };
}

export function buildModelCostPatch(params: {
  config: ConfigObject | null | undefined;
  provider: string;
  modelId: string;
  modelName: string;
  cost: ModelCostValue;
}): Record<string, unknown> | null {
  const providerConfig = findProviderConfig(params.config, params.provider);
  if (!providerConfig) {
    return null;
  }

  const existingEntry = findModelEntry(params.config, params.provider, params.modelId);
  const patchEntry: Record<string, unknown> = {
    id: params.modelId,
    cost: {
      input: params.cost.input,
      output: params.cost.output,
      cacheRead: params.cost.cacheRead,
      cacheWrite: params.cost.cacheWrite,
    },
  };

  if (!existingEntry) {
    patchEntry.name = params.modelName;
  }

  return {
    models: {
      providers: {
        [params.provider]: {
          models: [patchEntry],
        },
      },
    },
  };
}

export function buildAddModelPatch(params: {
  config: ConfigObject | null | undefined;
  provider: string;
  modelId: string;
  modelName: string;
}): Record<string, unknown> | null {
  const providerConfig = findProviderConfig(params.config, params.provider);
  const isExplicitProvider = !!providerConfig;

  if (isExplicitProvider && hasConfiguredModel(params.config, params.provider, params.modelId)) {
    return null;
  }

  const patch: Record<string, unknown> = {};

  if (isExplicitProvider) {
    patch.models = {
      providers: {
        [params.provider]: {
          models: [
            {
              id: params.modelId,
              name: params.modelName,
            },
          ],
        },
      },
    };
  }

  const allowlist = readConfiguredModelAllowlist(params.config);
  if (!isExplicitProvider || (allowlist && Object.keys(allowlist).length > 0)) {
    const ref = `${params.provider}/${params.modelId}`;
    if (isModelInAllowlist(params.config, params.provider, params.modelId)) {
      if (!isExplicitProvider) return null;
    } else {
      const entry: Record<string, unknown> = {};
      if (params.modelName && params.modelName !== params.modelId) {
        entry.alias = params.modelName;
      }
      patch.agents = {
        defaults: {
          models: {
            [ref]: entry,
          },
        },
      };
    }
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

export function buildModelAllowlistPatch(params: {
  config: ConfigObject | null | undefined;
  provider: string;
  modelId: string;
  enabled: boolean;
}): Record<string, unknown> | null {
  const key = `${params.provider}/${params.modelId}`;
  const inAllowlist = isModelInAllowlist(params.config, params.provider, params.modelId);

  if (params.enabled === inAllowlist) {
    return null;
  }

  return {
    agents: {
      defaults: {
        models: {
          [key]: params.enabled ? {} : null,
        },
      },
    },
  };
}

export function buildBatchModelAllowlistPatch(params: {
  config: ConfigObject | null | undefined;
  changes: Array<{
    provider: string;
    modelId: string;
    enabled: boolean;
  }>;
}): Record<string, unknown> | null {
  const modelsPatch: Record<string, {} | null> = {};

  for (const change of params.changes) {
    const key = `${change.provider}/${change.modelId}`;
    const inAllowlist = isModelInAllowlist(params.config, change.provider, change.modelId);
    if (change.enabled === inAllowlist) {
      continue;
    }
    modelsPatch[key] = change.enabled ? {} : null;
  }

  if (Object.keys(modelsPatch).length === 0) {
    return null;
  }

  return {
    agents: {
      defaults: {
        models: modelsPatch,
      },
    },
  };
}

export function areModelCostsEqual(a: ModelCostValue, b: ModelCostValue): boolean {
  return (
    a.input === b.input
    && a.output === b.output
    && a.cacheRead === b.cacheRead
    && a.cacheWrite === b.cacheWrite
  );
}
