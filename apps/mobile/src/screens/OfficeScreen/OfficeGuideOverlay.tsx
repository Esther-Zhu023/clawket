import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Info } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ModalSheet } from '../../components/ui';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Shadow, Space } from '../../theme/tokens';

type GuideItem = {
  titleKey: string;
  bodyKey: string;
};

type OverlayProps = {
  visible: boolean;
  onClose: () => void;
};

type ButtonProps = {
  top: number;
  right: number;
  onPress: () => void;
};

const ROLE_ITEMS: GuideItem[] = [
  {
    titleKey: 'Office guide role boss title',
    bodyKey: 'Office guide role boss body',
  },
  {
    titleKey: 'Office guide role assistant title',
    bodyKey: 'Office guide role assistant body',
  },
  {
    titleKey: 'Office guide role workers title',
    bodyKey: 'Office guide role workers body',
  },
  {
    titleKey: 'Office guide role activity title',
    bodyKey: 'Office guide role activity body',
  },
];

const FURNITURE_ITEMS: GuideItem[] = [
  {
    titleKey: 'Office guide furniture bookshelf title',
    bodyKey: 'Office guide furniture bookshelf body',
  },
  {
    titleKey: 'Office guide furniture calendar title',
    bodyKey: 'Office guide furniture calendar body',
  },
  {
    titleKey: 'Office guide furniture cabinet title',
    bodyKey: 'Office guide furniture cabinet body',
  },
  {
    titleKey: 'Office guide furniture whiteboard title',
    bodyKey: 'Office guide furniture whiteboard body',
  },
  {
    titleKey: 'Office guide furniture connections title',
    bodyKey: 'Office guide furniture connections body',
  },
  {
    titleKey: 'Office guide furniture toolbox title',
    bodyKey: 'Office guide furniture toolbox body',
  },
];

export function OfficeGuideOverlay({
  visible,
  onClose,
}: OverlayProps): React.JSX.Element {
  const { theme } = useAppTheme();
  const { t } = useTranslation('common');
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={t('Office Guide')}
      maxHeight="84%"
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{t('Office guide intro title')}</Text>
          <Text style={styles.heroBody}>{t('Office guide intro body')}</Text>
          <View style={styles.hintPill}>
            <Text style={styles.hintText}>{t('Office guide hint')}</Text>
          </View>
        </View>

        <GuideSection
          title={t('Office guide roles title')}
          items={ROLE_ITEMS}
        />

        <GuideSection
          title={t('Office guide furniture title')}
          items={FURNITURE_ITEMS}
        />

        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>{t('Done')}</Text>
        </Pressable>
      </ScrollView>
    </ModalSheet>
  );
}

function GuideSection({
  title,
  items,
}: {
  title: string;
  items: GuideItem[];
}): React.JSX.Element {
  const { theme } = useAppTheme();
  const { t } = useTranslation('common');
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.itemList}>
        {items.map((item) => (
          <View key={item.titleKey} style={styles.itemCard}>
            <View style={styles.itemMarker} />
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>{t(item.titleKey)}</Text>
              <Text style={styles.itemBody}>{t(item.bodyKey)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function OfficeGuideButton({
  top,
  right,
  onPress,
}: ButtonProps): React.JSX.Element {
  const { theme } = useAppTheme();
  const { t } = useTranslation('common');
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  return (
    <Pressable
      accessibilityLabel={t('Open Office Guide')}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.floatingButton,
        { top, right },
        pressed && styles.floatingButtonPressed,
      ]}
    >
      <Info size={20} color={theme.colors.primary} strokeWidth={2.2} />
    </Pressable>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['theme']['colors']) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: Space.lg,
      paddingBottom: Space.xl,
      gap: Space.lg,
    },
    heroCard: {
      gap: Space.sm,
      padding: Space.lg,
      borderRadius: Radius.lg,
      backgroundColor: colors.primarySoft,
    },
    heroTitle: {
      color: colors.text,
      fontSize: FontSize.xl,
      fontWeight: FontWeight.semibold,
    },
    heroBody: {
      color: colors.text,
      fontSize: FontSize.base,
      lineHeight: 22,
    },
    hintPill: {
      alignSelf: 'flex-start',
      marginTop: Space.xs,
      paddingHorizontal: Space.sm,
      paddingVertical: Space.xs,
      borderRadius: Radius.full,
      backgroundColor: colors.surface,
    },
    hintText: {
      color: colors.textMuted,
      fontSize: FontSize.sm,
      lineHeight: 16,
      fontWeight: FontWeight.medium,
    },
    section: {
      gap: Space.sm,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: FontSize.lg,
      fontWeight: FontWeight.semibold,
    },
    itemList: {
      gap: Space.sm,
    },
    itemCard: {
      flexDirection: 'row',
      gap: Space.md,
      padding: Space.md,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    itemMarker: {
      width: 8,
      borderRadius: Radius.full,
      backgroundColor: colors.primary,
    },
    itemCopy: {
      flex: 1,
      gap: Space.xs,
    },
    itemTitle: {
      color: colors.text,
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
    },
    itemBody: {
      color: colors.textMuted,
      fontSize: FontSize.md,
      lineHeight: 19,
    },
    primaryButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
      borderRadius: Radius.md,
      backgroundColor: colors.primary,
    },
    primaryButtonPressed: {
      opacity: 0.88,
    },
    primaryButtonText: {
      color: colors.surface,
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
    },
    floatingButton: {
      position: 'absolute',
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      ...Shadow.md,
    },
    floatingButtonPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.97 }],
    },
  });
}
