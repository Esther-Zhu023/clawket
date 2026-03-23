import { useCallback, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { PendingAttachment } from '../types/chat';
import { isMacCatalyst } from '../utils/platform';

async function readFileAsBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip data:...;base64, prefix
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}


const MAX_ATTACHMENTS = 6;

export function useChatAttachments(maxAttachments = MAX_ATTACHMENTS) {
  const [pending, setPending] = useState<PendingAttachment[]>([]);

  const pickImages = useCallback(async () => {
    const remaining = maxAttachments - pending.length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
      base64: true,
      exif: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const items: PendingAttachment[] = result.assets
        .filter((a) => a.base64)
        .map((a) => ({
          uri: a.uri,
          base64: a.base64!,
          mimeType: a.mimeType ?? 'image/jpeg',
          kind: 'image' as const,
        }));
      setPending((prev) => [...prev, ...items].slice(0, maxAttachments));
    }
  }, [maxAttachments, pending.length]);

  const takePhoto = useCallback(async () => {
    if (pending.length >= maxAttachments) return;

    const result = isMacCatalyst
      ? await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
        base64: true,
        exif: false,
      })
      : await (async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return { canceled: true, assets: [] };
        return ImagePicker.launchCameraAsync({
          quality: 0.8,
          base64: true,
          exif: false,
        });
      })();

    if (!result.canceled && result.assets.length > 0 && result.assets[0].base64) {
      const a = result.assets[0];
      setPending((prev) => [...prev, {
        uri: a.uri,
        base64: a.base64!,
        mimeType: a.mimeType ?? 'image/jpeg',
        kind: 'image' as const,
      }].slice(0, maxAttachments));
    }
  }, [maxAttachments, pending.length]);

  const pickFile = useCallback(async () => {
    if (pending.length >= maxAttachments) return;

    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const asset = result.assets[0];
    if (!asset.uri) return;

    try {
      const b64 = await readFileAsBase64(asset.uri);
      setPending((prev) => [...prev, {
        uri: asset.uri,
        base64: b64,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        fileName: asset.name ?? undefined,
        kind: 'file' as const,
      }].slice(0, maxAttachments));
    } catch {
      // File read failed — silently skip
    }
  }, [maxAttachments, pending.length]);

  const clear = useCallback(() => setPending([]), []);

  const remove = useCallback((index: number) => {
    setPending((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const canAddMore = useMemo(() => pending.length < maxAttachments, [maxAttachments, pending.length]);

  return {
    pending,
    pickImages,
    takePhoto,
    pickFile,
    clear,
    remove,
    canAddMore,
    setPending,
  };
}
