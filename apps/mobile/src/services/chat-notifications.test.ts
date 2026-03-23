import {
  areChatReplyNotificationsEnabled,
  buildChatReplyNotificationBody,
  extractChatNotificationOpenPayload,
  getChatNotificationResponseIdentifier,
  shouldShowChatReplyNotification,
} from './chat-notifications';

describe('chat notifications', () => {
  it('disables chat reply notifications globally', () => {
    expect(areChatReplyNotificationsEnabled()).toBe(false);
  });

  it('does not show a notification when the feature is disabled', () => {
    expect(shouldShowChatReplyNotification({
      activeTab: 'Console',
      appState: 'active',
    })).toBe(false);
    expect(shouldShowChatReplyNotification({
      activeTab: 'Chat',
      appState: 'background',
    })).toBe(false);
  });

  it('falls back to a generic body when preview text is missing', () => {
    expect(buildChatReplyNotificationBody({
      agentName: 'Milo',
      previewText: '   ',
    })).toBe('New message from Milo');
  });

  it('extracts notification open payload from response data', () => {
    const payload = extractChatNotificationOpenPayload({
      notification: {
        request: {
          content: {
            data: {
              type: 'chat-reply',
              sessionKey: 'agent:main:main',
              agentId: 'main',
              runId: 'run-1',
            },
          },
        },
      },
    });

    expect(payload).toEqual({
      type: 'chat-reply',
      sessionKey: 'agent:main:main',
      agentId: 'main',
      runId: 'run-1',
    });
  });

  it('returns null for unrelated notification payloads', () => {
    expect(extractChatNotificationOpenPayload({
      notification: {
        request: {
          content: {
            data: {
              type: 'other',
            },
          },
        },
      },
    })).toBeNull();
  });

  it('returns the response identifier when present', () => {
    expect(getChatNotificationResponseIdentifier({
      notification: {
        request: {
          identifier: 'notif-1',
        },
      },
    })).toBe('notif-1');
  });
});
