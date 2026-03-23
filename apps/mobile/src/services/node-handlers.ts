import { AppState, Platform } from 'react-native';
import { getRuntimePlatform, getRuntimeSystemName, isMacCatalyst } from '../utils/platform';

export type HandlerResult =
  | { ok: true; payload: unknown }
  | { ok: false; error: { code: string; message: string } };

export type NodeInvokeHandler = (params: unknown) => Promise<HandlerResult>;

function parseParams(params: unknown): Record<string, unknown> {
  return params && typeof params === 'object' ? (params as Record<string, unknown>) : {};
}

function permissionDenied(message: string): HandlerResult {
  return { ok: false, error: { code: 'PERMISSION_DENIED', message } };
}

function invalidParams(message: string): HandlerResult {
  return { ok: false, error: { code: 'INVALID_PARAMS', message } };
}

// Lazy-load native modules to avoid crash-on-import at app startup.

function getImagePicker() {
  return require('expo-image-picker') as typeof import('expo-image-picker');
}

function getClipboard() {
  return require('expo-clipboard') as typeof import('expo-clipboard');
}

function getMediaLibrary() {
  return require('expo-media-library') as typeof import('expo-media-library');
}

function getFileSystem() {
  return require('expo-file-system/legacy') as {
    cacheDirectory: string | null;
    writeAsStringAsync: (uri: string, contents: string, options?: { encoding?: string }) => Promise<void>;
    EncodingType: { Base64: string };
  };
}

function getLocation() {
  return require('expo-location') as typeof import('expo-location');
}

type BatteryStateValue = 0 | 1 | 2 | 3 | 4 | number;

type BatteryModule = {
  getBatteryLevelAsync: () => Promise<number>;
  getBatteryStateAsync: () => Promise<BatteryStateValue>;
  isLowPowerModeEnabledAsync: () => Promise<boolean>;
};

function getBattery(): BatteryModule | null {
  try {
    return require('expo-battery') as BatteryModule;
  } catch {
    return null;
  }
}

type NetworkState = {
  type?: string;
  isConnected?: boolean;
  isInternetReachable?: boolean | null;
};

type NetworkModule = {
  getNetworkStateAsync: () => Promise<NetworkState>;
};

function getNetwork(): NetworkModule | null {
  try {
    return require('expo-network') as NetworkModule;
  } catch {
    return null;
  }
}

type NotificationsPermissionStatus = {
  granted?: boolean;
};

type NotificationsModule = {
  AndroidImportance?: { DEFAULT?: number };
  getPermissionsAsync: () => Promise<NotificationsPermissionStatus>;
  requestPermissionsAsync: () => Promise<NotificationsPermissionStatus>;
  setNotificationHandler?: (handler: {
    handleNotification: () => Promise<{
      shouldShowBanner?: boolean;
      shouldShowList?: boolean;
      shouldPlaySound?: boolean;
      shouldSetBadge?: boolean;
    }>;
  }) => void;
  setNotificationChannelAsync?: (channelId: string, channel: {
    name: string;
    importance: number;
  }) => Promise<void>;
  scheduleNotificationAsync: (request: {
    content: { title: string; body?: string };
    trigger: null;
  }) => Promise<string>;
};

