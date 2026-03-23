import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ModalSheet, ThemedSwitch } from '../ui';
import { useAppTheme } from '../../theme';
import { useAppContext } from '../../contexts/AppContext';
import { useGatewayToolSettings } from '../../screens/ConfigScreen/hooks/useGatewayToolSettings';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';
import type { ExecAsk } from '../../utils/gateway-tool-settings';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function WebSearchModal({ visible, onClose }: Props): React.JSX.Element {
  const { t } = useTranslation('chat');

  return (
    <ModalSheet visible={visible} onClose={onClose} title={t('Tools')} maxHeight="60%">
      {visible ? <WebSearchModalContent onClose={onClose} /> : null}
    </ModalSheet>
  );
}

function WebSearchModalContent({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { t } = useTranslation('chat');
  const { theme } = useAppTheme();
  const { gateway, gatewayEpoch, config } = useAppContext();
  const navigation = useNavigation();
  const hasActiveGateway = Boolean(config?.url);
  const toolSettings = useGatewayToolSettings({ gateway, gatewayEpoch, hasActiveGateway });
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const { colors } = theme;
  const loading = toolSettings.loadingToolSettings;
  const disabled = !hasActiveGateway || loading;

  const execAskOptions = useMemo<{ key: ExecAsk; label: string }[]>(() => [
    { key: 'always', label: t('Every Command') },
    { key: 'on-miss', label: t('Unknown Only') },
    { key: 'off', label: t('Never') },
  ], [t]);

  const handleOpenToolSettings = () => {
    onClose();
    // Navigate to ToolList on root stack (registered globally)
    // Drawer → Tab → RootStack
    const root = navigation.getParent()?.getParent();
    if (root) {
      root.dispatch(CommonActions.navigate({ name: 'ToolList' }));
    }
  };

  return (
    <View style={styles.content}>
      {/* Web Tools */}
      <View style={[styles.row, styles.toggleRow]}>
        <View style={styles.labels}>
          <Text style={styles.rowLabel}>{t('Web Search')}</Text>
          <Text style={styles.rowMeta}>{t('Search the internet for information')}</Text>
        </View>
        <ThemedSwitch
          value={toolSettings.webSearchEnabled}
          onValueChange={toolSettings.setWebSearchEnabled}
          trackColor={{ false: colors.borderStrong, true: colors.primarySoft }}
          thumbColor={toolSettings.webSearchEnabled ? colors.primary : colors.surfaceMuted}
          disabled={disabled}
        />
      </View>
      <View style={styles.divider} />
      <View style={[styles.row, styles.toggleRow]}>
        <View style={styles.labels}>
          <Text style={styles.rowLabel}>{t('Web Fetch')}</Text>
          <Text style={styles.rowMeta}>{t('Read content from a specific URL')}</Text>
        </View>
        <ThemedSwitch
          value={toolSettings.webFetchEnabled}
          onValueChange={toolSettings.setWebFetchEnabled}
          trackColor={{ false: colors.borderStrong, true: colors.primarySoft }}
          thumbColor={toolSettings.webFetchEnabled ? colors.primary : colors.surfaceMuted}
          disabled={disabled}
        />
      </View>

      {/* Exec Approval */}
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t('Exec Approval')}</Text>
        <Text style={styles.rowMeta}>{t('Ask for your approval before the agent runs a command')}</Text>
        <View style={styles.chipRow}>
          {execAskOptions.map((option) => {
            const active = option.key === toolSettings.execAsk;
            return (
              <Pressable
                key={option.key}
                onPress={() => toolSettings.setExecAsk(option.key)}
                style={[styles.chip, active && styles.chipActive]}
                disabled={disabled}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* More Tool Settings */}
      <View style={styles.divider} />
      <TouchableOpacity
        style={styles.moreButton}
        onPress={handleOpenToolSettings}
        activeOpacity={0.7}
      >
        <Text style={styles.moreButtonText}>{t('More Tool Settings')}</Text>
        <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
      </TouchableOpacity>

      {toolSettings.toolSettingsError ? (
        <Text style={styles.errorText}>{toolSettings.toolSettingsError}</Text>
      ) : null}

      {/* Loading overlay */}
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['theme']['colors']) {
  return StyleSheet.create({
    content: {
      paddingBottom: Space.md,
      minHeight: 280,
    },
    row: {
      paddingHorizontal: Space.lg,
      paddingVertical: 13,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    labels: {
      flex: 1,
      marginRight: Space.md,
    },
    rowLabel: {
      color: colors.text,
      fontSize: FontSize.base,
      fontWeight: FontWeight.medium,
    },
    rowMeta: {
      color: colors.textSubtle,
      fontSize: FontSize.sm,
      marginTop: 3,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderStrong,
      marginLeft: Space.lg,
    },
    chipRow: {
      flexDirection: 'row',
      gap: Space.sm,
      marginTop: Space.sm,
      flexWrap: 'wrap',
    },
    chip: {
      paddingHorizontal: Space.md,
      paddingVertical: 7,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.medium,
      color: colors.text,
    },
    chipTextActive: {
      color: colors.primaryText,
      fontWeight: FontWeight.semibold,
    },
    moreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Space.lg,
      paddingVertical: 13,
      marginTop: Space.sm,
    },
    moreButtonText: {
      color: colors.textMuted,
      fontSize: FontSize.base,
      fontWeight: FontWeight.medium,
    },
    errorText: {
      color: colors.error,
      fontSize: FontSize.sm,
      marginTop: Space.md,
      paddingHorizontal: Space.lg,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background + 'AA',
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: Space.xxxl,
      borderRadius: Radius.md,
    },
  });
}
