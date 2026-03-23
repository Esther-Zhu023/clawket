import { getGatewayCameraPermissionAction } from './gateway-camera-permission';

describe('getGatewayCameraPermissionAction', () => {
  it('opens the scanner when camera permission is already granted', () => {
    expect(getGatewayCameraPermissionAction({ granted: true, canAskAgain: true })).toBe('open-scanner');
  });

  it('requests the system permission when camera access is not decided yet', () => {
    expect(getGatewayCameraPermissionAction({ granted: false, canAskAgain: true })).toBe('request-system-permission');
  });

  it('sends the user to Settings when camera access is blocked', () => {
    expect(getGatewayCameraPermissionAction({ granted: false, canAskAgain: false })).toBe('show-settings');
  });

  it('requests the system permission when canAskAgain is unavailable', () => {
    expect(getGatewayCameraPermissionAction({ granted: false })).toBe('request-system-permission');
  });
});
