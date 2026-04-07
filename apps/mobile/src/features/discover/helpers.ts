import type { DiscoverSkillItem, DiscoverSource } from './types';

const CLAWHUB_BASE_URL = 'https://clawhub.ai';
const SKILLS_SH_BASE_URL = 'https://skills.sh';

export function clampSummary(value: string, maxLength = 180): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function stripHtml(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function normalizeMarkdownWhitespace(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sanitizeCodeContent(input: string): string {
  return decodeHtmlEntities(input)
    .replace(/<span[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?code[^>]*>/gi, '')
    .replace(/<\/?pre[^>]*>/gi, '')
    .trim();
}

function replaceInlineNodes(input: string): string {
  return decodeHtmlEntities(input)
    .replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_match: string, href: string, text: string) => {
      const label = stripHtml(text).trim() || href;
      return `[${label}](${href})`;
    })
    .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, (_match: string, _tag: string, text: string) => `**${stripHtml(text).trim()}**`)
    .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, (_match: string, _tag: string, text: string) => `*${stripHtml(text).trim()}*`)
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_match: string, text: string) => `\`${sanitizeCodeContent(text)}\``)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/?(span|div)[^>]*>/gi, '')
    .replace(/&nbsp;/g, ' ');
}

function convertList(html: string, ordered: boolean): string {
  const itemPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const lines: string[] = [];
  let index = 1;
  let match: RegExpExecArray | null;

  while ((match = itemPattern.exec(html)) != null) {
    const content = htmlToMarkdown(match[1]).trim();
    if (!content) continue;
    const marker = ordered ? `${index}. ` : '- ';
    const formatted = content
      .split('\n')
      .map((line, lineIndex) => (lineIndex === 0 ? `${marker}${line}` : `   ${line}`))
      .join('\n');
    lines.push(formatted);
    index += 1;
  }

  return lines.join('\n');
}

function convertTable(html: string): string {
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellPattern = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
  const rows: string[][] = [];
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowPattern.exec(html)) != null) {
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellPattern.exec(rowMatch[1])) != null) {
      const value = htmlToMarkdown(cellMatch[2]).replace(/\n+/g, ' ').trim();
      cells.push(value);
    }
    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) return '';
  const columnCount = Math.max(...rows.map((row) => row.length));
  const paddedRows = rows.map((row) => [...row, ...Array.from({ length: columnCount - row.length }, () => '')]);
  const header = paddedRows[0];
  const separator = Array.from({ length: columnCount }, () => '---');
  const body = paddedRows.slice(1);

  return [
    `| ${header.join(' | ')} |`,
    `| ${separator.join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

export function htmlToMarkdown(input: string): string {
  let markdown = decodeHtmlEntities(input);

  markdown = markdown.replace(/<pre[^>]*>\s*<code(?:[^>]*class="[^"]*language-([^"\s]+)[^"]*")?[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_match: string, language: string | undefined, code: string) => {
    const codeContent = sanitizeCodeContent(code);
    const lang = language?.trim() ?? '';
    return `\n\n\`\`\`${lang}\n${codeContent}\n\`\`\`\n\n`;
  });

  markdown = markdown.replace(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi, (_match: string, tag: string, text: string) => {
    const depth = Number.parseInt(tag.slice(1), 10);
    return `\n\n${'#'.repeat(depth)} ${htmlToMarkdown(text).trim()}\n\n`;
  });

  markdown = markdown.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_match: string, content: string) => {
    const lines = htmlToMarkdown(content)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `> ${line}`)
      .join('\n');
    return `\n\n${lines}\n\n`;
  });

  markdown = markdown.replace(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi, (_match: string, tag: string, content: string) => {
    const list = convertList(content, tag.toLowerCase() === 'ol');
    return list ? `\n\n${list}\n\n` : '\n\n';
  });

  markdown = markdown.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_match: string, content: string) => {
    const table = convertTable(content);
    return table ? `\n\n${table}\n\n` : '\n\n';
  });

  markdown = replaceInlineNodes(markdown)
    .replace(/<\/?(ul|ol|li|thead|tbody|tr|td|th)[^>]*>/gi, '')
    .replace(/<\/?[^>]+>/g, '');

  return normalizeMarkdownWhitespace(markdown);
}

export function buildClawHubPrompt(item: Pick<DiscoverSkillItem, 'slug' | 'detailUrl' | 'title'>): string {
  return [
    'Install this ClawHub skill for me.',
    '',
    `Skill: ${item.title}`,
    `Slug: ${item.slug}`,
    `Detail URL: ${item.detailUrl}`,
    '',
    `Suggested command: clawhub install ${item.slug}`,
    '',
    'Please install it in the current workspace and tell me whether it succeeded.',
  ].join('\n');
}

export function buildSkillsShPrompt(item: Pick<DiscoverSkillItem, 'title' | 'detailUrl' | 'repository' | 'installCommand'>): string {
  return [
    'Install this skills.sh skill for me.',
    '',
    `Skill: ${item.title}`,
    `Detail URL: ${item.detailUrl}`,
    item.repository ? `Repository: ${item.repository}` : null,
    item.installCommand ? `Suggested install command: ${item.installCommand}` : null,
    '',
    'Please install it in the appropriate workspace and tell me whether it succeeded.',
  ].filter(Boolean).join('\n');
}

export function buildDiscoverPrompt(source: DiscoverSource, item: Pick<DiscoverSkillItem, 'slug' | 'title' | 'detailUrl' | 'repository' | 'installCommand'>): string {
  if (source === 'skills_sh') {
    return buildSkillsShPrompt(item);
  }
  return buildClawHubPrompt(item);
}

export function interleaveSkillLists(lists: DiscoverSkillItem[][], limit: number): DiscoverSkillItem[] {
  const next: DiscoverSkillItem[] = [];
  const seen = new Set<string>();
  let cursor = 0;

  while (next.length < limit) {
    let addedInRound = false;
    for (const list of lists) {
      const item = list[cursor];
      if (!item) continue;
      const dedupeKey = `${item.source}:${item.slug}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      next.push(item);
      addedInRound = true;
      if (next.length >= limit) break;
    }
    if (!addedInRound) break;
    cursor += 1;
  }

  return next;
}

export function resolveSourceLabel(source: DiscoverSource): 'ClawHub' | 'skills.sh' {
  return source === 'clawhub' ? 'ClawHub' : 'skills.sh';
}

export const DISCOVER_SOURCE_URLS = {
  clawhub: CLAWHUB_BASE_URL,
  skills_sh: SKILLS_SH_BASE_URL,
} as const;
