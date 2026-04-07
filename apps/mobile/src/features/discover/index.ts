import {
  fetchClawHubDetail,
  fetchClawHubSkillStats,
  searchClawHubSkills,
} from './clawhub';
import {
  fetchSkillsShDetail,
  fetchSkillsShHot,
  fetchSkillsShPopular,
  searchSkillsSh,
} from './skillsSh';
import { interleaveSkillLists } from './helpers';
import type {
  DiscoverSkillDetail,
  DiscoverSkillItem,
  DiscoverSource,
  SkillsShBrowseView,
} from './types';

export { fetchClawHubBrowsePage } from './clawhub';
export type { ClawHubBrowsePage, ClawHubBrowseSort, SkillsShBrowseView } from './types';

function dedupe(items: DiscoverSkillItem[]): DiscoverSkillItem[] {
  const seen = new Set<string>();
  const next: DiscoverSkillItem[] = [];
  for (const item of items) {
    const key = `${item.source}:${item.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(item);
  }
  return next;
}

function sortByPopularity(items: DiscoverSkillItem[]): DiscoverSkillItem[] {
  return [...items].sort((a, b) => (b.installs ?? 0) - (a.installs ?? 0));
}

export async function searchDiscoverSkills(query: string): Promise<DiscoverSkillItem[]> {
  const [clawHub, skillsSh] = await Promise.all([
    searchClawHubSkills(query, 16).catch(() => []),
    searchSkillsSh(query, 16).catch(() => []),
  ]);

  return sortByPopularity(dedupe(interleaveSkillLists([clawHub, skillsSh], 32)));
}

export async function fetchDiscoverSkillDetail(source: DiscoverSource, slug: string, fallback?: DiscoverSkillItem): Promise<DiscoverSkillDetail> {
  if (source === 'skills_sh') {
    return fetchSkillsShDetail(slug, fallback);
  }
  return fetchClawHubDetail(slug, fallback);
}

export async function fetchRelatedDiscoverSkills(item: DiscoverSkillItem | DiscoverSkillDetail, limit = 6): Promise<DiscoverSkillItem[]> {
  const candidates: DiscoverSkillItem[] = [];

  if (item.source === 'clawhub') {
    const tagSeed = item.tags?.find((tag) => tag && tag.trim().length > 0);
    const queries: string[] = [];
    if (tagSeed) queries.push(tagSeed);
    if (item.author && item.author !== 'ClawHub') queries.push(item.author);

    for (const q of queries) {
      try {
        const results = await searchClawHubSkills(q, limit + 4);
        candidates.push(...results);
        if (candidates.length >= limit + 2) break;
      } catch {
        // Continue to next query.
      }
    }
  } else {
    const author = item.author?.trim();
    if (author) {
      try {
        candidates.push(...(await searchSkillsSh(author, limit + 4)));
      } catch {
        // Ignore — caller falls back to empty list.
      }
    }
  }

  const seen = new Set<string>([`${item.source}:${item.slug}`]);
  const next: DiscoverSkillItem[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.source}:${candidate.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(candidate);
    if (next.length >= limit) break;
  }
  return next;
}

export async function fetchDiscoverClawHubInstalls(slugs: string[], concurrency = 3): Promise<Record<string, number | null>> {
  const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)));
  const results: Record<string, number | null> = {};
  let cursor = 0;

  const worker = async () => {
    while (cursor < uniqueSlugs.length) {
      const slug = uniqueSlugs[cursor];
      cursor += 1;
      try {
        const stats = await fetchClawHubSkillStats(slug);
        results[slug] = stats.installs;
      } catch {
        results[slug] = null;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, uniqueSlugs.length) }, () => worker()));
  return results;
}

export async function fetchSkillsShBrowseList(view: SkillsShBrowseView, limit = 60): Promise<DiscoverSkillItem[]> {
  if (view === 'hot') return fetchSkillsShHot(limit);
  return fetchSkillsShPopular(limit);
}