function getNotifications(): NotificationsModule | null {
  try {
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

let notificationHandlerInitialized = false;
let androidChannelInitialized = false;

async function ensureNotificationRuntime(notifications: NotificationsModule): Promise<void> {
  if (!notificationHandlerInitialized && notifications.setNotificationHandler) {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    notificationHandlerInitialized = true;
  }

  if (Platform.OS === 'android' && !androidChannelInitialized && notifications.setNotificationChannelAsync) {
    await notifications.setNotificationChannelAsync('node-system-notify', {
      name: 'Node Notifications',
      importance: notifications.AndroidImportance?.DEFAULT ?? 3,
    });
    androidChannelInitialized = true;
  }
}

// ── device ──────────────────────────────────────────────────────────────────

export async function handleDeviceInfo(): Promise<HandlerResult> {
  const constants = (Platform.constants ?? {}) as Record<string, unknown>;
  return {
    ok: true,
    payload: {
      platform: getRuntimePlatform(),
      systemName: getRuntimeSystemName(),
      systemVersion: String(Platform.Version),
      model: constants.Model ?? constants.Brand ?? 'unknown',
    },
  };
}

export async function handleDeviceStatus(): Promise<HandlerResult> {
  const Battery = getBattery();
  const Network = getNetwork();

  let batteryLevel: number | null = null;
  let batteryState: string | null = null;
  let lowPowerMode: boolean | null = null;
  let networkType: string | null = null;
  let isConnected: boolean | null = null;
  let isInternetReachable: boolean | null = null;

  if (Battery) {
    try {
      batteryLevel = await Battery.getBatteryLevelAsync();
    } catch {
      batteryLevel = null;
    }
    try {
      const state = await Battery.getBatteryStateAsync();
      batteryState = mapBatteryState(state);
    } catch {
      batteryState = null;
    }
    try {
      lowPowerMode = await Battery.isLowPowerModeEnabledAsync();
    } catch {
      lowPowerMode = null;
    }
  }

  if (Network) {
    try {
      const state = await Network.getNetworkStateAsync();
      networkType = normalizeNetworkType(state.type);
      isConnected = typeof state.isConnected === 'boolean' ? state.isConnected : null;
      isInternetReachable = typeof state.isInternetReachable === 'boolean' ? state.isInternetReachable : null;
    } catch {
      networkType = null;
      isConnected = null;
      isInternetReachable = null;
    }
  }

  return {
    ok: true,
    payload: {
      batteryLevel,
      batteryState,
      lowPowerMode,
      networkType,
      isConnected,
      isInternetReachable,
      appState: AppState.currentState,
    },
  };
}

function mapBatteryState(state: BatteryStateValue): string | null {
  switch (state) {
    case 1:
      return 'unknown';
    case 2:
      return 'unplugged';
    case 3:
      return 'charging';
    case 4:
      return 'full';
    default:
      return null;
  }
}

function normalizeNetworkType(type: unknown): string | null {
  if (typeof type !== 'string' || !type.trim()) return null;
  return type.toLowerCase();
}

// ── system ──────────────────────────────────────────────────────────────────

export async function handleSystemNotify(params: unknown): Promise<HandlerResult> {
  const notifications = getNotifications();
  if (!notifications) {
    return {
      ok: false,
      error: {
        code: 'UNAVAILABLE',
        message: 'Notifications module is unavailable in this app build.',
      },
    };
  }

  const record = parseParams(params);
  const title = typeof record.title === 'string' ? record.title : 'Notification';
  const body = typeof record.body === 'string' ? record.body : undefined;
  await ensureNotificationRuntime(notifications);

  let permission = await notifications.getPermissionsAsync();
  if (!permission.granted) {
    permission = await notifications.requestPermissionsAsync();
  }
  if (!permission.granted) {
    return permissionDenied('Notification permission was denied.');
  }

  await notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
  return { ok: true, payload: { delivered: true } };
}

// ── camera ──────────────────────────────────────────────────────────────────

export async function handleCameraCapture(): Promise<HandlerResult> {
  const ImagePicker = getImagePicker();
  const result = isMacCatalyst
    ? await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8, mediaTypes: ['images'] })
    : await (async () => {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        return null;
      }
      return ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 });
    })();
  if (!result) {
    return permissionDenied('Camera permission was denied.');
  }
  if (result.canceled || !result.assets?.length) {
    return { ok: true, payload: { canceled: true } };
  }
  const asset = result.assets[0];
  return {
    ok: true,
    payload: { base64: asset.base64, width: asset.width, height: asset.height, uri: asset.uri },
  };
}

export async function handleCameraPick(): Promise<HandlerResult> {
  const ImagePicker = getImagePicker();
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return permissionDenied('Media library permission was denied.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8 });
  if (result.canceled || !result.assets?.length) {
    return { ok: true, payload: { canceled: true } };
  }
  const asset = result.assets[0];
  return {
    ok: true,
    payload: { base64: asset.base64, width: asset.width, height: asset.height, uri: asset.uri },
  };
}

// ── location ────────────────────────────────────────────────────────────────

const ACCURACY_MAP: Record<string, number> = {
  coarse: 3,    // Accuracy.Balanced (expo-location enum value)
  balanced: 3,
  precise: 6,   // Accuracy.BestForNavigation
};

export async function handleLocationGet(params: unknown): Promise<HandlerResult> {
  const Location = getLocation();
  const record = parseParams(params);

  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') {
    return permissionDenied('Location permission was denied.');
  }

  const desiredAccuracy = typeof record.desiredAccuracy === 'string'
    ? record.desiredAccuracy
    : 'balanced';
  const accuracy = ACCURACY_MAP[desiredAccuracy] ?? ACCURACY_MAP.balanced;

  const maxAgeMs = typeof record.maxAgeMs === 'number' ? record.maxAgeMs : undefined;

  const location = await Location.getCurrentPositionAsync({
    accuracy,
    ...(maxAgeMs != null ? { maxAge: maxAgeMs } : {}),
  });

  return {
    ok: true,
    payload: {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      timestamp: location.timestamp,
    },
  };
}

// ── clipboard ───────────────────────────────────────────────────────────────

export async function handleClipboardRead(): Promise<HandlerResult> {
  const Clip = getClipboard();
  const text = await Clip.getStringAsync();
  return { ok: true, payload: { text } };
}

export async function handleClipboardWrite(params: unknown): Promise<HandlerResult> {
  const record = parseParams(params);
  if (typeof record.text !== 'string') {
    return invalidParams('Missing required param: text (string).');
  }
  const Clip = getClipboard();
  await Clip.setStringAsync(record.text);
  return { ok: true, payload: { ok: true } };
}

// ── media ───────────────────────────────────────────────────────────────────

export async function handleMediaSave(params: unknown): Promise<HandlerResult> {
  const record = parseParams(params);
  if (typeof record.base64 !== 'string') {
    return invalidParams('Missing required param: base64 (string).');
  }

  const ML = getMediaLibrary();
  const perm = await ML.requestPermissionsAsync();
  if (perm.status !== 'granted') {
    return permissionDenied('Media library permission was denied.');
  }

  const FS = getFileSystem();
  const filename = typeof record.filename === 'string' ? record.filename : 'clawket_media.png';
  const tmpUri = `${FS.cacheDirectory}${filename}`;
  await FS.writeAsStringAsync(tmpUri, record.base64, {
    encoding: FS.EncodingType.Base64,
  });
  await ML.saveToLibraryAsync(tmpUri);
  return { ok: true, payload: { saved: true } };
}
