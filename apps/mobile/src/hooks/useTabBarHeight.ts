import { Platform } from 'react-native';
import { useBottomTabBarHeight as useNativeTabBarHeight } from 'react-native-bottom-tabs';
import { useBottomTabBarHeight as useJsTabBarHeight } from '@react-navigation/bottom-tabs';

/**
 * Cross-platform hook: native tab bar height on iOS, JS tab bar height on Android.
 * Falls back to 0 when rendered outside a bottom-tab navigator, such as
 * root-level modal flows opened above tabs.
 */
export function useTabBarHeight(): number {
  try {
    if (Platform.OS === 'ios') {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useNativeTabBarHeight();
    }
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useJsTabBarHeight();
  } catch {
    return 0;
  }
}
