export function buildRelayClaimKey(serverUrl: string, gatewayId: string, accessCode: string): string {
  return `${serverUrl.trim()}::${gatewayId.trim()}::${accessCode.trim()}`;
}

export function shouldSuppressDuplicatePairingAlert(
  previousMessage: string | null,
  previousAtMs: number,
  nextMessage: string,
  nowMs: number,
  windowMs = 1500,
): boolean {
  if (!previousMessage) return false;
  return previousMessage === nextMessage && nowMs - previousAtMs < windowMs;
}
