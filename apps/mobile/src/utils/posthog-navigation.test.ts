import { getActiveLeafRouteName, getTrackedScreen } from './posthog-navigation';

describe('posthog navigation tracking', () => {
  it('maps the chat tab root to the Chat screen', () => {
    const state = {
      index: 0,
      routes: [
        {
          key: 'main-tabs',
          name: 'MainTabs',
          state: {
            index: 0,
            routes: [
              {
                key: 'chat-tab',
                name: 'Chat',
                state: {
                  index: 0,
                  routes: [{ key: 'chat-main-1', name: 'ChatMain' }],
                },
              },
            ],
          },
        },
      ],
    };

    expect(getActiveLeafRouteName(state as never)).toBe('ChatMain');
    expect(getTrackedScreen(state as never)).toEqual({
      name: 'Chat',
      routeName: 'ChatMain',
      area: 'chat',
      kind: 'root',
      tab: 'Chat',
      uniqueKey: 'chat-main-1',
      properties: {
        navigation_path: 'MainTabs > Chat > ChatMain',
        screen_area: 'chat',
        screen_kind: 'root',
        screen_route: 'ChatMain',
        screen_tab: 'Chat',
      },
    });
  });

  it('maps nested console detail screens and only captures param presence', () => {
    const state = {
      index: 1,
      routes: [
        { key: 'main-tabs', name: 'MainTabs' },
        {
          key: 'node-detail-1',
          name: 'NodeDetail',
          params: { nodeId: 'node-123', displayName: 'Edge Node' },
        },
      ],
    };

    expect(getTrackedScreen(state as never)).toEqual({
      name: 'Node Detail',
      routeName: 'NodeDetail',
      area: 'console',
      kind: 'detail',
      tab: 'Console',
      uniqueKey: 'node-detail-1',
      properties: {
        navigation_path: 'NodeDetail',
        screen_area: 'console',
        screen_kind: 'detail',
        screen_route: 'NodeDetail',
        screen_tab: 'Console',
        has_node_id: true,
        has_display_name: true,
      },
    });
  });

  it('returns null for routes that are not part of the tracking catalog', () => {
    const state = {
      index: 0,
      routes: [{ key: 'unknown-1', name: 'UnknownScreen' }],
    };

    expect(getTrackedScreen(state as never)).toBeNull();
  });
});
