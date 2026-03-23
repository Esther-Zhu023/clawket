import { getHelpCenterCommunityEntries } from './helpCenterCommunity';

describe('getHelpCenterCommunityEntries', () => {
  it('always includes Discord', () => {
    expect(getHelpCenterCommunityEntries(false)).toEqual(['discord']);
    expect(getHelpCenterCommunityEntries(true)).toEqual(
      expect.arrayContaining(['discord']),
    );
  });

  it('adds WeCom only for mainland China users', () => {
    expect(getHelpCenterCommunityEntries(false)).not.toContain('wecom');
    expect(getHelpCenterCommunityEntries(true)).toEqual(['discord', 'wecom']);
  });
});
