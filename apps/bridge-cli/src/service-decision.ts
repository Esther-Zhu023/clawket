import type { PairingInfo, ServiceStatus } from '@clawket/bridge-core';

export type PairServiceDecision = 'noop' | 'install' | 'restart';

export function decidePairServiceAction(
  paired: Pick<PairingInfo, 'action'>,
  service: Pick<ServiceStatus, 'installed' | 'running'>,
): PairServiceDecision {
  if (!service.installed) {
    return 'install';
  }
  if (!service.running) {
    return 'restart';
  }
  if (paired.action === 'registered') {
    // A freshly registered bridge may have a new gatewayId/relaySecret pair.
    // The background runtime only reads config on process start, so it must be
    // restarted to pick up the new identity.
    return 'restart';
  }
  return 'noop';
}
