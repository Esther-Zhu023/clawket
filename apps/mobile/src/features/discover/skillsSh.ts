import { buildDiscoverPrompt, clampSummary, decodeHtmlEntities, htmlToMarkdown } from './helpers';
import type { DiscoverSkillDetail, DiscoverSkillItem } from './types';

const SKILLS_SH_BASE_URL = 'https://skills.sh';
const RESERVED_OWNER_PATHS = new Set(['official', 'hot', 'docs', 'audits']);
const CACHE_TTL_MS = 5 * 60 * 1000;

type CachedValue<T> = {
  value: T;
  expiresAt: number;
};

type SkillsShLeaderboardRow = {
  source: string;
  skillId: string;
  name: string;
  installs: number;
};

let leaderboardCache: Record<'all-time' | 'hot', CachedValue<DiscoverSkillItem[]> | null> = {
  'all-time': null,
  hot: null,
};
let sitemapCache: CachedValue<DiscoverSkillItem[]> | null = null;
let officialOwnersCache: CachedValue<Set<string>> | null = null;

function makeSkillsShItem(row: SkillsShLeaderboardRow): DiscoverSkillItem {
  const [owner, repo] = row.source.split('/');
  return {
    id: `skills_sh:${row.source}:${row.skillId}`,
    source: 'skills_sh',
    slug: `${row.source}/${row.skillId}`,
    title: row.name,
    summary: clampSummary(`A skills.sh package from ${row.source}.`),
    author: owner || row.source,
    repository: `https://github.com/${row.source}`,
    detailUrl: `${SKILLS_SH_BASE_URL}/${row.source}/${row.skillId}`,
    installCommand: `npx skills add https://github.com/${row.source} --skill ${row.skillId}`,
    installs: row.installs,
    rankLabel: repo ? repo : row.source,
    tags: [],
    isOfficial: false,
  };
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`skills.sh request failed: ${response.status}`);
  }
  return response.text();
}

function readCache<T>(cache: CachedValue<T> | null): T | null {
  if (!cache) return null;
  if (Date.now() >= cache.expiresAt) return null;
  return cache.value;
}

function writeCache<T>(value: T): CachedValue<T> {
  return {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
}

function parseLeaderboardItems(html: string): DiscoverSkillItem[] {
  const pattern = /\\"source\\":\\"([^\\"]+)\\",\\"skillId\\":\\"([^\\"]+)\\",\\"name\\":\\"([^\\"]+)\\",\\"installs\\":(\d+)/g;
  const next: DiscoverSkillItem[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) != null) {
    const item = makeSkillsShItem({
      source: match[1],
      skillId: match[2],
      name: decodeHtmlEntities(match[3]),
      installs: Number.parseInt(match[4], 10) || 0,
    });
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(item);
  }

  return next;
}

function parseOfficialOwners(html: string): Set<string> {
  const owners = new Set<string>();
  const pattern = /href="\/([a-z0-9_.-]+)"/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) != null) {
    const owner = match[1]?.trim().toLowerCase();
    if (!owner || RESERVED_OWNER_PATHS.has(owner)) continue;
    owners.add(owner);
  }

  return owners;
}

async function getLeaderboard(view: 'all-time' | 'hot'): Promise<DiscoverSkillItem[]> {
  const cached = readCache(leaderboardCache[view]);
  if (cached) return cached;
  const html = await fetchText(view === 'hot' ? `${SKILLS_SH_BASE_URL}/hot` : SKILLS_SH_BASE_URL);
  const parsed = parseLeaderboardItems(html);
  leaderboardCache[view] = writeCache(parsed);
  return parsed;
}

async function getOfficialOwners(): Promise<Set<string>> {
  const cached = readCache(officialOwnersCache);
  if (cached) return cached;
  const html = await fetchText(`${SKILLS_SH_BASE_URL}/official`);
  const owners = parseOfficialOwners(html);
  officialOwnersCache = writeCache(owners);
  return owners;
}

async function getSitemapIndex(): Promise<DiscoverSkillItem[]> {
  const cached = readCache(sitemapCache);
  if (cached) return cached;

  const xml = await fetchText(`${SKILLS_SH_BASE_URL}/sitemap.xml`);
  const next: DiscoverSkillItem[] = [];
  const pattern = /<loc>https:\/\/skills\.sh\/([^<]+)<\/loc>/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(xml)) != null) {
    const path = match[1]?.trim();
    if (!path) continue;
    const parts = path.split('/').filter(Boolean);
    if (parts.length !== 3) continue;
    const [owner, repo, skillId] = parts;
    next.push({
      id: `skills_sh:${owner}/${repo}:${skillId}`,
      source: 'skills_sh',
      slug: `${owner}/${repo}/${skillId}`,
      title: skillId,
      summary: clampSummary(`A skills.sh package from ${owner}/${repo}.`),
      author: owner,
      repository: `https://github.com/${owner}/${repo}`,
      detailUrl: `${SKILLS_SH_BASE_URL}/${owner}/${repo}/${skillId}`,
      installCommand: `npx skills add https://github.com/${owner}/${repo} --skill ${skillId}`,
      installs: null,
      rankLabel: repo,
      tags: [],
      isOfficial: false,
    });
  }

  sitemapCache = writeCache(next);
  return next;
}

