import {
  handleDeviceInfo,
  handleDeviceStatus,
  handleSystemNotify,
  handleCameraCapture,
  handleCameraPick,
  handleClipboardRead,
  handleClipboardWrite,
  handleMediaSave,
} from './node-handlers';
import { Platform } from 'react-native';

const mutablePlatform = Platform as typeof Platform & { isMacCatalyst?: boolean };
const originalPlatformOS = mutablePlatform.OS;
const originalIsMacCatalyst = mutablePlatform.isMacCatalyst;

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  mutablePlatform.OS = originalPlatformOS;
  mutablePlatform.isMacCatalyst = originalIsMacCatalyst;
  jest.resetModules();
});

// ── device ──────────────────────────────────────────────────────────────────

describe('handleDeviceInfo', () => {
  it('returns ok with device platform info', async () => {
    const result = await handleDeviceInfo();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const payload = result.payload as Record<string, unknown>;
    expect(payload.platform).toBe('ios');
    expect(payload.systemName).toBe('iOS');
    expect(typeof payload.systemVersion).toBe('string');
    expect(typeof payload.model).toBe('string');
  });

  it('reports macOS identity for Mac Catalyst', async () => {
    jest.resetModules();
    const runtimePlatform = require('react-native').Platform as typeof Platform & { isMacCatalyst?: boolean };
    runtimePlatform.OS = 'ios';
    runtimePlatform.isMacCatalyst = true;

    const { handleDeviceInfo: handleCatalystDeviceInfo } = await import('./node-handlers');
    const result = await handleCatalystDeviceInfo();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const payload = result.payload as Record<string, unknown>;
    expect(payload.platform).toBe('macos');
    expect(payload.systemName).toBe('macOS');
  });
});

describe('handleDeviceStatus', () => {
  it('returns battery/network status and appState', async () => {
    const result = await handleDeviceStatus();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const payload = result.payload as Record<string, unknown>;
    expect(payload.batteryLevel).toBe(0.67);
    expect(payload.batteryState).toBe('charging');
    expect(payload.lowPowerMode).toBe(false);
    expect(payload.networkType).toBe('wifi');
    expect(payload.isConnected).toBe(true);
    expect(payload.isInternetReachable).toBe(true);
    expect(typeof payload.appState).toBe('string');
  });
});

describe('handleSystemNotify', () => {
  it('schedules system notification with title and body', async () => {
    const Notifications = require('expo-notifications');
    const result = await handleSystemNotify({ title: 'Hello', body: 'World' });
    expect(result.ok).toBe(true);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: 'Hello', body: 'World' },
      trigger: null,
    });
  });

  it('uses default title when params are empty', async () => {
    const Notifications = require('expo-notifications');
    const result = await handleSystemNotify({});
    expect(result.ok).toBe(true);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: 'Notification', body: undefined },
      trigger: null,
    });
  });

  it('handles null params gracefully', async () => {
    const Notifications = require('expo-notifications');
    const result = await handleSystemNotify(null);
    expect(result.ok).toBe(true);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: 'Notification', body: undefined },
      trigger: null,
    });
  });

  it('returns PERMISSION_DENIED when notifications permission is denied', async () => {
    const Notifications = require('expo-notifications');
    Notifications.getPermissionsAsync.mockResolvedValueOnce({ granted: false });
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({ granted: false });
    const result = await handleSystemNotify({ title: 'Hello' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('PERMISSION_DENIED');
  });
});

// ── camera ──────────────────────────────────────────────────────────────────

