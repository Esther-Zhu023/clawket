import { buildCronWizardSaveSpec } from './cronWizardSaveSpec';

describe('buildCronWizardSaveSpec', () => {
  it('builds a main-session system event for the main agent', () => {
    const result = buildCronWizardSaveSpec({
      prompt: '  summarize the day  ',
    }, 'main');

    expect(result).toEqual({
      sessionTarget: 'main',
      wakeMode: 'now',
      payload: {
        kind: 'systemEvent',
        text: 'summarize the day',
      },
      delivery: {
        mode: 'none',
      },
    });
  });

  it('builds an isolated agent turn for non-main agents', () => {
    const result = buildCronWizardSaveSpec({
      prompt: '  summarize the day  ',
    }, 'writer');

    expect(result).toEqual({
      agentId: 'writer',
      sessionTarget: 'isolated',
      wakeMode: 'now',
      payload: {
        kind: 'agentTurn',
        message: 'summarize the day',
      },
      delivery: {
        mode: 'none',
      },
    });
  });
});
