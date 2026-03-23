export function logAppTelemetry(scope: string, event: string, fields: Record<string, unknown> = {}): void {
  console.log(`[app-telemetry] ${JSON.stringify({
    scope,
    event,
    ts: Date.now(),
    ...fields,
  })}`);
}
