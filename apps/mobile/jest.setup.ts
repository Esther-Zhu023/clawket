// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  createURL: jest.fn((path: string) => `clawket://${path}`),
}));

// Mock expo-localization
jest.mock('expo-localization', () => ({
  getCalendars: jest.fn(() => [{ timeZone: 'America/Los_Angeles' }]),
  getLocales: jest.fn(() => [{ languageCode: 'en', languageTag: 'en-US' }]),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve()),
  getStringAsync: jest.fn(() => Promise.resolve('')),
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true, status: 'granted' }),
  ),
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true, status: 'granted' }),
  ),
  launchCameraAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{ base64: 'abc123', width: 100, height: 200, uri: 'file://photo.jpg' }],
    }),
  ),
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{ base64: 'def456', width: 300, height: 400, uri: 'file://picked.jpg' }],
    }),
  ),
}));

// Mock expo-media-library
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' }),
  ),
  saveToLibraryAsync: jest.fn(() => Promise.resolve()),
}));

// Mock @react-native-menu/menu
jest.mock('@react-native-menu/menu', () => ({
  MenuView: ({ children }: { children: unknown }) => children,
}));

// Mock react-native-screens
jest.mock('react-native-screens', () => ({
  FullWindowOverlay: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock @gorhom/bottom-sheet
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View, TextInput, SectionList } = require('react-native');

  const BottomSheetModal = React.forwardRef(function BottomSheetModal(
    { children }: { children: React.ReactNode },
    ref: React.Ref<{ present: () => void; dismiss: () => void }>,
  ) {
    React.useImperativeHandle(ref, () => ({
      present: jest.fn(),
      dismiss: jest.fn(),
    }));
    return React.createElement(View, null, children);
  });

  return {
    __esModule: true,
    BottomSheetBackdrop: ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children),
    BottomSheetModal,
    BottomSheetModalProvider: ({ children }: { children: React.ReactNode }) => children,
    BottomSheetSectionList: SectionList,
    BottomSheetTextInput: TextInput,
  };
});

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
      altitude: 0,
    },
    timestamp: 1234567890,
  })),
}));

// Mock expo-battery
jest.mock('expo-battery', () => ({
  getBatteryLevelAsync: jest.fn(() => Promise.resolve(0.67)),
  getBatteryStateAsync: jest.fn(() => Promise.resolve(3)),
  isLowPowerModeEnabledAsync: jest.fn(() => Promise.resolve(false)),
}));

// Mock expo-network
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() => Promise.resolve({
    type: 'WIFI',
    isConnected: true,
    isInternetReachable: true,
  })),
}));

// Mock expo-file-system (legacy API)
jest.mock('expo-file-system/legacy', () => ({
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  copyAsync: jest.fn(() => Promise.resolve()),
  cacheDirectory: 'file:///cache/',
  documentDirectory: 'file:///documents/',
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true })),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  EncodingType: { Base64: 'base64' },
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notif-1')),
  AndroidImportance: {
    DEFAULT: 3,
  },
}));

// Mock react-native-purchases
jest.mock('react-native-purchases', () => {
  const mockModule = {
    isConfigured: jest.fn(() => Promise.resolve(false)),
    configure: jest.fn(),
    setLogLevel: jest.fn(() => Promise.resolve()),
    getCustomerInfo: jest.fn(() => Promise.resolve({
      entitlements: { active: {}, all: {}, verification: 'NOT_REQUESTED' },
      activeSubscriptions: [],
      allPurchasedProductIdentifiers: [],
      latestExpirationDate: null,
      firstSeen: '2026-03-08T00:00:00.000Z',
      originalAppUserId: '$RCAnonymousID:test',
      requestDate: '2026-03-08T00:00:00.000Z',
      allExpirationDates: {},
      allPurchaseDates: {},
      originalApplicationVersion: null,
      originalPurchaseDate: null,
      managementURL: null,
      nonSubscriptionTransactions: [],
      subscriptionsByProductIdentifier: {},
    })),
    getOfferings: jest.fn(() => Promise.resolve({ all: {}, current: null })),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    addCustomerInfoUpdateListener: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(() => true),
    invalidateCustomerInfoCache: jest.fn(() => Promise.resolve()),
    LOG_LEVEL: {
      DEBUG: 'DEBUG',
      WARN: 'WARN',
    },
    PACKAGE_TYPE: {
      MONTHLY: 'MONTHLY',
      ANNUAL: 'ANNUAL',
    },
    PURCHASES_ERROR_CODE: {
      PURCHASE_CANCELLED_ERROR: '1',
      PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR: '5',
      INVALID_CREDENTIALS_ERROR: '11',
      PAYMENT_PENDING_ERROR: '20',
      CONFIGURATION_ERROR: '23',
    },
    ENTITLEMENT_VERIFICATION_MODE: {
      INFORMATIONAL: 'INFORMATIONAL',
    },
    STOREKIT_VERSION: {
      DEFAULT: 'DEFAULT',
    },
  };

  return {
    __esModule: true,
    default: mockModule,
    ...mockModule,
  };
});

jest.mock('react-native-draggable-flatlist', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockDraggableFlatList = ({
    data,
    renderItem,
  }: {
    data: Array<unknown>;
    renderItem: (params: { item: unknown; getIndex: () => number; drag: () => void; isActive: boolean }) => React.ReactNode;
  }) => React.createElement(
    View,
    null,
    data.map((item, index) =>
      React.createElement(
        React.Fragment,
        { key: String(index) },
        renderItem({
          item,
          getIndex: () => index,
          drag: jest.fn(),
          isActive: false,
        }),
      )),
  );

  return {
    __esModule: true,
    default: MockDraggableFlatList,
    ScaleDecorator: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock posthog-react-native
jest.mock('posthog-react-native', () => {
  const client = {
    identify: jest.fn(() => Promise.resolve()),
    register: jest.fn(() => Promise.resolve()),
    screen: jest.fn(() => Promise.resolve()),
    capture: jest.fn(() => Promise.resolve()),
    reset: jest.fn(),
    flush: jest.fn(() => Promise.resolve()),
  };

  return {
    __esModule: true,
    default: jest.fn(() => client),
    PostHogProvider: ({ children }: { children: unknown }) => children,
    usePostHog: jest.fn(() => client),
  };
});

// Provide a minimal crypto.getRandomValues for gateway.ts
if (!globalThis.crypto) {
  (globalThis as any).crypto = {};
}
if (!globalThis.crypto.getRandomValues) {
  globalThis.crypto.getRandomValues = <T extends ArrayBufferView>(array: T): T => {
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return array;
  };
}
