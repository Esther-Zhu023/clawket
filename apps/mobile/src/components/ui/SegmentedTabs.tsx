import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { triggerLightImpact } from '../../services/haptics';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';

export type SegmentedTabItem<T extends string = string> = {
  key: T;
  label: string;
};

type Props<T extends string = string> = {
  tabs: SegmentedTabItem<T>[];
  active: T;
  onSwitch: (key: T) => void;
  containerStyle?: StyleProp<ViewStyle>;
};

export function SegmentedTabs<T extends string = string>({ tabs, active, onSwitch, containerStyle }: Props<T>): React.JSX.Element {
  const { theme } = useAppTheme();
  const colors = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceMuted }, containerStyle]}>
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            activeOpacity={0.7}
            onPress={() => { triggerLightImpact(); onSwitch(t.key); }}
            style={[
              styles.tab,
              isActive && [styles.tabActive, { backgroundColor: colors.surface }],
            ]}
          >
            <Text style={[
              styles.label,
              { color: isActive ? colors.text : colors.textMuted },
              isActive && styles.labelActive,
            ]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: Space.lg,
    marginTop: Space.sm,
    marginBottom: Space.xs,
    borderRadius: Radius.sm,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: Radius.sm - 1,
    alignItems: 'center',
  },
  tabActive: {},
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
  },
  labelActive: {
    fontWeight: FontWeight.semibold,
  },
});
