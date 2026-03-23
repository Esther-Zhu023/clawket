import type { SkillStatusEntry } from '../types';

function sanitize(values?: string[]): string[] {
  if (!values || values.length === 0) return [];
  const normalized = values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

export function buildSkillFixSteps(skill: SkillStatusEntry): string[] {
  const steps: string[] = [];

  const missingBins = sanitize(skill.missing.bins);
  if (missingBins.length > 0) {
    steps.push(`Install missing binaries: ${missingBins.join(', ')}`);
  }

  const missingAnyBins = sanitize(skill.missing.anyBins);
  if (missingAnyBins.length > 0) {
    steps.push(`Install at least one required binary: ${missingAnyBins.join(' or ')}`);
  }

  const missingEnv = sanitize(skill.missing.env);
  if (missingEnv.length > 0) {
    steps.push(`Set required environment variables: ${missingEnv.join(', ')}`);
  }

  const missingConfig = sanitize(skill.missing.config);
  if (missingConfig.length > 0) {
    steps.push(`Add required config entries: ${missingConfig.join(', ')}`);
  }

  const missingOs = sanitize(skill.missing.os);
  if (missingOs.length > 0) {
    steps.push(`Use a compatible operating system: ${missingOs.join(', ')}`);
  }

  if (skill.install.length > 0) {
    const installHints = skill.install.map((option) => {
      const targetBins = sanitize(option.bins);
      if (targetBins.length > 0) {
        return `${option.label} (${option.kind}; for ${targetBins.join(', ')})`;
      }
      return `${option.label} (${option.kind})`;
    });
    steps.push(`Gateway install options: ${installHints.join(' | ')}`);
  }

  if (skill.blockedByAllowlist) {
    steps.push('Allow this skill in your tool allowlist configuration');
  }

  return steps;
}

export function buildSkillFixPrompt(skill: SkillStatusEntry): string {
  const steps = buildSkillFixSteps(skill);
  const body = steps.length > 0
    ? steps.map((step, index) => `${index + 1}. ${step}`).join('\n')
    : "1. Review this skill's requirements and make it eligible.";

  return [
    `Please fix this Skill: ${skill.name}.`,
    `Skill key: ${skill.skillKey}.`,
    `Source: ${skill.source}.`,
    'Suggestion:',
    body,
  ].join('\n');
}
