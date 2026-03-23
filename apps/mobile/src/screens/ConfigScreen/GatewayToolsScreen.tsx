import React, { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import { useAppContext } from '../../contexts/AppContext';
import { ScreenHeader, ThemedSwitch } from '../../components/ui';
import { useAppTheme, AppTheme } from '../../theme';
import {
  FontSize,
  FontWeight,
  Radius,
  Shadow,
  Space,
} from '../../theme/tokens';
import type { ExecAsk, ExecSecurity } from '../../utils/gateway-tool-settings';
import type { ConsoleStackParamList } from '../ConsoleScreen/ConsoleTab';
import { useGatewayToolSettings } from './hooks/useGatewayToolSettings';

type Colors = AppTheme['colors'];

/**
 * Standalone scrollable content for tool settings.
 * Used both by GatewayToolsRouteScreen (standalone page)
 * and ToolsScreen (embedded in a tab).
 */
export function ToolSettingsContent({
  colors,
  toolSettings,
  hasActiveGateway,
  tabBarHeight,
}: {
  colors: Colors;
  toolSettings: ReturnType<typeof useGatewayToolSettings>;
  hasActiveGateway: boolean;
  tabBarHeight: number;
}): React.JSX.Element {
  const { t } = useTranslation('console');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const disabled = !hasActiveGateway || toolSettings.loadingToolSettings;

  const execSecurityOptions = useMemo<{ key: ExecSecurity; label: string }[]>(() => [
    { key: 'deny', label: t('Deny') },
    { key: 'allowlist', label: t('Allowlist') },
    { key: 'full', label: t('Full') },
  ], [t]);

  const execAskOptions = useMemo<{ key: ExecAsk; label: string }[]>(() => [
    { key: 'always', label: t('Every Command') },
    { key: 'on-miss', label: t('Unknown Only') },
    { key: 'off', label: t('Never') },
  ], [t]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingBottom: Space.xxxl + tabBarHeight },
      ]}
    >
      {/* Web */}
      <View style={styles.card}>
        <View style={[styles.row, styles.toggleRow]}>
          <View style={styles.toggleLabels}>
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
          <View style={styles.toggleLabels}>
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
      </View>

      {/* Exec Approval */}
      <View style={[styles.card, styles.cardGap]}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('Exec Approval')}</Text>
          <Text style={styles.rowMeta}>{t('Ask for your approval before the agent runs a command')}</Text>
          <ChipRow
            options={execAskOptions}
            selected={toolSettings.execAsk}
            onSelect={toolSettings.setExecAsk}
            colors={colors}
            disabled={disabled}
          />
        </View>
      </View>

      {/* Code Execution */}
      <View style={[styles.card, styles.cardGap]}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('Code Execution')}</Text>
          <Text style={styles.rowMeta}>{t('Security level for code execution')}</Text>
          <ChipRow
            options={execSecurityOptions}
            selected={toolSettings.execSecurity}
            onSelect={toolSettings.setExecSecurity}
            colors={colors}
            disabled={disabled}
          />
        </View>
      </View>

      {/* Media Understanding */}
      <View style={[styles.card, styles.cardGap]}>
        <View style={[styles.row, styles.toggleRow]}>
          <View style={styles.toggleLabels}>
            <Text style={styles.rowLabel}>{t('Images')}</Text>
            <Text style={styles.rowMeta}>{t('Understand image content')}</Text>
          </View>
          <ThemedSwitch
            value={toolSettings.mediaImageEnabled}
            onValueChange={toolSettings.setMediaImageEnabled}
            trackColor={{ false: colors.borderStrong, true: colors.primarySoft }}
            thumbColor={toolSettings.mediaImageEnabled ? colors.primary : colors.surfaceMuted}
            disabled={disabled}
          />
        </View>
        <View style={styles.divider} />
        <View style={[styles.row, styles.toggleRow]}>
          <View style={styles.toggleLabels}>
            <Text style={styles.rowLabel}>{t('Audio')}</Text>
            <Text style={styles.rowMeta}>{t('Understand audio content')}</Text>
          </View>
          <ThemedSwitch
            value={toolSettings.mediaAudioEnabled}
            onValueChange={toolSettings.setMediaAudioEnabled}
            trackColor={{ false: colors.borderStrong, true: colors.primarySoft }}
            thumbColor={toolSettings.mediaAudioEnabled ? colors.primary : colors.surfaceMuted}
            disabled={disabled}
          />
        </View>
        <View style={styles.divider} />
        <View style={[styles.row, styles.toggleRow]}>
          <View style={styles.toggleLabels}>
            <Text style={styles.rowLabel}>{t('Video')}</Text>
            <Text style={styles.rowMeta}>{t('Understand video content')}</Text>
          </View>
          <ThemedSwitch
            value={toolSettings.mediaVideoEnabled}
            onValueChange={toolSettings.setMediaVideoEnabled}
            trackColor={{ false: colors.borderStrong, true: colors.primarySoft }}
            thumbColor={toolSettings.mediaVideoEnabled ? colors.primary : colors.surfaceMuted}
            disabled={disabled}
          />
        </View>
      </View>

      {toolSettings.toolSettingsError ? (
        <Text style={styles.errorText}>{toolSettings.toolSettingsError}</Text>
      ) : null}
    </ScrollView>
  );
}

function ChipRow<T extends string>({
  options,
  selected,
  onSelect,
  colors,
  disabled,
}: {
  options: { key: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  colors: Colors;
  disabled: boolean;
}): React.JSX.Element {
  const styles = useMemo(() => createChipStyles(colors), [colors]);
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const active = option.key === selected;
        return (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
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
  );
}

export function GatewayToolsRouteScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const { t } = useTranslation('console');
  const { theme } = useAppTheme();
  const { gateway, gatewayEpoch, config: initialConfig } = useAppContext();
  const navigation =
    useNavigation<NativeStackNavigationProp<ConsoleStackParamList>>();

  const hasActiveGateway = Boolean(initialConfig?.url);
  const toolSettings = useGatewayToolSettings({
    gateway,
    gatewayEpoch,
    hasActiveGateway,
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader title={t('Tools')} topInset={insets.top} onBack={() => navigation.goBack()} />
      <ToolSettingsContent
        colors={theme.colors}
        toolSettings={toolSettings}
        hasActiveGateway={hasActiveGateway}
        tabBarHeight={tabBarHeight}
      />
    </View>
  );
}

function createChipStyles(colors: Colors) {
  return StyleSheet.create({
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
  });
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: Space.lg,
      paddingTop: Space.lg,
      backgroundColor: colors.background,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...Shadow.sm,
    },
    cardGap: {
      marginTop: Space.md,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderStrong,
      marginLeft: Space.lg,
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
    toggleLabels: {
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
    errorText: {
      color: colors.error,
      fontSize: FontSize.sm,
      marginTop: Space.md,
    },
  });
}
