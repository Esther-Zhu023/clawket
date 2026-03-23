import { SLASH_COMMANDS, SlashCommand } from './slash-commands';

describe('SLASH_COMMANDS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(SLASH_COMMANDS)).toBe(true);
    expect(SLASH_COMMANDS.length).toBeGreaterThan(0);
  });

  it('has no duplicate keys', () => {
    const keys = SLASH_COMMANDS.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has no duplicate commands', () => {
    const commands = SLASH_COMMANDS.map((c) => c.command);
    expect(new Set(commands).size).toBe(commands.length);
  });

  it('each entry has all required fields', () => {
    for (const cmd of SLASH_COMMANDS) {
      expect(typeof cmd.key).toBe('string');
      expect(cmd.key.length).toBeGreaterThan(0);
      expect(typeof cmd.command).toBe('string');
      expect(cmd.command.startsWith('/')).toBe(true);
      expect(typeof cmd.description).toBe('string');
      expect(cmd.description.length).toBeGreaterThan(0);
      expect(['send', 'fill', 'custom']).toContain(cmd.action);
    }
  });

  it('command matches key with / prefix', () => {
    for (const cmd of SLASH_COMMANDS) {
      expect(cmd.command).toBe(`/${cmd.key}`);
    }
  });
});
