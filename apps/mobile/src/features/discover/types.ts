export type DiscoverSource = 'clawhub' | 'skills_sh';

export type DiscoverSort = 'featured' | 'popular' | 'hot';

export type ClawHubBrowseSort = 'stars' | 'installs' | 'downloads' | 'updated' | 'newest' | 'name';

export type ClawHubBrowsePage = {
  items: DiscoverSkillItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type SkillsShBrowseView = 'hot' | 'all-time';

export type DiscoverSkillItem = {
  id: string;
  source: DiscoverSource;
  slug: string;
  title: string;
  summary: string;
  author: string;
  repository?: string | null;
  detailUrl: string;
  installCommand?: string | null;
  installs?: number | null;
  installsRecent?: number | null;
  rankLabel?: string | null;
  tags?: string[];
  isOfficial?: boolean;
};

export type DiscoverSkillDetail = DiscoverSkillItem & {
  markdown?: string | null;
  externalUrl: string;
  installPrompt: string;
  stars?: number | null;
  downloads?: number | null;
  metadata: Array<{
    key: string;
    value: string;
    url?: string | null;
  }>;
};

