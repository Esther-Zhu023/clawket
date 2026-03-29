import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export type SaveBundledImageToPhotoLibraryResult = 'saved' | 'permission_denied';

export async function saveBundledImageToPhotoLibrary(
  moduleId: number,
  filenameBase: string,
): Promise<SaveBundledImageToPhotoLibraryResult> {
  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) {
    return 'permission_denied';
  }

  const [asset] = await Asset.loadAsync(moduleId);
  const localUri = asset?.localUri;
  if (!localUri) {
    throw new Error('Bundled asset did not resolve to a local file URI.');
  }

  const extension = asset.type || 'jpg';
  const destination = new FileSystem.File(
    FileSystem.Paths.cache,
    `${filenameBase}-${Date.now()}.${extension}`,
  );

  new FileSystem.File(localUri).copy(destination);
  await MediaLibrary.saveToLibraryAsync(destination.uri);
  return 'saved';
}
