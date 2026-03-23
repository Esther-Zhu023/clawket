import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { X } from 'lucide-react-native';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import { IconButton } from '../../../components/ui';
import {
  type AppUpdateAnnouncement,
  type AppUpdateAnnouncementEntry,
} from '../../../features/app-updates/releases';
import { AppUpdateAnnouncementEntryList } from '../../../features/app-updates/AppUpdateAnnouncementEntryList';
import { useAppTheme } from '../../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../../theme/tokens';

type Props = {
  visible: boolean;
  announcement: AppUpdateAnnouncement | null;
  debugMode: boolean;
  currentVersion: string;
  onClose: () => void;
  onEntryPress: (entry: AppUpdateAnnouncementEntry) => void;
};

function SheetContainer({ children }: React.PropsWithChildren): React.JSX.Element {
  if (Platform.OS !== 'ios') {
    return <>{children}</>;
  }

  return (
    <FullWindowOverlay>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {children}
      </View>
    </FullWindowOverlay>
  );
}

export function AppUpdateAnnouncementModal({
  visible,
  announcement,
  debugMode,
  currentVersion,
  onClose,
  onEntryPress,
}: Props): React.JSX.Element | null {
  const { theme } = useAppTheme();
  const { t } = useTranslation('chat');
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const maxDynamicContentSize = useMemo(
    () => Math.max(320, height - insets.top - Space.xxxl),
    [height, insets.top],
  );

  useEffect(() => {
    if (!announcement) return;
    if (visible) {
      requestAnimationFrame(() => {
        bottomSheetRef.current?.present();
      });
      return;
    }

    bottomSheetRef.current?.dismiss();
  }, [announcement, visible]);

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={theme.scheme === 'dark' ? 0.58 : 0.34}
        pressBehavior="close"
      />
    ),
    [theme.scheme],
  );

  if (!announcement) return null;

  return (
    <SheetContainer>
      <BottomSheetModal
        ref={bottomSheetRef}
        enableDynamicSizing
        enablePanDownToClose
        topInset={insets.top}
        maxDynamicContentSize={maxDynamicContentSize}
        onDismiss={handleDismiss}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.sheetBackground}
      >
        <BottomSheetView
          style={[styles.content, { paddingBottom: Math.max(insets.bottom, Space.lg) + Space.lg }]}
        >
          <View style={styles.topRow}>
            <View style={styles.headerLeading}>
              <View style={styles.versionPill}>
                <Text style={styles.versionText}>v{currentVersion}</Text>
              </View>
            </View>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.headerEmoji}>{'🎉'}</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {t("What's New")}
              </Text>
            </View>
            <IconButton
              icon={<X size={20} color={theme.colors.textMuted} strokeWidth={2} />}
              onPress={onClose}
            />
          </View>

          <View style={styles.entries}>
            <AppUpdateAnnouncementEntryList
              colors={theme.colors}
              entries={announcement.entries}
              onEntryPress={onEntryPress}
              t={t}
            />
          </View>

          {debugMode ? (
            <Text style={styles.debugHint}>{t(announcement.debugHint)}</Text>
          ) : null}
        </BottomSheetView>
      </BottomSheetModal>
    </SheetContainer>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['theme']['colors']) {
  return StyleSheet.create({
    handleIndicator: {
      width: 42,
      backgroundColor: colors.borderStrong,
    },
    sheetBackground: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: Radius.lg,
      borderTopRightRadius: Radius.lg,
    },
    content: {
      paddingHorizontal: Space.lg,
      paddingTop: Space.sm,
      gap: Space.lg,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
      gap: Space.sm,
    },
    headerLeading: {
      minWidth: 44,
      height: 44,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    headerTitleGroup: {
      flex: 1,
      flexShrink: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Space.sm,
      paddingHorizontal: Space.sm,
    },
    headerEmoji: {
      fontSize: FontSize.xl,
    },
    headerTitle: {
      flexShrink: 1,
      color: colors.text,
      fontSize: FontSize.lg,
      fontWeight: FontWeight.semibold,
    },
    versionPill: {
      paddingHorizontal: Space.sm,
      paddingVertical: 4,
      borderRadius: Radius.full,
      backgroundColor: colors.primarySoft,
    },
    versionText: {
      color: colors.primary,
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
    },
    entries: {
      gap: Space.sm,
    },
    debugHint: {
      color: colors.warning,
      fontSize: FontSize.md,
      lineHeight: 18,
    },
  });
}
