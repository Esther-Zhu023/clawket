import { DEFAULT_AGENT_EMOJI, extractDisplayAgentEmoji, getDisplayAgentEmoji } from './agent-emoji';

describe('agent emoji helpers', () => {
  it('returns the first standalone emoji grapheme', () => {
    expect(extractDisplayAgentEmoji('🦞(name)')).toBe('🦞');
  });

  it('preserves zwj emoji sequences', () => {
    expect(extractDisplayAgentEmoji('👨‍💻 coder')).toBe('👨‍💻');
  });

  it('preserves emoji with skin-tone modifiers', () => {
    expect(extractDisplayAgentEmoji('👍🏽 team')).toBe('👍🏽');
  });

  it('preserves flag emoji sequences', () => {
    expect(extractDisplayAgentEmoji('🇨🇳 China')).toBe('🇨🇳');
  });

  it('returns the first emoji found after leading text', () => {
    expect(extractDisplayAgentEmoji('Agent 🦊 fox')).toBe('🦊');
  });

  it('falls back when there is no emoji', () => {
    expect(extractDisplayAgentEmoji('name only')).toBeNull();
    expect(getDisplayAgentEmoji('name only')).toBe(DEFAULT_AGENT_EMOJI);
  });
});
