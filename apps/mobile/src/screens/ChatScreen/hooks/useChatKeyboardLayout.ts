import { useCallback, useEffect, useMemo } from 'react';
import { Keyboard, Platform } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { useGenericKeyboardHandler, useKeyboardState } from 'react-native-keyboard-controller';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTabBarHeight } from '../../../hooks/useTabBarHeight';
import { Space } from '../../../theme/tokens';

type Props = {
  insets: EdgeInsets;
  keyboardVisible: boolean;
  screenHeight: number;
};

export function useChatKeyboardLayout({ insets, keyboardVisible, screenHeight }: Props) {
  const tabBarHeight = useTabBarHeight();
  const composerBottomPadding = Space.md;
  const androidKeyboardGap = Space.sm;
  const tabBarOffset = Platform.OS === 'ios' ? tabBarHeight : 0;
  const keyboardHeightSV = useSharedValue(0);
  const composerFocusedSV = useSharedValue(false);

  const handleComposerFocus = useCallback(() => {
    composerFocusedSV.value = true;
  }, [composerFocusedSV]);

  const handleComposerBlur = useCallback(() => {
    composerFocusedSV.value = false;
  }, [composerFocusedSV]);

  useGenericKeyboardHandler({
    onStart: (e) => {
      'worklet';
      keyboardHeightSV.value = e.height;
    },
    onMove: (e) => {
      'worklet';
      keyboardHeightSV.value = e.height;
    },
    onInteractive: (e) => {
      'worklet';
      keyboardHeightSV.value = e.height;
    },
    onEnd: (e) => {
      'worklet';
      keyboardHeightSV.value = e.height;
    },
  }, []);

  const keyboardState = useKeyboardState((state) => ({
    height: state.height,
    isVisible: state.isVisible,
  }));

  useEffect(() => {
    if (__DEV__ && Platform.OS === 'android') {
      console.log('[ChatKeyboardDebug]', {
        reportedHeight: keyboardState.height,
        keyboardVisible: keyboardState.isVisible,
        safeBottomInset: insets.bottom,
      });
    }
  }, [insets.bottom, keyboardState.height, keyboardState.isVisible]);

  const animatedRootStyle = useAnimatedStyle(() => {
    if (composerFocusedSV.value) {
      return {
        paddingBottom: Platform.OS === 'android'
          // sceneStyle already adds tabBarHeight padding; subtract it so we
          // don't double-count when the keyboard covers the tab bar area.
          // Keep a small visual gap above the Android IME so the composer
          // does not sit flush against the keyboard.
          ? Math.max(0, keyboardHeightSV.value - insets.bottom - tabBarHeight + androidKeyboardGap)
          : Math.max(tabBarOffset, keyboardHeightSV.value),
      };
    }

    return {
      paddingBottom: withTiming(
        Platform.OS === 'android' ? 0 : tabBarOffset,
        { duration: 250 },
      ),
    };
  });

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const composerSwipeGesture = useMemo(() =>
    Gesture.Pan()
      .activeOffsetY(12)
      .failOffsetY(-5)
      .failOffsetX([-10, 10])
      .onStart(() => {
        runOnJS(dismissKeyboard)();
      }), [dismissKeyboard]);

  const composerBottomOffset = keyboardVisible ? 0 : tabBarOffset;
  const modalBottomInset = insets.bottom + composerBottomOffset;
  const slashSuggestionsMaxHeight = useMemo(
    () => Math.round(Math.min(302, Math.max(182, screenHeight * 0.34 + 2))),
    [screenHeight],
  );

  return {
    animatedRootStyle,
    composerBottomPadding,
    composerSwipeGesture,
    handleComposerBlur,
    handleComposerFocus,
    modalBottomInset,
    slashSuggestionsMaxHeight,
  };
}
