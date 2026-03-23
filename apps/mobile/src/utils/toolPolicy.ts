// Tool policy resolution — mirrors gateway dashboard logic for per-tool toggles.

export type ToolProfileId = 'minimal' | 'coding' | 'messaging' | 'full';

export type ToolPolicy = {
  allow?: string[];
  deny?: string[];
};

export type AgentToolsConfig = {
  profile?: string;
  allow?: string[];
  alsoAllow?: string[];
  deny?: string[];
};

// Profile definitions matching gateway core tool catalog
const PROFILE_ALLOW: Record<ToolProfileId, string[]> = {
  minimal: ['session_status'],
  coding: [
    'read', 'write', 'edit', 'apply_patch', 'exec', 'process',
    'memory_search', 'memory_get', 'sessions_list', 'sessions_history',
    'sessions_send', 'sessions_spawn', 'subagents', 'session_status',
    'cron', 'image',
  ],
  messaging: [
    'sessions_list', 'sessions_history', 'sessions_send',
    'session_status', 'message',
  ],
  full: [], // empty = allow everything
};

const VALID_PROFILES = new Set<string>(Object.keys(PROFILE_ALLOW));

export function isValidProfile(id: string): id is ToolProfileId {
  return VALID_PROFILES.has(id);
}

/** Resolve the base policy for a profile. Returns undefined for 'full' (= allow all). */
export function resolveProfilePolicy(profileId: string): ToolPolicy | undefined {
  if (!isValidProfile(profileId)) return undefined;
  const allow = PROFILE_ALLOW[profileId];
  if (allow.length === 0) return undefined; // full = no restrictions
  return { allow };
}

function normalizeToolName(name: string): string {
  return name.trim().toLowerCase();
}

function matchesList(toolId: string, list?: string[]): boolean {
  if (!Array.isArray(list) || list.length === 0) return false;
  const normalized = normalizeToolName(toolId);
  for (const entry of list) {
    const pattern = normalizeToolName(entry);
    if (pattern === '*') return true;
    if (pattern === normalized) return true;
    // apply_patch is allowed when exec is allowed
    if (normalized === 'apply_patch' && pattern === 'exec') return true;
  }
  return false;
}

function isAllowedByPolicy(toolId: string, policy?: ToolPolicy): boolean {
  if (!policy) return true; // no policy = allow all (full profile)
  const normalized = normalizeToolName(toolId);
  if (policy.deny && matchesList(normalized, policy.deny)) return false;
  if (!policy.allow || policy.allow.length === 0) return true;
  if (matchesList(normalized, policy.allow)) return true;
  return false;
}

/** Resolve whether a tool is enabled given the agent's tools config. */
export function isToolEnabled(toolId: string, config: AgentToolsConfig): boolean {
  // If agent has explicit allow[], only those tools are enabled (read-only mode)
  if (config.allow && config.allow.length > 0) {
    return matchesList(toolId, config.allow);
  }

  const profile = config.profile || 'full';
  const basePolicy = resolveProfilePolicy(profile);
  const baseAllowed = isAllowedByPolicy(toolId, basePolicy);
  const extraAllowed = matchesList(toolId, config.alsoAllow);
  const denied = matchesList(toolId, config.deny);
  return (baseAllowed || extraAllowed) && !denied;
}

/** Check if a tool is in the base profile (without alsoAllow/deny overrides). */
export function isInBaseProfile(toolId: string, profile: string): boolean {
  const policy = resolveProfilePolicy(profile || 'full');
  return isAllowedByPolicy(toolId, policy);
}

/** Compute new alsoAllow/deny after toggling a single tool. */
export function computeToolToggle(
  toolId: string,
  enabled: boolean,
  currentConfig: AgentToolsConfig,
): { alsoAllow: string[]; deny: string[] } {
  const profile = currentConfig.profile || 'full';
  const nextAllow = new Set(
    (currentConfig.alsoAllow ?? []).map(normalizeToolName).filter((e) => e.length > 0),
  );
  const nextDeny = new Set(
    (currentConfig.deny ?? []).map(normalizeToolName).filter((e) => e.length > 0),
  );

  const baseAllowed = isInBaseProfile(toolId, profile);
  const normalized = normalizeToolName(toolId);

  if (enabled) {
    nextDeny.delete(normalized);
    if (!baseAllowed) {
      nextAllow.add(normalized);
    }
  } else {
    nextAllow.delete(normalized);
    nextDeny.add(normalized);
  }

  return { alsoAllow: [...nextAllow], deny: [...nextDeny] };
}

/** Detect which preset profile matches the current effective state, if any. */
export function detectActiveProfile(
  config: AgentToolsConfig,
  allToolIds: string[],
): ToolProfileId | null {
  if (config.allow && config.allow.length > 0) return null;
  const profile = (config.profile || 'full') as ToolProfileId;
  if (!isValidProfile(profile)) return null;
  // If no overrides, current profile is the active one
  const hasOverrides =
    (config.alsoAllow && config.alsoAllow.length > 0) ||
    (config.deny && config.deny.length > 0);
  if (!hasOverrides) return profile;
  // Check if current state matches any profile exactly
  for (const pid of ['minimal', 'coding', 'messaging', 'full'] as ToolProfileId[]) {
    const testConfig: AgentToolsConfig = { profile: pid };
    const allMatch = allToolIds.every(
      (id) => isToolEnabled(id, config) === isToolEnabled(id, testConfig),
    );
    if (allMatch) return pid;
  }
  return null;
}
