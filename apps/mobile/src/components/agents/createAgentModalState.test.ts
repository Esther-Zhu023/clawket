import { shouldResetCreateAgentForm } from './createAgentModalState';

describe('shouldResetCreateAgentForm', () => {
  it('resets only when the modal transitions from closed to open', () => {
    expect(shouldResetCreateAgentForm(true, false)).toBe(true);
    expect(shouldResetCreateAgentForm(true, true)).toBe(false);
    expect(shouldResetCreateAgentForm(false, true)).toBe(false);
    expect(shouldResetCreateAgentForm(false, false)).toBe(false);
  });
});
