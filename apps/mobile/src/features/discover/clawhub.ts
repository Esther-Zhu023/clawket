import { buildDiscoverPrompt, clampSummary } from './helpers';
import type { ClawHubBrowsePage, ClawHubBrowseSort, DiscoverSkillDetail, DiscoverSkillItem } from './types';

const CLAWHUB_API_BASE = 'https://clawhub.ai/api/v1';
const CLAWHUB_CONVEX_QUERY_URL = 'https://wry-manatee-359.convex.cloud/api/query';

type ClawHubPackageItem = {
  name?: string;
  displayName?: string;
  summary?: string;
  ownerHandle?: string;
  updatedAt?: number;
  isOfficial?: boolean;
  latestVersion?: string | null;
  capabilityTags?: string[] | null;
  verificationTier?: string | null;
};

type ClawHubPackageSort = 'updated' | 'downloads' | 'installsAllTime';

type ClawHubSearchResponse = {
  results?: Array<{
    package?: ClawHubPackageItem & {
      family?: string;
      channel?: string;
    };
    score?: number;
  }>;
};

type ClawHubListResponse = {
  items?: ClawHubPackageItem[];
};

type ClawHubDetailResponse = {
  package?: ClawHubPackageItem & {
    family?: string;
    channel?: string;
  };
  owner?: {
    handle?: string | null;
  };
  latestVersion?: {
    version?: string | null;
  };
};

type ClawHubSkillDetailResponse = {
  skill?: {
    slug?: string;
    displayName?: string;
    summary?: string;
    stats?: {
      installsAllTime?: number | null;
      installsCurrent?: number | null;
      downloads?: number | null;
      stars?: number | null;
      versions?: number | null;
    } | null;
    tags?: {
      latest?: string | null;
    } | null;
  };
  latestVersion?: {
    version?: string | null;
    createdAt?: number | null;
    changelog?: string | null;
    license?: string | null;
  };
  owner?: {
    handle?: string | null;
    displayName?: string | null;
    image?: string | null;
  };
  metadata?: {
    os?: string[] | null;
    systems?: string[] | null;
  } | null;
};

type ClawHubSkillStats = {
  installs: number | null;
  downloads: number | null;
  stars: number | null;
};

type ClawHubHighlightedSkillResponse = Array<{
  ownerHandle?: string | null;
  owner?: {
    handle?: string | null;
    displayName?: string | null;
  } | null;
  latestVersion?: {
    version?: string | null;
  } | null;
  skill?: {
    slug?: string | null;
    displayName?: string | null;
    summary?: string | null;
    badges?: {
      official?: unknown;
      highlighted?: unknown;
    } | null;
    stats?: {
      installsAllTime?: number | null;
      installsCurrent?: number | null;
      downloads?: number | null;
      stars?: number | null;
    } | null;
  } | null;
}>;

type ClawHubPublicPageV4Response = {
  page?: ClawHubHighlightedSkillResponse | null;
  hasMore?: boolean | null;
  nextCursor?: string | null;
};

const skillStatsCache = new Map<string, ClawHubSkillStats>();

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ClawHub request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ClawHub request failed: ${response.status}`);
  }
  return response.text();
}

async function postConvexQuery<T>(path: string, args: object): Promise<T> {
  const response = await fetch(CLAWHUB_CONVEX_QUERY_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      path,
      format: 'convex_encoded_json',
      args: [args],
    }),
  });
  if (!response.ok) {
    throw new Error(`ClawHub request failed: ${response.status}`);
  }
  const json = await response.json() as { status?: string; value?: T; errorMessage?: string };
  if (json.status !== 'success') {
    throw new Error(json.errorMessage || 'ClawHub request failed');
  }
  return json.value as T;
}

function mapClawHubItem(item: ClawHubPackageItem): DiscoverSkillItem | null {
  const slug = item.name?.trim();
  if (!slug) return null;
  const owner = item.ownerHandle?.trim();
  return {
    id: `clawhub:${slug}`,
    source: 'clawhub',
    slug,
    title: item.displayName?.trim() || slug,
    summary: clampSummary(item.summary ?? ''),
    author: owner || 'ClawHub',
    repository: null,
    detailUrl: owner ? `https://clawhub.ai/${owner}/${slug}` : `https://clawhub.ai/skills/${slug}`,
    installCommand: `clawhub install ${slug}`,
    installs: null,
    rankLabel: item.isOfficial ? 'Official' : null,
    tags: item.capabilityTags ?? [],
    isOfficial: item.isOfficial === true,
  };
}