describe('handleCameraCapture', () => {
  it('returns photo data on success', async () => {
    const result = await handleCameraCapture();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const payload = result.payload as Record<string, unknown>;
    expect(payload.base64).toBe('abc123');
    expect(payload.width).toBe(100);
    expect(payload.height).toBe(200);
    expect(payload.uri).toBe('file://photo.jpg');
  });

  it('returns PERMISSION_DENIED when camera is denied', async () => {
    const ImagePicker = require('expo-image-picker');
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValueOnce({ granted: false });
    const result = await handleCameraCapture();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('PERMISSION_DENIED');
  });

  it('returns canceled when user cancels', async () => {
    const ImagePicker = require('expo-image-picker');
    ImagePicker.launchCameraAsync.mockResolvedValueOnce({ canceled: true, assets: [] });
    const result = await handleCameraCapture();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.payload as Record<string, unknown>).canceled).toBe(true);
  });

  it('uses image library instead of camera on Mac Catalyst', async () => {
    jest.resetModules();
    const ImagePicker = require('expo-image-picker');
    const runtimePlatform = require('react-native').Platform as typeof Platform & { isMacCatalyst?: boolean };
    runtimePlatform.OS = 'ios';
    runtimePlatform.isMacCatalyst = true;
    const { handleCameraCapture: handleCatalystCameraCapture } = await import('./node-handlers');

    const result = await handleCatalystCameraCapture();

    expect(result.ok).toBe(true);
    expect(ImagePicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
      base64: true,
      quality: 0.8,
      mediaTypes: ['images'],
    });
  });
});

describe('handleCameraPick', () => {
  it('returns picked image data on success', async () => {
    const result = await handleCameraPick();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const payload = result.payload as Record<string, unknown>;
    expect(payload.base64).toBe('def456');
    expect(payload.width).toBe(300);
    expect(payload.height).toBe(400);
  });

  it('returns PERMISSION_DENIED when media library is denied', async () => {
    const ImagePicker = require('expo-image-picker');
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: false });
    const result = await handleCameraPick();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('PERMISSION_DENIED');
  });
});

// ── clipboard ───────────────────────────────────────────────────────────────

describe('handleClipboardRead', () => {
  it('returns clipboard text', async () => {
    const Clip = require('expo-clipboard');
    Clip.getStringAsync.mockResolvedValueOnce('hello');
    const result = await handleClipboardRead();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.payload as Record<string, unknown>).text).toBe('hello');
  });
});

describe('handleClipboardWrite', () => {
  it('writes text to clipboard', async () => {
    const Clip = require('expo-clipboard');
    const result = await handleClipboardWrite({ text: 'copied' });
    expect(result.ok).toBe(true);
    expect(Clip.setStringAsync).toHaveBeenCalledWith('copied');
  });

  it('returns INVALID_PARAMS when text is missing', async () => {
    const result = await handleClipboardWrite({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_PARAMS');
  });
});

// ── media ───────────────────────────────────────────────────────────────────

describe('handleMediaSave', () => {
  it('saves base64 image to library', async () => {
    const FS = require('expo-file-system/legacy') as Record<string, jest.Mock>;
    const ML = require('expo-media-library');
    const result = await handleMediaSave({ base64: 'imagedata', filename: 'test.png' });
    expect(result.ok).toBe(true);
    expect(FS.writeAsStringAsync).toHaveBeenCalledWith(
      'file:///cache/test.png',
      'imagedata',
      { encoding: 'base64' },
    );
    expect(ML.saveToLibraryAsync).toHaveBeenCalledWith('file:///cache/test.png');
  });

  it('uses default filename when not provided', async () => {
    const FS = require('expo-file-system/legacy') as Record<string, jest.Mock>;
    await handleMediaSave({ base64: 'imagedata' });
    expect(FS.writeAsStringAsync).toHaveBeenCalledWith(
      'file:///cache/clawket_media.png',
      'imagedata',
      { encoding: 'base64' },
    );
  });

  it('returns INVALID_PARAMS when base64 is missing', async () => {
    const result = await handleMediaSave({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_PARAMS');
  });

  it('returns PERMISSION_DENIED when media library is denied', async () => {
    const ML = require('expo-media-library');
    ML.requestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    const result = await handleMediaSave({ base64: 'imagedata' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('PERMISSION_DENIED');
  });
});
