import React, { useEffect } from 'react';
import { PostHogProvider } from 'posthog-react-native';
import { posthogAutocapture, posthogClient } from './posthog';
import { syncAnalyticsSubscriptionContext } from './subscription-context';
import { StorageService } from '../storage';

type Props = {
  children: React.ReactNode;
};

export function AnalyticsProvider({ children }: Props): React.JSX.Element {
  useEffect(() => {
    syncAnalyticsSubscriptionContext(null);

    let cancelled = false;
    StorageService.getProSubscriptionSnapshot()
      .then((cached) => {
        if (cancelled) return;
        syncAnalyticsSubscriptionContext(cached?.snapshot ?? null);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  if (!posthogClient) return <>{children}</>;

  return (
    <PostHogProvider client={posthogClient} autocapture={posthogAutocapture}>
      {children}
    </PostHogProvider>
  );
}
