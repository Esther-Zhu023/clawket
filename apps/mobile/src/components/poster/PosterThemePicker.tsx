import React, { useCallback, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { POSTER_THEMES, PosterTheme } from './posterThemes';

type Props = {
  current: PosterTheme;
  onSelect: (theme: PosterTheme) => void;
};

/**
 * A small circular button showing the current theme accent color.
 * Tapping it reveals a floating row of color dots below, using absolute
 * positioning so it does not affect the parent action bar layout.
 */
export function PosterThemePicker({ current, onSelect }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [anim] = useState(() => new Animated.Value(0));

  const toggle = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    Animated.spring(anim, {
      toValue: next ? 1 : 0,
      damping: 18,
      stiffness: 260,
      useNativeDriver: true,
    }).start();
  }, [expanded, anim]);

  const handleSelect = useCallback((theme: PosterTheme) => {
    onSelect(theme);
    setExpanded(false);
    Animated.spring(anim, {
      toValue: 0,
      damping: 18,
      stiffness: 260,
      useNativeDriver: true,
    }).start();
  }, [onSelect, anim]);

  const paletteStyle = {
    opacity: anim,
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
      { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
    ],
  };

  return (
    <View style={s.root}>
      <TouchableOpacity style={s.trigger} onPress={toggle} activeOpacity={0.7}>
        <View style={[s.triggerDot, { backgroundColor: current.swatch }]} />
      </TouchableOpacity>
      {expanded && (
        <Animated.View style={[s.palette, paletteStyle]}>
          {POSTER_THEMES.map((theme) => {
            const isActive = theme.id === current.id;
            return (
              <TouchableOpacity
                key={theme.id}
                activeOpacity={0.7}
                onPress={() => handleSelect(theme)}
                style={s.dotTouch}
              >
                <View style={[
                  s.dot,
                  { backgroundColor: theme.swatch },
                  isActive && s.dotActive,
                ]} />
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    // Keep the trigger in normal flow; palette floats below via absolute positioning.
  },
  trigger: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  palette: {
    position: 'absolute',
    top: 48,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 2,
  },
  dotTouch: {
    padding: 4,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  dotActive: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
