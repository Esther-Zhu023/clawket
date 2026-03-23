export type HelpCenterCommunityEntry = 'discord' | 'wecom';

export function getHelpCenterCommunityEntries(
  showWecomEntry: boolean,
): HelpCenterCommunityEntry[] {
  return showWecomEntry ? ['discord', 'wecom'] : ['discord'];
}
