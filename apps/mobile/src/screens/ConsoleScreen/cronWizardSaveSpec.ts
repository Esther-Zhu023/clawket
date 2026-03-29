import type { CronJobCreate } from '../../types';

type FormShape = {
  prompt: string;
};

type WizardSaveSpec = {
  agentId?: string;
  sessionTarget: 'main' | 'isolated';
  wakeMode: 'next-heartbeat' | 'now';
  payload: CronJobCreate['payload'];
  delivery?: CronJobCreate['delivery'];
};

function isMainAgent(agentId: string): boolean {
  return agentId.trim() === 'main';
}

export function buildCronWizardSaveSpec(
  form: FormShape,
  currentAgentId: string,
): WizardSaveSpec {
  const trimmedPrompt = form.prompt.trim();

  if (isMainAgent(currentAgentId)) {
    return {
      sessionTarget: 'main',
      wakeMode: 'now',
      payload: {
        kind: 'systemEvent',
        text: trimmedPrompt,
      },
      delivery: {
        mode: 'none',
      },
    };
  }

  return {
    agentId: currentAgentId,
    sessionTarget: 'isolated',
    wakeMode: 'now',
    payload: {
      kind: 'agentTurn',
      message: trimmedPrompt,
    },
    delivery: {
      mode: 'none',
    },
  };
}