function mapHighlightedClawHubItem(item: ClawHubHighlightedSkillResponse[number]): DiscoverSkillItem | null {
  const slug = item.skill?.slug?.trim();
  if (!slug) return null;
  const owner = item.ownerHandle?.trim() || item.owner?.handle?.trim();
  const allTime = item.skill?.stats?.installsAllTime ?? null;
  const current = item.skill?.stats?.installsCurrent ?? null;
  const installs = allTime ?? current;
  // installsCurrent represents skills that are currently installed (a live snapshot),
  // distinct from the all-time install counter. Surface it as a "live" signal when
  // both values are present so cards can show a real-time activity badge.
  const installsRecent = current != null && allTime != null && current > 0 && current !== allTime
    ? current
    : null;
  return {
    id: `clawhub:${slug}`,
    source: 'clawhub',
    slug,
    title: item.skill?.displayName?.trim() || slug,
    summary: clampSummary(item.skill?.summary ?? ''),
    author: owner || 'ClawHub',
    repository: null,
    detailUrl: owner ? `https://clawhub.ai/${owner}/${slug}` : `https://clawhub.ai/skills/${slug}`,
    installCommand: `clawhub install ${slug}`,
    installs,
    installsRecent,
    rankLabel: item.skill?.badges?.official ? 'Official' : 'Highlighted',
    tags: [],
    isOfficial: Boolean(item.skill?.badges?.official),
  };
}

async function fetchClawHubPublicPageV4(args: {
  dir?: 'asc' | 'desc';
  highlightedOnly?: boolean;
  nonSuspiciousOnly?: boolean;
  numItems: number;
  sort: ClawHubBrowseSort;
  cursor?: string | null;
}): Promise<ClawHubPublicPageV4Response> {
  const payload: Record<string, unknown> = {
    dir: args.dir ?? 'desc',
    highlightedOnly: args.highlightedOnly ?? false,
    nonSuspiciousOnly: args.nonSuspiciousOnly ?? true,
    numItems: args.numItems,
    sort: args.sort,
  };
  if (args.cursor) {
    payload.cursor = args.cursor;
  }
  return postConvexQuery<ClawHubPublicPageV4Response>('skills:listPublicPageV4', payload);
}

function mapPageResponse(data: ClawHubPublicPageV4Response): ClawHubBrowsePage {
  const items = (data.page ?? [])
    .map(mapHighlightedClawHubItem)
    .filter((item): item is DiscoverSkillItem => item != null);
  return {
    items,
    nextCursor: data.nextCursor ?? null,
    hasMore: Boolean(data.hasMore),
  };
}

export async function fetchClawHubBrowsePage(args: {
  sort: ClawHubBrowseSort;
  cursor?: string | null;
  numItems?: number;
  dir?: 'asc' | 'desc';
  highlightedOnly?: boolean;
}): Promise<ClawHubBrowsePage> {
  const dir = args.dir ?? (args.sort === 'name' ? 'asc' : 'desc');
  const data = await fetchClawHubPublicPageV4({
    sort: args.sort,
    dir,
    highlightedOnly: args.highlightedOnly ?? false,
    nonSuspiciousOnly: true,
    numItems: args.numItems ?? 24,
    cursor: args.cursor ?? null,
  });
  return mapPageResponse(data);
}

async function fetchClawHubPackages(
  limit: number,
  sort: ClawHubPackageSort,
  options?: { officialOnly?: boolean },
): Promise<DiscoverSkillItem[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    family: 'skill',
    sort,
  });
  if (options?.officialOnly) {
    params.set('isOfficial', 'true');
  }
  const data = await fetchJson<ClawHubListResponse>(`${CLAWHUB_API_BASE}/packages?${params.toString()}`);
  return (data.items ?? [])
    .map(mapClawHubItem)
    .filter((item): item is DiscoverSkillItem => item != null);
}

export async function fetchClawHubPopular(limit = 24): Promise<DiscoverSkillItem[]> {
  try {
    const data = await postConvexQuery<ClawHubHighlightedSkillResponse>('skills:listHighlightedPublic', { limit });
    return data
      .map(mapHighlightedClawHubItem)
      .filter((item): item is DiscoverSkillItem => item != null);
  } catch {
    return fetchClawHubPackages(limit, 'installsAllTime');
  }
}

export async function fetchClawHubTrending(limit = 24): Promise<DiscoverSkillItem[]> {
  try {
    const page = await fetchClawHubBrowsePage({ sort: 'installs', numItems: limit });
    return page.items;
  } catch {
    return fetchClawHubPackages(limit, 'downloads');
  }
}

export async function fetchClawHubLatest(limit = 24): Promise<DiscoverSkillItem[]> {
  try {
    const page = await fetchClawHubBrowsePage({ sort: 'updated', numItems: limit });
    return page.items;
  } catch {
    return fetchClawHubPackages(limit, 'updated');
  }
}

export async function fetchClawHubTopStarred(limit = 24): Promise<DiscoverSkillItem[]> {
  try {
    const page = await fetchClawHubBrowsePage({ sort: 'stars', numItems: limit });
    return page.items;
  } catch {
    return [];
  }
}

