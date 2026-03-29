jest.mock('expo-asset', () => ({
  Asset: {
    loadAsync: jest.fn(),
  },
}));

const deleteMock = jest.fn();
const copyMock = jest.fn();

jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    exists: boolean;

    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = parts
        .map((part) => (typeof part === 'string' ? part : part.uri))
        .join('/')
        .replace(/([^:]\/)\/+/g, '$1');
      this.exists = false;
    }

    copy = copyMock;
    delete = deleteMock;
  }

  return {
    File: MockFile,
    Paths: {
      cache: { uri: 'file:///cache' },
    },
  };
});

import { Asset } from 'expo-asset';
import * as MediaLibrary from 'expo-media-library';
import {
  saveBundledImageToPhotoLibrary,
  type SaveBundledImageToPhotoLibraryResult,
} from './photo-library';

describe('saveBundledImageToPhotoLibrary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns permission_denied when photo library access is not granted', async () => {
    const requestPermissionsAsync = MediaLibrary.requestPermissionsAsync as jest.Mock;
    requestPermissionsAsync.mockResolvedValueOnce({ granted: false });

    const result = await saveBundledImageToPhotoLibrary(123, 'wechat-group-qr');

    expect(result).toBe<SaveBundledImageToPhotoLibraryResult>('permission_denied');
    expect(Asset.loadAsync).not.toHaveBeenCalled();
  });

  it('downloads the bundled asset to a local file and saves it to the photo library', async () => {
    const requestPermissionsAsync = MediaLibrary.requestPermissionsAsync as jest.Mock;
    const saveToLibraryAsync = MediaLibrary.saveToLibraryAsync as jest.Mock;
    requestPermissionsAsync.mockResolvedValueOnce({ granted: true });
    (Asset.loadAsync as jest.Mock).mockResolvedValueOnce([
      {
        localUri: 'file:///expo-cache/ExponentAsset-1.jpg',
        type: 'jpg',
      },
    ]);

    const result = await saveBundledImageToPhotoLibrary(123, 'wechat-group-qr');

    expect(result).toBe<SaveBundledImageToPhotoLibraryResult>('saved');
    expect(Asset.loadAsync).toHaveBeenCalledWith(123);
    expect(copyMock).toHaveBeenCalledTimes(1);
    expect(saveToLibraryAsync).toHaveBeenCalledTimes(1);
    expect(String(saveToLibraryAsync.mock.calls[0][0])).toContain(
      'wechat-group-qr-',
    );
    expect(String(saveToLibraryAsync.mock.calls[0][0])).toMatch(/\.jpg$/);
  });

  it('throws when the asset loader does not provide a local file uri', async () => {
    const requestPermissionsAsync = MediaLibrary.requestPermissionsAsync as jest.Mock;
    requestPermissionsAsync.mockResolvedValueOnce({ granted: true });
    (Asset.loadAsync as jest.Mock).mockResolvedValueOnce([
      {
        localUri: null,
        type: 'jpg',
      },
    ]);

    await expect(
      saveBundledImageToPhotoLibrary(123, 'wechat-group-qr'),
    ).rejects.toThrow('Bundled asset did not resolve to a local file URI.');
  });
});
