export type RequirementStatus = {
  bins?: string[];
  anyBins?: string[];
  env?: string[];
  config?: string[];
  os?: string[];
};

export type SkillConfigCheck = {
  path: string;
  label: string;
  satisfied: boolean;
};

export type SkillInstallOption = {
  id: string;
  kind: 'brew' | 'node' | 'go' | 'uv' | 'download';
  label: string;
  bins: string[];
};

export type SkillStatusEntry = {
  name: string;
  description: string;
  source: string;
  bundled: boolean;
  filePath: string;
  baseDir: string;
  skillKey: string;
  primaryEnv?: string;
  emoji?: string;
  homepage?: string;
  always: boolean;
  disabled: boolean;
  blockedByAllowlist: boolean;
  eligible: boolean;
  requirements: RequirementStatus;
  missing: RequirementStatus;
  configChecks: SkillConfigCheck[];
  install: SkillInstallOption[];
};

export type SkillStatusReport = {
  workspaceDir: string;
  managedSkillsDir: string;
  skills: SkillStatusEntry[];
};
