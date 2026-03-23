import type { ModelInfo } from './ModelPickerModal';

export type ModelSection = {
  title: string;
  provider: string;
  data: ModelInfo[];
};

function normalize(value: string | undefined | null): string {
  return (value ?? '').trim().toLowerCase();
}

function normalizeProvider(provider: string): string {
  return provider.trim() || 'unknown';
}

function formatProvider(provider: string): string {
  if (!provider) return 'Unknown';
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function modelMatchesQuery(model: ModelInfo, query: string): boolean {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;
  return (
    normalize(model.name).includes(normalizedQuery)
    || normalize(model.id).includes(normalizedQuery)
    || normalize(model.provider).includes(normalizedQuery)
  );
}

export function resolveProviderModel(model: ModelInfo): string {
  const modelRef = model.id.trim() || model.name;
  if (modelRef.includes('/')) return modelRef;
  const provider = model.provider.trim() || 'unknown';
  return `${provider}/${modelRef}`;
}

export function buildModelSections(models: ModelInfo[], query: string): ModelSection[] {
  const providerMap = new Map<string, ModelInfo[]>();

  for (const model of models) {
    if (!modelMatchesQuery(model, query)) continue;
    const provider = normalizeProvider(model.provider);
    const group = providerMap.get(provider);
    if (group) {
      group.push(model);
    } else {
      providerMap.set(provider, [model]);
    }
  }

  return Array.from(providerMap.entries())
    .sort(([providerA], [providerB]) => providerA.localeCompare(providerB))
    .map(([provider, group]) => ({
      title: formatProvider(provider),
      provider,
      data: [...group].sort((modelA, modelB) => {
        const left = normalize(modelA.name || modelA.id);
        const right = normalize(modelB.name || modelB.id);
        return left.localeCompare(right);
      }),
    }));
}

export function isModelSelected(args: {
  item: ModelInfo;
  selectedModelId?: string;
  defaultModel?: string;
  defaultProvider?: string;
}): boolean {
  const { item, selectedModelId, defaultModel, defaultProvider } = args;
  const resolved = resolveProviderModel(item);
  if (selectedModelId != null) {
    return item.id === selectedModelId || resolved === selectedModelId;
  }

  const normalizedDefaultProvider = normalize(defaultProvider);
  const normalizedItemProvider = normalize(item.provider);
  const normalizedDefaultModel = normalize(defaultModel);
  return (
    normalizedDefaultModel.length > 0
    && normalizedDefaultModel === normalize(item.id || item.name)
    && (!normalizedDefaultProvider || normalizedDefaultProvider === normalizedItemProvider)
  );
}

export function shouldShowDefaultRow(query: string, showDefault: boolean): boolean {
  if (!showDefault) return false;
  const normalizedQuery = normalize(query);
  return normalizedQuery.length === 0 || 'default'.includes(normalizedQuery);
}

export function normalizeModelProvider(provider: string): string {
  return normalizeProvider(provider);
}
