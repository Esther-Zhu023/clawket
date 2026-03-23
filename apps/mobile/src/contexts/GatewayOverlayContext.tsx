import React, { useCallback, useMemo, useState } from 'react';

const EXPECTED_RESTART_GRACE_MS = 2_500;

type GatewayOverlayContextType = {
  overlayMessage: string | null;
  isExpectedRestartActive: boolean;
  showOverlay: (message: string) => void;
  hideOverlay: () => void;
  beginExpectedRestart: () => void;
  endExpectedRestart: (graceMs?: number) => void;
};

const GatewayOverlayContext = React.createContext<GatewayOverlayContextType | null>(null);

export function GatewayOverlayProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [overlayMessage, setOverlayMessage] = useState<string | null>(null);
  const [expectedRestartCount, setExpectedRestartCount] = useState(0);
  const [restartGraceActive, setRestartGraceActive] = useState(false);
  const restartGraceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRestartGraceTimer = useCallback(() => {
    if (!restartGraceTimerRef.current) return;
    clearTimeout(restartGraceTimerRef.current);
    restartGraceTimerRef.current = null;
  }, []);

  const showOverlay = useCallback((message: string) => {
    setOverlayMessage(message);
  }, []);

  const hideOverlay = useCallback(() => {
    setOverlayMessage(null);
  }, []);

  const beginExpectedRestart = useCallback(() => {
    clearRestartGraceTimer();
    setRestartGraceActive(false);
    setExpectedRestartCount((count) => count + 1);
  }, [clearRestartGraceTimer]);

  const endExpectedRestart = useCallback((graceMs = EXPECTED_RESTART_GRACE_MS) => {
    setExpectedRestartCount((count) => {
      const nextCount = Math.max(0, count - 1);
      if (nextCount === 0) {
        clearRestartGraceTimer();
        if (graceMs > 0) {
          setRestartGraceActive(true);
          restartGraceTimerRef.current = setTimeout(() => {
            setRestartGraceActive(false);
            restartGraceTimerRef.current = null;
          }, graceMs);
        } else {
          setRestartGraceActive(false);
        }
      }
      return nextCount;
    });
  }, [clearRestartGraceTimer]);

  React.useEffect(() => () => {
    clearRestartGraceTimer();
  }, [clearRestartGraceTimer]);

  const isExpectedRestartActive = expectedRestartCount > 0 || restartGraceActive;

  const value = useMemo(
    () => ({
      overlayMessage,
      isExpectedRestartActive,
      showOverlay,
      hideOverlay,
      beginExpectedRestart,
      endExpectedRestart,
    }),
    [
      overlayMessage,
      isExpectedRestartActive,
      showOverlay,
      hideOverlay,
      beginExpectedRestart,
      endExpectedRestart,
    ],
  );

  return (
    <GatewayOverlayContext.Provider value={value}>
      {children}
    </GatewayOverlayContext.Provider>
  );
}

export function useGatewayOverlay(): GatewayOverlayContextType {
  const context = React.useContext(GatewayOverlayContext);
  if (!context) {
    throw new Error('useGatewayOverlay must be used within GatewayOverlayProvider');
  }
  return context;
}
