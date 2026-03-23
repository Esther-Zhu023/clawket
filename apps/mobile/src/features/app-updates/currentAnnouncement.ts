export type {
  AppUpdateAnnouncement,
  AppUpdateAnnouncementAction,
  AppUpdateAnnouncementEntry,
  AppUpdateRelease,
} from './releases';

import { getLatestAppUpdateRelease, toAppUpdateAnnouncement } from './releases';

// Legacy compatibility export. New code should consume the unified release history.
export const CURRENT_APP_UPDATE_ANNOUNCEMENT = toAppUpdateAnnouncement(getLatestAppUpdateRelease());
