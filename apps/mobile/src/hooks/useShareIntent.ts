import { useEffect, useRef } from 'react';
import { useIncomingShare } from 'expo-sharing';
import { PendingImage } from '../types/chat';

type ShareHandler = {
  setInput: (text: string) => void;
  setPendingImages: (fn: (prev: PendingImage[]) => PendingImage[]) => void;
};

/**
 * Listens for incoming share intents and populates chat composer.
 * Text/URLs → input field, images → pending attachments.
 */
export function useShareIntent(handler: ShareHandler | null) {
  const { resolvedSharedPayloads, isResolving, clearSharedPayloads } = useIncomingShare();
  const handledRef = useRef(false);

  useEffect(() => {
    if (isResolving || !handler || resolvedSharedPayloads.length === 0 || handledRef.current) return;

    handledRef.current = true;
    const texts: string[] = [];
    const images: PendingImage[] = [];

    for (const payload of resolvedSharedPayloads) {
      if (payload.contentType === 'text' || payload.contentType === 'website') {
        // Text or URL
        const value = 'value' in payload ? (payload as { value?: string }).value : undefined;
        if (value) texts.push(value);
        if (payload.contentUri) texts.push(payload.contentUri);
      } else if (payload.contentType === 'image' && payload.contentUri) {
        images.push({
          uri: payload.contentUri,
          base64: '', // Will be read on send if needed
          mimeType: payload.contentMimeType ?? 'image/jpeg',
        });
      } else if (payload.contentUri) {
        // File/video/audio — add as text reference for now
        texts.push(payload.contentUri);
      }
    }

    if (texts.length > 0) {
      handler.setInput(texts.join('\n'));
    }
    if (images.length > 0) {
      handler.setPendingImages((prev) => [...prev, ...images]);
    }

    // Clear after handling
    clearSharedPayloads();
  }, [resolvedSharedPayloads, isResolving, handler, clearSharedPayloads]);

  // Reset handled flag when payloads are cleared
  useEffect(() => {
    if (resolvedSharedPayloads.length === 0) {
      handledRef.current = false;
    }
  }, [resolvedSharedPayloads.length]);
}
