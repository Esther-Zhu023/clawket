import PostHog from 'posthog-react-native';
import { publicAnalyticsConfig } from '../../config/public';

export type PostHogConfig = {
  apiKey: string;
  host: string;
};

export const posthogConfig: PostHogConfig | null = publicAnalyticsConfig;

export const posthogClient = posthogConfig
  ? new PostHog(posthogConfig.apiKey, {
    host: posthogConfig.host,
    captureAppLifecycleEvents: true,
    persistence: 'file',
  })
  : null;

export const posthogAutocapture = {
  captureScreens: false,
  captureTouches: false,
} as const;