export async function fetchClawHubOfficial(limit = 24): Promise<DiscoverSkillItem[]> {
  try {
    const data = await postConvexQuery<ClawHubHighlightedSkillResponse>('skills:listHighlightedPublic', { limit: Math.max(limit * 2, 12) });
    const highlightedOfficial = data
      .map(mapHighlightedClawHubItem)
      .filter((item): item is DiscoverSkillItem => item != null && item.isOfficial === true)
      .slice(0, limit);
    if (highlightedOfficial.length > 0) {
      return highlightedOfficial;
    }
  } catch {
    // Fall back to catalog filtering below.
  }
  return fetchClawHubPackages(limit, 'installsAllTime', { officialOnly: true });
}

export async function searchClawHubSkills(query: string, limit = 12): Promise<DiscoverSkillItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const data = await fetchJson<ClawHubSearchResponse>(
    `${CLAWHUB_API_BASE}/packages/search?q=${encodeURIComponent(trimmed)}&limit=${limit}&family=skill`,
  );
  return (data.results ?? [])
    .map((entry) => entry.package)
    .map((item) => item ? mapClawHubItem(item) : null)
    .filter((item): item is DiscoverSkillItem => item != null);
}

export async function fetchClawHubDetail(slug: string, fallback?: DiscoverSkillItem): Promise<DiscoverSkillDetail> {
  const [packageData, skillData, markdownResult] = await Promise.all([
    fetchJson<ClawHubDetailResponse>(`${CLAWHUB_API_BASE}/packages/${encodeURIComponent(slug)}`),
    fetchJson<ClawHubSkillDetailResponse>(`${CLAWHUB_API_BASE}/skills/${encodeURIComponent(slug)}`),
    (async () => {
      for (const path of ['SKILL.md', 'skill.md']) {
        try {
          const value = await fetchText(
            `${CLAWHUB_API_BASE}/skills/${encodeURIComponent(slug)}/file?path=${encodeURIComponent(path)}`,
          );
          if (value.trim()) {
            return value;
          }
        } catch {
          // Ignore missing file paths and keep trying known variants.
        }
      }
      return null;
    })(),
  ]);
  const mapped = mapClawHubItem({
    ...packageData.package,
    name: packageData.package?.name ?? skillData.skill?.slug ?? slug,
    displayName: packageData.package?.displayName ?? skillData.skill?.displayName,
    summary: packageData.package?.summary ?? skillData.skill?.summary,
    ownerHandle: skillData.owner?.handle ?? packageData.owner?.handle ?? packageData.package?.ownerHandle,
    latestVersion: packageData.package?.latestVersion ?? skillData.latestVersion?.version ?? null,
  }) ?? fallback;

  if (!mapped) {
    throw new Error('Failed to load ClawHub skill');
  }

  const allTimeInstalls = skillData.skill?.stats?.installsAllTime;
  const currentInstalls = skillData.skill?.stats?.installsCurrent;

  return {
    ...mapped,
    installs: allTimeInstalls ?? currentInstalls ?? mapped.installs ?? null,
    stars: skillData.skill?.stats?.stars ?? null,
    downloads: skillData.skill?.stats?.downloads ?? null,
    tags: packageData.package?.capabilityTags ?? mapped.tags ?? [],
    markdown: markdownResult,
    externalUrl: mapped.detailUrl,
    installPrompt: buildDiscoverPrompt('clawhub', mapped),
    metadata: [
      { key: 'Author', value: skillData.owner?.displayName || mapped.author },
      ...(skillData.latestVersion?.version ? [{ key: 'Latest version', value: skillData.latestVersion.version }] : []),
      ...(skillData.latestVersion?.license ? [{ key: 'License', value: skillData.latestVersion.license }] : []),
      ...(skillData.metadata?.os?.length ? [{ key: 'OS', value: skillData.metadata.os.join(', ') }] : []),
      ...(skillData.metadata?.systems?.length ? [{ key: 'Systems', value: skillData.metadata.systems.join(', ') }] : []),
      ...(packageData.package?.verificationTier ? [{ key: 'Verification', value: packageData.package.verificationTier }] : []),
    ],
  };
}

export async function fetchClawHubSkillStats(slug: string): Promise<ClawHubSkillStats> {
  const cached = skillStatsCache.get(slug);
  if (cached) return cached;

  const data = await fetchJson<ClawHubSkillDetailResponse>(`${CLAWHUB_API_BASE}/skills/${encodeURIComponent(slug)}`);
  const installs = data.skill?.stats?.installsAllTime ?? data.skill?.stats?.installsCurrent ?? null;
  const next = {
    installs,
    downloads: data.skill?.stats?.downloads ?? null,
    stars: data.skill?.stats?.stars ?? null,
  } satisfies ClawHubSkillStats;
  skillStatsCache.set(slug, next);
  return next;
}
