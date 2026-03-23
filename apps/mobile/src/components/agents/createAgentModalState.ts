export function shouldResetCreateAgentForm(visible: boolean, wasVisible: boolean): boolean {
  return visible && !wasVisible;
}
