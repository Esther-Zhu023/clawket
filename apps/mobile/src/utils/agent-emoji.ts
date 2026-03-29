const EMOJI_CLUSTER_PATTERN = /(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\p{Emoji_Modifier})?)*)/u;

export const DEFAULT_AGENT_EMOJI = '🤖';

function getGraphemeSegments(value: string): string[] {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') {
    return [];
  }

  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return Array.from(segmenter.segment(value), ({ segment }) => segment);
}

export function extractDisplayAgentEmoji(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const graphemes = getGraphemeSegments(trimmed);
  for (const grapheme of graphemes) {
    const match = grapheme.match(EMOJI_CLUSTER_PATTERN);
    if (match?.[0] === grapheme) {
      return grapheme;
    }
  }

  const fallbackMatch = trimmed.match(EMOJI_CLUSTER_PATTERN);
  return fallbackMatch?.[0] ?? null;
}

export function getDisplayAgentEmoji(
  value?: string | null,
  fallback: string = DEFAULT_AGENT_EMOJI,
): string {
  return extractDisplayAgentEmoji(value) ?? fallback;
}
