import React from 'react';
import { Platform, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ChevronLeft, X } from 'lucide-react-native';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Space } from '../../theme/tokens';
import { IconButton } from './IconButton';

type Props = {
  title: string;
  topInset: number;
  onBack?: () => void;
  dismissStyle?: 'back' | 'close';
  subtitle?: string;
  topInsetBehavior?: 'auto' | 'safe' | 'compact' | 'none';
  rightContent?: React.ReactNode;
  style?: ViewStyle;
  leftSlotStyle?: ViewStyle;
  rightSlotStyle?: ViewStyle;
};

export function ScreenHeader({
  title,
  topInset,
  onBack,
  dismissStyle = 'back',
  subtitle,
  topInsetBehavior = 'auto',
  rightContent,
  style,
  leftSlotStyle,
  rightSlotStyle,
}: Props): React.JSX.Element {
  const { theme } = useAppTheme();
  const { colors } = theme;
  const resolvedTopInsetBehavior =
    topInsetBehavior === 'auto'
      ? (dismissStyle === 'close' ? 'compact' : 'safe')
      : topInsetBehavior;
  const resolvedTopPadding =
    resolvedTopInsetBehavior === 'none'
      ? 0
      : resolvedTopInsetBehavior === 'compact'
        // On Android, close-style content headers need the full safe-area
        // inset or they can slide under the system status bar.
        ? Platform.OS === 'android'
          ? topInset
          : Math.min(topInset, Space.lg)
        : topInset;
  const showBorder = dismissStyle !== 'close';

  return (
    <View
      collapsable={false}
      style={[
        styles.headerOuter,
        {
          paddingTop: resolvedTopPadding,
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          borderBottomWidth: showBorder ? 1 : 0,
        },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleLayer} pointerEvents="none">
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={[styles.leftSlot, leftSlotStyle]}>
          {onBack ? (
            <IconButton
              icon={
                dismissStyle === 'close'
                  ? <X size={20} color={colors.textMuted} strokeWidth={2} />
                  : <ChevronLeft size={22} color={colors.textMuted} strokeWidth={2} />
              }
              onPress={onBack}
            />
          ) : null}
        </View>
        <View style={styles.spacer} />
        <View style={[styles.rightSlot, rightSlotStyle]}>
          {rightContent ?? null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerOuter: {
    paddingHorizontal: Space.md,
    paddingBottom: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  titleLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  leftSlot: {
    width: 44,
    alignItems: 'flex-start',
  },
  spacer: {
    flex: 1,
  },
  title: {
    textAlign: 'center',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  subtitle: {
    marginTop: 2,
    textAlign: 'center',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  rightSlot: {
    width: 44,
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