function scoreSkillsShSearch(item: DiscoverSkillItem, query: string): number {
  const needle = query.toLowerCase();
  const haystack = `${item.title} ${item.author} ${item.slug} ${item.summary}`.toLowerCase();
  if (!haystack.includes(needle)) return -1;

  let score = 0;
  if (item.title.toLowerCase() === needle) score += 120;
  if (item.title.toLowerCase().startsWith(needle)) score += 70;
  if (item.slug.toLowerCase().includes(needle)) score += 50;
  if (item.summary.toLowerCase().includes(needle)) score += 20;
  if (item.isOfficial) score += 15;
  if (item.installs != null) score += Math.min(40, Math.floor(Math.log10(Math.max(item.installs, 1)) * 10));
  return score;
}

export async function fetchSkillsShPopular(limit = 24): Promise<DiscoverSkillItem[]> {
  const items = await getLeaderboard('all-time');
  return items.slice(0, limit);
}

export async function fetchSkillsShHot(limit = 24): Promise<DiscoverSkillItem[]> {
  const items = await getLeaderboard('hot');
  return items.slice(0, limit);
}

export async function searchSkillsSh(query: string, limit = 12): Promise<DiscoverSkillItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const [index, popular, hot, owners] = await Promise.all([
    getSitemapIndex(),
    getLeaderboard('all-time'),
    getLeaderboard('hot'),
    getOfficialOwners(),
  ]);

  const enrichedById = new Map<string, DiscoverSkillItem>();
  for (const item of [...index, ...popular, ...hot]) {
    const existing = enrichedById.get(item.id);
    const next = {
      ...existing,
      ...item,
      installs: item.installs ?? existing?.installs ?? null,
      summary: item.summary || existing?.summary || '',
      isOfficial: owners.has(item.author.toLowerCase()),
    } satisfies DiscoverSkillItem;
    enrichedById.set(item.id, next);
  }

  return Array.from(enrichedById.values())
    .map((item) => ({ item, score: scoreSkillsShSearch(item, trimmed) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}

function captureGroup(html: string, regex: RegExp): string | null {
  const match = regex.exec(html);
  return match?.[1] ? decodeHtmlEntities(match[1]) : null;
}

export async function fetchSkillsShDetail(slug: string, fallback?: DiscoverSkillItem): Promise<DiscoverSkillDetail> {
  const detailUrl = `${SKILLS_SH_BASE_URL}/${slug}`;
  const html = await fetchText(detailUrl);
  const title = captureGroup(html, /<h1[^>]*>([^<]+)<\/h1>/i) ?? fallback?.title ?? slug.split('/').pop() ?? slug;
  const installCommand = captureGroup(html, /<code[^>]*>[\s\S]*?(npx skills add[\s\S]*?--skill [^<"]+)<\/code>/i)?.replace(/\s+/g, ' ') ?? fallback?.installCommand ?? null;
  const summary = captureGroup(
    html,
    /Summary<\/div><div[^>]*><div[^>]*><div[^>]*><p>(?:<strong>)?([\s\S]*?)(?:<\/strong>)?<\/p>/i,
  ) ?? fallback?.summary ?? '';
  const skillMdHtml = captureGroup(
    html,
    /SKILL\.md<\/span><\/div><div class="prose[^"]*">([\s\S]+?)<\/div><\/div><\/div>/i,
  );

  const [owner, repo, skillId] = slug.split('/');
  const base: DiscoverSkillItem = fallback ?? {
    id: `skills_sh:${owner}/${repo}:${skillId}`,
    source: 'skills_sh',
    slug,
    title,
    summary: clampSummary(summary),
    author: owner,
    repository: `https://github.com/${owner}/${repo}`,
    detailUrl,
    installCommand,
    installs: null,
    rankLabel: repo,
    tags: [],
    isOfficial: false,
  };

  const markdown = skillMdHtml ? htmlToMarkdown(skillMdHtml) : null;

  return {
    ...base,
    title,
    summary: clampSummary(summary || base.summary),
    installCommand,
    markdown,
    externalUrl: detailUrl,
    installPrompt: buildDiscoverPrompt('skills_sh', {
      ...base,
      title,
      installCommand,
      detailUrl,
    }),
    metadata: [
      {
        key: 'Author',
        value: owner,
        url: `${SKILLS_SH_BASE_URL}/${owner}`,
      },
      {
        key: 'Repository',
        value: `${owner}/${repo}`,
        url: `https://github.com/${owner}/${repo}`,
      },
    ],
  };
}
