export type CameraPermissionSnapshot = {
  granted: boolean;
  canAskAgain?: boolean | null;
};

export type GatewayCameraPermissionAction =
  | 'open-scanner'
  | 'request-system-permission'
  | 'show-settings';

export function getGatewayCameraPermissionAction(
  permission: CameraPermissionSnapshot,
): GatewayCameraPermissionAction {
  if (permission.granted) {
    return 'open-scanner';
  }

  if (permission.canAskAgain === false) {
    return 'show-settings';
  }

  return 'request-system-permission';
}
