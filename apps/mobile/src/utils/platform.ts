import { Platform } from 'react-native';

export const isMacCatalyst = Platform.OS === 'ios' && Platform.isMacCatalyst === true;

export function getRuntimePlatform(): 'ios' | 'android' | 'macos' {
  if (isMacCatalyst) {
    return 'macos';
  }
  return Platform.OS === 'android' ? 'android' : 'ios';
}

export function getRuntimeSystemName(): 'iOS' | 'Android' | 'macOS' {
  if (isMacCatalyst) {
    return 'macOS';
  }
  return Platform.OS === 'android' ? 'Android' : 'iOS';
}

export function getRuntimeDeviceFamily(): 'iphone' | 'android' | 'mac' {
  if (isMacCatalyst) {
    return 'mac';
  }
  return Platform.OS === 'android' ? 'android' : 'iphone';
}

export function getRuntimeClientId(): 'openclaw-ios' | 'openclaw-android' | 'openclaw-macos' {
  if (isMacCatalyst) {
    return 'openclaw-macos';
  }
  return Platform.OS === 'android' ? 'openclaw-android' : 'openclaw-ios';
}
