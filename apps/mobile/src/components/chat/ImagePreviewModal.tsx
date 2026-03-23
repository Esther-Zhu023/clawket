import { ImageZoom } from '@likashefqet/react-native-image-zoom';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, gestureHandlerRootHOC } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  makeMutable,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { useAppTheme } from '../../theme';
import { FontSize, Radius, Space } from '../../theme/tokens';
import { CircleButton } from '../ui';

type Props = {
  visible: boolean;
  uris: string[];
  index: number;
  screenWidth: number;
  screenHeight: number;
  insetsTop: number;
  insetsBottom: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

const OPEN_SHIFT = 20;
const CLOSE_SHIFT = 96;
const SWIPE_PAGE_RATIO = 0.18;
const SWIPE_CLOSE_RATIO = 0.16;
const SWIPE_VELOCITY_THRESHOLD = 1100;
const PAGE_VELOCITY_THRESHOLD = 720;
const DIRECTION_LOCK_DISTANCE = 10;
const DIRECTION_LOCK_RATIO = 1.15;

function applyEdgeResistance(value: number, min: number, max: number) {
  'worklet';

  if (value < min) {
    return min - (min - value) * 0.35;
  }
  if (value > max) {
    return max + (value - max) * 0.35;
  }
  return value;
}

function clampIndex(index: number, count: number) {
  'worklet';

  return Math.max(0, Math.min(index, Math.max(0, count - 1)));
}

function PreviewZoomImage({
  uri,
  width,
  height,
  scale,
}: {
  uri: string;
  width: number;
  height: number;
  scale: SharedValue<number>;
}) {
  return (
    <ImageZoom
      uri={uri}
      minScale={1}
      maxScale={4}
      scale={scale}
      doubleTapScale={2.2}
      isDoubleTapEnabled
      style={{ width, height: height * 0.88 }}
      resizeMode="contain"
    />
  );
}

const ModalGestureRoot = gestureHandlerRootHOC(function ModalGestureRoot({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
});

export function ImagePreviewModal({
  visible,
  uris,
  index,
  screenWidth,
  screenHeight,
  insetsTop,
  insetsBottom,
  onClose,
  onIndexChange,
}: Props): React.JSX.Element {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const closeRequestedRef = useRef(false);

  const scales = useMemo(
    () => uris.map(() => makeMutable(1)),
    [uris],
  );

  const currentIndex = useSharedValue(index);
  const pageTranslateX = useSharedValue(-index * screenWidth);
  const dismissTranslateY = useSharedValue(OPEN_SHIFT);
  const overlayProgress = useSharedValue(0);
  const gestureMode = useSharedValue<0 | 1 | 2>(0);
  const gestureStartPageX = useSharedValue(0);

  useEffect(() => {
    closeRequestedRef.current = false;
  }, [visible, uris]);

  useEffect(() => {
    currentIndex.value = index;
    pageTranslateX.value = withSpring(-index * screenWidth, {
      damping: 18,
      stiffness: 210,
      mass: 0.35,
    });
  }, [currentIndex, index, pageTranslateX, screenWidth]);

  useEffect(() => {
    if (!visible) {
      overlayProgress.value = 0;
      dismissTranslateY.value = 0;
      return;
    }

    dismissTranslateY.value = OPEN_SHIFT;
    overlayProgress.value = 0;
    pageTranslateX.value = -index * screenWidth;

    overlayProgress.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
    dismissTranslateY.value = withSpring(0, {
      damping: 17,
      stiffness: 180,
      mass: 0.4,
    });
  }, [dismissTranslateY, overlayProgress, pageTranslateX, screenWidth, visible]);

  const finishClose = useCallback(() => {
    if (closeRequestedRef.current) {
      return;
    }
    closeRequestedRef.current = true;
    onClose();
  }, [onClose]);

  const animateClose = useCallback(() => {
    overlayProgress.value = withTiming(0, {
      duration: 150,
      easing: Easing.out(Easing.quad),
    });
    dismissTranslateY.value = withTiming(
      Math.max(screenHeight * 0.2, CLOSE_SHIFT),
      {
        duration: 170,
        easing: Easing.out(Easing.quad),
      },
      (finished) => {
        if (finished) {
          runOnJS(finishClose)();
        }
      },
    );
  }, [dismissTranslateY, finishClose, overlayProgress, screenHeight]);

  const setPageIndex = useCallback(
    (nextIndex: number) => {
      onIndexChange(nextIndex);
    },
    [onIndexChange],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .onTouchesDown((_, manager) => {
          const currentScale = scales[currentIndex.value]?.value ?? 1;
          if (!uris.length || currentScale > 1.02) {
            manager.fail();
          }
        })
        .onStart(() => {
          gestureMode.value = 0;
          gestureStartPageX.value = pageTranslateX.value;
        })
        .onUpdate((event) => {
          if (!uris.length) {
            return;
          }

          const currentScale = scales[currentIndex.value]?.value ?? 1;
          if (currentScale > 1.02) {
            return;
          }

          const absX = Math.abs(event.translationX);
          const absY = Math.abs(event.translationY);

          if (gestureMode.value === 0) {
            if (
              event.translationY > 0 &&
              absY > DIRECTION_LOCK_DISTANCE &&
              absY > absX * DIRECTION_LOCK_RATIO
            ) {
              gestureMode.value = 1;
            } else if (
              absX > DIRECTION_LOCK_DISTANCE &&
              absX > absY * DIRECTION_LOCK_RATIO
            ) {
              gestureMode.value = 2;
            } else {
              return;
            }
          }

          if (gestureMode.value === 1) {
            dismissTranslateY.value = Math.max(0, event.translationY);
            return;
          }

          const minTranslateX = -(uris.length - 1) * screenWidth;
          const nextTranslateX = gestureStartPageX.value + event.translationX;
          pageTranslateX.value = applyEdgeResistance(nextTranslateX, minTranslateX, 0);
        })
        .onEnd((event) => {
          if (!uris.length) {
            return;
          }

          const currentScale = scales[currentIndex.value]?.value ?? 1;
          const activeIndex = currentIndex.value;
          const closeDistance = Math.max(screenHeight * SWIPE_CLOSE_RATIO, 110);

          if (gestureMode.value === 1 && currentScale <= 1.02) {
            if (
              dismissTranslateY.value >= closeDistance ||
              event.velocityY >= SWIPE_VELOCITY_THRESHOLD
            ) {
              overlayProgress.value = withTiming(0, {
                duration: 140,
                easing: Easing.out(Easing.quad),
              });
              dismissTranslateY.value = withTiming(
                Math.max(screenHeight * 0.2, CLOSE_SHIFT),
                {
                  duration: 170,
                  easing: Easing.out(Easing.quad),
                },
                (finished) => {
                  if (finished) {
                    runOnJS(finishClose)();
                  }
                },
              );
              gestureMode.value = 0;
              return;
            }

            dismissTranslateY.value = withSpring(0, {
              damping: 18,
              stiffness: 220,
              mass: 0.4,
            });
            gestureMode.value = 0;
            return;
          }

          if (gestureMode.value === 2 && currentScale <= 1.02) {
            let nextIndex = activeIndex;
            const pageThreshold = screenWidth * SWIPE_PAGE_RATIO;

            if (
              event.translationX <= -pageThreshold ||
              event.velocityX <= -PAGE_VELOCITY_THRESHOLD
            ) {
              nextIndex = clampIndex(activeIndex + 1, uris.length);
            } else if (
              event.translationX >= pageThreshold ||
              event.velocityX >= PAGE_VELOCITY_THRESHOLD
            ) {
              nextIndex = clampIndex(activeIndex - 1, uris.length);
            }

            currentIndex.value = nextIndex;
            pageTranslateX.value = withSpring(-nextIndex * screenWidth, {
              damping: 18,
              stiffness: 220,
              mass: 0.38,
            });
            if (nextIndex !== activeIndex) {
              runOnJS(setPageIndex)(nextIndex);
            }
          }

          gestureMode.value = 0;
        })
        .onFinalize(() => {
          if (gestureMode.value === 1) {
            dismissTranslateY.value = withSpring(0, {
              damping: 18,
              stiffness: 220,
              mass: 0.4,
            });
          }
          gestureMode.value = 0;
        }),
    [
      currentIndex,
      dismissTranslateY,
      finishClose,
      gestureMode,
      gestureStartPageX,
      overlayProgress,
      pageTranslateX,
      scales,
      screenHeight,
      screenWidth,
      setPageIndex,
      uris.length,
    ],
  );

  const overlayAnimatedStyle = useAnimatedStyle(() => {
    const dismissFactor = interpolate(
      dismissTranslateY.value,
      [0, screenHeight * 0.28],
      [1, 0.38],
      'clamp',
    );

    return {
      opacity: overlayProgress.value * dismissFactor,
    };
  });

  const contentAnimatedStyle = useAnimatedStyle(() => {
    const scaleDown = interpolate(
      dismissTranslateY.value,
      [0, screenHeight * 0.28],
      [1, 0.92],
      'clamp',
    );

    return {
      transform: [
        { translateY: dismissTranslateY.value },
        { scale: scaleDown },
      ],
    };
  });

  const pagesAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pageTranslateX.value }],
  }));

  const closeButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayProgress.value,
    transform: [
      {
        translateY: interpolate(overlayProgress.value, [0, 1], [-8, 0], 'clamp'),
      },
    ],
  }));

  if (!visible) {
    return <></>;
  }

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={animateClose}>
      <ModalGestureRoot>
        <Animated.View style={[styles.previewOverlay, overlayAnimatedStyle]}>
          <Animated.View style={[styles.previewClose, { top: insetsTop + Space.md }, closeButtonAnimatedStyle]}>
            <CircleButton
              icon={<X size={20} color={theme.colors.primaryText} strokeWidth={2.2} />}
              onPress={animateClose}
              size={36}
              color={theme.colors.overlay}
            />
          </Animated.View>

          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.gestureSurface, contentAnimatedStyle]}>
              <Animated.View
                style={[
                  styles.pageRow,
                  { width: Math.max(uris.length, 1) * screenWidth },
                  pagesAnimatedStyle,
                ]}
              >
                {uris.map((uri, itemIndex) => (
                  <View
                    key={`${uri}_${itemIndex}`}
                    style={[
                      styles.page,
                      { width: screenWidth, height: screenHeight },
                    ]}
                  >
                    <PreviewZoomImage
                      uri={uri}
                      width={screenWidth}
                      height={screenHeight}
                      scale={scales[itemIndex]}
                    />
                  </View>
                ))}
              </Animated.View>
            </Animated.View>
          </GestureDetector>

          {uris.length > 1 ? (
            <Text style={[styles.previewPager, { bottom: Math.max(insetsBottom, Space.lg) }]}>
              {index + 1} / {uris.length}
            </Text>
          ) : null}
        </Animated.View>
      </ModalGestureRoot>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['theme']['colors']) {
  return StyleSheet.create({
    previewOverlay: {
      flex: 1,
      backgroundColor: colors.chatPreviewMask,
    },
    previewClose: {
      position: 'absolute',
      right: Space.lg,
      zIndex: 10,
    },
    gestureSurface: {
      flex: 1,
      overflow: 'hidden',
    },
    pageRow: {
      flex: 1,
      flexDirection: 'row',
    },
    page: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    previewPager: {
      position: 'absolute',
      alignSelf: 'center',
      color: colors.primaryText,
      fontSize: FontSize.md,
      backgroundColor: colors.overlay,
      paddingHorizontal: 10,
      paddingVertical: Space.xs,
      borderRadius: Radius.sm + 2,
    },
  });
}
