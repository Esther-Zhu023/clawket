import {
  buildRelayClaimKey,
  shouldSuppressDuplicatePairingAlert,
} from './gatewayConfigForm.utils';

describe('gatewayConfigForm utils', () => {
  it('builds a stable relay claim key', () => {
    expect(buildRelayClaimKey(' https://registry.example.com ', ' gw_123 ', ' 123456 ')).toBe(
      'https://registry.example.com::gw_123::123456',
    );
  });

  it('suppresses only duplicate pairing alerts inside the cooldown window', () => {
    expect(shouldSuppressDuplicatePairingAlert(null, 0, 'Pairing failed', 1000)).toBe(false);
    expect(shouldSuppressDuplicatePairingAlert('Pairing failed', 1000, 'Pairing failed', 2000)).toBe(true);
    expect(shouldSuppressDuplicatePairingAlert('Pairing failed', 1000, 'Pairing failed', 2600)).toBe(false);
    expect(shouldSuppressDuplicatePairingAlert('Old error', 1000, 'New error', 1500)).toBe(false);
  });
});
