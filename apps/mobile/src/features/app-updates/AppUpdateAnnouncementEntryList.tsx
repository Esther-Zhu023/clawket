import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import {
  type AppUpdateAnnouncementEntry,
} from './releases';
import type { AppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';

type Props = {
  entries: AppUpdateAnnouncementEntry[];
  colors: AppTheme['colors'];
  onEntryPress?: (entry: AppUpdateAnnouncementEntry) => void;
  t: (key: string) => string;
};

function TagBadge({ label, colors }: { label: string; colors: AppTheme['colors'] }) {
  const isNew = label === 'New';
  const bgColor = isNew ? colors.primarySoft : colors.surfaceMuted;
  const textColor = isNew ? colors.primary : colors.textMuted;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

export function AppUpdateAnnouncementEntryList({ entries, colors, onEntryPress, t }: Props): React.JSX.Element {
  const stylesWithTheme = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={stylesWithTheme.entries}>
      {entries.map((entry, index) => {
        const isNavigable = entry.action.type === 'open_url'
          || entry.action.type === 'navigate_console'
          || entry.action.type === 'navigate_config';
        const isLast = index === entries.length - 1;

        const content = (
          <View style={[stylesWithTheme.entryRow, !isLast && stylesWithTheme.entryBorder]}>
            <View style={stylesWithTheme.entryEmojiContainer}>
              <Text style={stylesWithTheme.entryEmoji}>{entry.emoji}</Text>
            </View>
            <View style={stylesWithTheme.entryCopy}>
              <View style={stylesWithTheme.entryTitleRow}>
                <Text style={stylesWithTheme.entryTitle} numberOfLines={1}>
                  {t(entry.title)}
                </Text>
                {entry.tag ? (
                  <TagBadge label={t(entry.tag)} colors={colors} />
                ) : null}
              </View>
              {entry.subtitle ? (
                <Text style={stylesWithTheme.entrySubtitle}>
                  {t(entry.subtitle)}
                </Text>
              ) : null}
            </View>
            {isNavigable ? (
              <ChevronRight
                size={18}
                color={colors.textSubtle}
                strokeWidth={2}
              />
            ) : null}
          </View>
        );

        if (isNavigable && onEntryPress) {
          return (
            <Pressable
              key={entry.id}
              onPress={() => onEntryPress(entry)}
              style={({ pressed }) => pressed && stylesWithTheme.entryPressed}
            >
              {content}
            </Pressable>
          );
        }

        return <View key={entry.id}>{content}</View>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xs,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
});

function createStyles(colors: AppTheme['colors']) {
  return StyleSheet.create({
    entries: {
      borderRadius: Radius.md,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
    },
    entryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Space.lg,
      paddingVertical: Space.md,
      gap: Space.md,
    },
    entryBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    entryPressed: {
      opacity: 0.7,
    },
    entryEmojiContainer: {
      width: 40,
      height: 40,
      borderRadius: Radius.sm,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    entryEmoji: {
      fontSize: FontSize.xl,
    },
    entryCopy: {
      flex: 1,
      gap: 2,
    },
    entryTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
    },
    entryTitle: {
      color: colors.text,
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      flexShrink: 1,
    },
    entrySubtitle: {
      color: colors.textMuted,
      fontSize: FontSize.md,
      lineHeight: 18,
    },
  });
}
