import type { SkillStatusEntry } from '../types';
import { buildSkillFixPrompt, buildSkillFixSteps } from './skill-fix';

function createSkill(overrides: Partial<SkillStatusEntry> = {}): SkillStatusEntry {
  return {
    name: 'Shell Runner',
    description: 'Run shell commands',
    source: 'workspace',
    bundled: false,
    filePath: '/tmp/shell-runner/SKILL.md',
    baseDir: '/tmp/shell-runner',
    skillKey: 'workspace:shell-runner',
    always: false,
    disabled: false,
    blockedByAllowlist: false,
    eligible: false,
    requirements: {},
    missing: {},
    configChecks: [],
    install: [],
    ...overrides,
  };
}

describe('buildSkillFixSteps', () => {
  it('returns structured steps from missing requirements and install hints', () => {
    const skill = createSkill({
      missing: {
        bins: ['uv'],
        anyBins: ['node', 'bun'],
        env: ['OPENAI_API_KEY'],
        config: ['tools.allow'],
        os: ['darwin'],
      },
      install: [
        { id: 'brew-uv', kind: 'brew', label: 'brew install uv', bins: ['uv'] },
      ],
      blockedByAllowlist: true,
    });

    expect(buildSkillFixSteps(skill)).toEqual([
      'Install missing binaries: uv',
      'Install at least one required binary: node or bun',
      'Set required environment variables: OPENAI_API_KEY',
      'Add required config entries: tools.allow',
      'Use a compatible operating system: darwin',
      'Gateway install options: brew install uv (brew; for uv)',
      'Allow this skill in your tool allowlist configuration',
    ]);
  });

  it('deduplicates and trims missing values', () => {
    const skill = createSkill({
      missing: {
        bins: [' uv ', 'uv', ''],
      },
    });

    expect(buildSkillFixSteps(skill)).toEqual(['Install missing binaries: uv']);
  });
});

describe('buildSkillFixPrompt', () => {
  it('builds a stable fix prompt with skill context and numbered suggestions', () => {
    const skill = createSkill({
      missing: {
        bins: ['uv'],
      },
    });

    expect(buildSkillFixPrompt(skill)).toBe(
      [
        'Please fix this Skill: Shell Runner.',
        'Skill key: workspace:shell-runner.',
        'Source: workspace.',
        'Suggestion:',
        '1. Install missing binaries: uv',
      ].join('\n'),
    );
  });

  it('falls back to a generic suggestion when there is no requirement hint', () => {
    const skill = createSkill();
    expect(buildSkillFixPrompt(skill)).toContain(
      "1. Review this skill's requirements and make it eligible.",
    );
  });
});
