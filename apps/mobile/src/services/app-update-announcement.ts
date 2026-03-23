import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { APP_PACKAGE_VERSION } from '../constants/app-version';
import { getAppUpdateRelease, toAppUpdateAnnouncement } from '../features/app-updates/releases';

const STORAGE_PREFIX = 'clawket.appUpdateAnnouncementSeen.v1';

export function getCurrentAppVersion(): string {
  return Application.nativeApplicationVersion?.trim()
    || APP_PACKAGE_VERSION
    || '0.0.0';
}

export function getAppUpdateAnnouncementStorageKey(version: string): string {
  return `${STORAGE_PREFIX}:${version.trim()}`;
}

export function getCurrentAppUpdateAnnouncement(appVersion = getCurrentAppVersion()) {
  const normalizedVersion = appVersion.trim();
  if (!normalizedVersion) return null;
  return toAppUpdateAnnouncement(getAppUpdateRelease(normalizedVersion));
}

export async function shouldShowCurrentAppUpdateAnnouncement(debugMode: boolean): Promise<boolean> {
  const version = getCurrentAppVersion();
  const release = getAppUpdateRelease(version);
  if (!release || release.silent || release.entries.length === 0) return false;
  if (debugMode) return false;
  const seen = await AsyncStorage.getItem(getAppUpdateAnnouncementStorageKey(version));
  return seen !== '1';
}

export async function markCurrentAppUpdateAnnouncementShown(): Promise<void> {
  const version = getCurrentAppVersion();
  const release = getAppUpdateRelease(version);
  if (!release || release.entries.length === 0) return;
  await AsyncStorage.setItem(getAppUpdateAnnouncementStorageKey(version), '1');
}
