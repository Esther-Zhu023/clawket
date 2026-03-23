import { useCallback, useRef } from 'react';
import { NavigationContainerRefWithCurrent, NavigationState, ParamListBase } from '@react-navigation/native';
import { getTrackedScreen } from '../utils/posthog-navigation';
import { posthogClient } from '../services/analytics/posthog';

type Args<T extends ParamListBase> = {
  rootNavigationRef: NavigationContainerRefWithCurrent<T>;
};

export function usePostHogScreenTracking<T extends ParamListBase>({ rootNavigationRef }: Args<T>): {
  trackInitialScreen: () => void;
  trackScreenState: (state: NavigationState | undefined) => void;
} {
  const lastTrackedKeyRef = useRef<string | null>(null);

  const trackScreen = useCallback((state: NavigationState | undefined, phase: 'initial' | 'navigation') => {
    if (!posthogClient) return;
    const trackedScreen = getTrackedScreen(state);
    if (!trackedScreen) return;
    if (phase === 'navigation' && lastTrackedKeyRef.current === trackedScreen.uniqueKey) return;

    lastTrackedKeyRef.current = trackedScreen.uniqueKey;

    void posthogClient.screen(trackedScreen.name, {
      ...trackedScreen.properties,
      navigation_phase: phase,
    }).catch(() => {});
  }, []);

  const trackInitialScreen = useCallback(() => {
    trackScreen(rootNavigationRef.getRootState(), 'initial');
  }, [rootNavigationRef, trackScreen]);

  const trackScreenState = useCallback((state: NavigationState | undefined) => {
    trackScreen(state, 'navigation');
  }, [trackScreen]);

  return {
    trackInitialScreen,
    trackScreenState,
  };
}
