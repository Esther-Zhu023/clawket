export function parseLookbackToMs(input?: string | null): number | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;
  const matched = trimmed.match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!matched) {
    throw new Error(`Invalid --last value "${trimmed}". Use values like 30s, 2m, 1h, or 1d.`);
  }
  const value = Number(matched[1]);
  const unit = matched[2].toLowerCase();
  const factor = unit === 'ms'
    ? 1
    : unit === 's'
      ? 1_000
      : unit === 'm'
        ? 60_000
        : unit === 'h'
          ? 3_600_000
          : 86_400_000;
  return value * factor;
}
