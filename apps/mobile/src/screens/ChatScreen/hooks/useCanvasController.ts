import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../../contexts/AppContext';
import type { CanvasSheetHandle } from '../../../components/canvas/CanvasSheet';

/**
 * Subscribes to Gateway canvas events and manages canvas panel state.
 * Returns state + ref to wire into CanvasSheet.
 */
export function useCanvasController() {
  const { gateway, canvasEnabled } = useAppContext();
  const canvasRef = useRef<CanvasSheetHandle>(null);
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [title, setTitle] = useState<string | undefined>(undefined);

  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!canvasEnabled) return;

    const offPresent = gateway.on('canvasPresent', ({ requestId, payload }) => {
      if (payload.url) setUrl(payload.url);
      if (payload.title) setTitle(payload.title);
      setVisible(true);
      gateway.sendNodeInvokeResponse(requestId, { ok: true }).catch(() => {});
    });

    const offHide = gateway.on('canvasHide', ({ requestId }) => {
      setVisible(false);
      gateway.sendNodeInvokeResponse(requestId, { ok: true }).catch(() => {});
    });

    const offNavigate = gateway.on('canvasNavigate', ({ requestId, payload }) => {
      if (payload.url) {
        setUrl(payload.url);
        canvasRef.current?.navigate(payload.url);
      }
      gateway.sendNodeInvokeResponse(requestId, { ok: true }).catch(() => {});
    });

    const offEval = gateway.on('canvasEval', ({ requestId, payload }) => {
      if (payload.javascript) {
        canvasRef.current?.evalJS(payload.javascript);
      }
      gateway.sendNodeInvokeResponse(requestId, { ok: true }).catch(() => {});
    });

    const offSnapshot = gateway.on('canvasSnapshot', ({ requestId, payload }) => {
      const format = payload.format ?? 'png';
      canvasRef.current?.captureSnapshot(format).then((data) => {
        gateway.sendNodeInvokeResponse(requestId, {
          ok: true,
          format,
          data: data ?? null,
        }).catch(() => {});
      }).catch(() => {
        gateway.sendNodeInvokeResponse(requestId, {
          ok: false,
          error: 'Snapshot capture failed',
        }).catch(() => {});
      });
    });

    return () => {
      offPresent();
      offHide();
      offNavigate();
      offEval();
      offSnapshot();
    };
  }, [canvasEnabled, gateway]);

  return {
    canvasVisible: visible,
    canvasUrl: url,
    canvasTitle: title,
    canvasRef,
    closeCanvas: handleClose,
  };
}
