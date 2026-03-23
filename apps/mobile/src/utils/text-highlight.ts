export type HighlightSegment = {
  text: string;
  match: boolean;
};

/**
 * Split text into matched/non-matched segments for case-insensitive highlighting.
 */
export function splitHighlightSegments(text: string, query: string): HighlightSegment[] {
  if (!text) return [{ text: '', match: false }];

  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [{ text, match: false }];

  const lowerText = text.toLowerCase();
  const lowerQuery = normalizedQuery.toLowerCase();

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const foundAt = lowerText.indexOf(lowerQuery, cursor);
    if (foundAt < 0) {
      segments.push({ text: text.slice(cursor), match: false });
      break;
    }

    if (foundAt > cursor) {
      segments.push({ text: text.slice(cursor, foundAt), match: false });
    }

    segments.push({
      text: text.slice(foundAt, foundAt + normalizedQuery.length),
      match: true,
    });
    cursor = foundAt + normalizedQuery.length;
  }

  return segments.length > 0 ? segments : [{ text, match: false }];
}

