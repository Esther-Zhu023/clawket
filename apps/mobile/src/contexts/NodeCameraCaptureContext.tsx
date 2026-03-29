import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Camera, CameraView, type CameraCapturedPicture } from 'expo-camera';
import {
  NodeCameraCaptureError,
  type NodeCameraCaptureRequest,
  type NodeCameraCaptureResult,
  registerNodeCameraCaptureDelegate,
} from '../services/node-camera-capture';

type PendingCapture = {
  request: NodeCameraCaptureRequest;
  resolve: (result: NodeCameraCaptureResult) => void;
  reject: (error: NodeCameraCaptureError) => void;
};

const CAMERA_READY_SETTLE_MS = 180;
const CAPTURE_TIMEOUT_MS = 15_000;

export function NodeCameraCaptureProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(null);
  const cameraRef = useRef<CameraView | null>(null);
  const pendingCaptureRef = useRef<PendingCapture | null>(null);
  const captureStartedRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const clearCaptureTimeout = useCallback(() => {
    if (captureTimeoutRef.current) {
      clearTimeout(captureTimeoutRef.current);
      captureTimeoutRef.current = null;
    }
  }, []);

  const finishPendingCapture = useCallback((callback: (pending: PendingCapture) => void) => {
    setPendingCapture((current) => {
      if (current) {
        callback(current);
      }
      return null;
    });
    pendingCaptureRef.current = null;
    captureStartedRef.current = false;
    clearSettleTimer();
    clearCaptureTimeout();
  }, [clearCaptureTimeout, clearSettleTimer]);

  const rejectPendingCapture = useCallback((code: string, message: string) => {
    finishPendingCapture((pending) => {
      pending.reject(new NodeCameraCaptureError(code, message));
    });
  }, [finishPendingCapture]);

  const resolveCapturedPicture = useCallback((picture: CameraCapturedPicture) => {
    finishPendingCapture((pending) => {
      pending.resolve({
        uri: picture.uri,
        width: picture.width,
        height: picture.height,
        format: picture.format,
      });
    });
  }, [finishPendingCapture]);

  const takePendingPicture = useCallback(async () => {
    const currentPending = pendingCaptureRef.current;
    if (!currentPending || !cameraRef.current || captureStartedRef.current) {
      return;
    }
    captureStartedRef.current = true;

    try {
      const picture = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: currentPending.request.quality,
        shutterSound: false,
      });
      resolveCapturedPicture(picture);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Automatic camera capture failed.';
      rejectPendingCapture('UNAVAILABLE', message);
    }
  }, [rejectPendingCapture, resolveCapturedPicture]);

  const handleCameraReady = useCallback(() => {
    if (!pendingCaptureRef.current || captureStartedRef.current) {
      return;
    }
    clearSettleTimer();
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      void takePendingPicture();
    }, CAMERA_READY_SETTLE_MS);
  }, [clearSettleTimer, takePendingPicture]);

  const handleMountError = useCallback((event: { message: string }) => {
    rejectPendingCapture('UNAVAILABLE', event.message || 'Camera failed to mount.');
  }, [rejectPendingCapture]);

  useEffect(() => {
    const unregister = registerNodeCameraCaptureDelegate(async (request) => {
      const currentPermission = await Camera.getCameraPermissionsAsync();
      const permission = currentPermission.granted
        ? currentPermission
        : await Camera.requestCameraPermissionsAsync();

      if (!permission.granted) {
        throw new NodeCameraCaptureError('PERMISSION_DENIED', 'Camera permission was denied.');
      }

      if (pendingCaptureRef.current) {
        throw new NodeCameraCaptureError('BUSY', 'Another camera capture is already in progress.');
      }

      return await new Promise<NodeCameraCaptureResult>((resolve, reject) => {
        const nextPending = {
          request,
          resolve,
          reject,
        };
        pendingCaptureRef.current = nextPending;
        setPendingCapture(nextPending);
        clearCaptureTimeout();
        captureTimeoutRef.current = setTimeout(() => {
          rejectPendingCapture(
            'UNAVAILABLE',
            'Automatic camera capture timed out before a photo could be taken.',
          );
        }, CAPTURE_TIMEOUT_MS);
      });
    });

    return () => {
      unregister();
      clearSettleTimer();
      clearCaptureTimeout();
    };
  }, [clearCaptureTimeout, clearSettleTimer, rejectPendingCapture]);

  useEffect(() => {
    return () => {
      const currentPending = pendingCaptureRef.current;
      if (currentPending) {
        currentPending.reject(
          new NodeCameraCaptureError('UNAVAILABLE', 'Automatic camera capture provider was unmounted.'),
        );
      }
    };
  }, []);

  return (
    <>
      {children}
      <Modal
        visible={pendingCapture != null}
        transparent={false}
        animationType="none"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          rejectPendingCapture('USER_CANCELLED', 'Camera capture was canceled by the user.');
        }}
      >
        <View style={styles.container}>
          {pendingCapture ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              active
              mode="picture"
              facing={pendingCapture.request.facing}
              onCameraReady={handleCameraReady}
              onMountError={handleMountError}
            />
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
