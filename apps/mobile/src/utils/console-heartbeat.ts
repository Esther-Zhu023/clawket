export function formatConsoleHeartbeatAge(minutesAgo: number, language: string): {
  key: 'just now' | '{{count}}m ago' | '{{count}}h ago' | '{{count}}d ago';
  count?: number;
  compactText?: string;
} {
  if (minutesAgo < 1) {
    return { key: 'just now' };
  }

  const normalizedLanguage = language.toLowerCase();
  const isSpanish = normalizedLanguage === 'es' || normalizedLanguage.startsWith('es-');
  const isGerman = normalizedLanguage === 'de' || normalizedLanguage.startsWith('de-');
  const useCompactText = isSpanish || isGerman;

  if (minutesAgo < 60) {
    return useCompactText
      ? { key: '{{count}}m ago', count: minutesAgo, compactText: `${minutesAgo} m` }
      : { key: '{{count}}m ago', count: minutesAgo };
  }

  const hours = Math.floor(minutesAgo / 60);
  if (hours < 24) {
    return useCompactText
      ? { key: '{{count}}h ago', count: hours, compactText: `${hours} h` }
      : { key: '{{count}}h ago', count: hours };
  }

  const days = Math.floor(hours / 24);
  return useCompactText
    ? { key: '{{count}}d ago', count: days, compactText: `${days} d` }
    : { key: '{{count}}d ago', count: days };
}
