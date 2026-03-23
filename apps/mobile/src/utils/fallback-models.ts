export function sanitizeFallbackModels(
  models: string[],
  options?: { primaryModel?: string | null },
): string[] {
  const primary = options?.primaryModel?.trim() || '';
  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const raw of models) {
    const model = raw.trim();
    if (!model || model === primary || seen.has(model)) continue;
    seen.add(model);
    sanitized.push(model);
  }

  return sanitized;
}

export function addFallbackModel(
  models: string[],
  nextModel: string,
  options?: { primaryModel?: string | null },
): string[] {
  return sanitizeFallbackModels([...models, nextModel], options);
}

export function removeFallbackModelAt(models: string[], index: number): string[] {
  if (index < 0 || index >= models.length) return [...models];
  return models.filter((_, currentIndex) => currentIndex !== index);
}

export function moveFallbackModel(models: string[], fromIndex: number, toIndex: number): string[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= models.length ||
    toIndex >= models.length ||
    fromIndex === toIndex
  ) {
    return [...models];
  }

  const next = [...models];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
