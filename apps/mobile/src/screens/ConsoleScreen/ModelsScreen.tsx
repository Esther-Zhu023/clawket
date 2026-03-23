import React, { useMemo } from 'react';
import { RefreshCw } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { HeaderActionButton } from '../../components/ui';
import { ModelsView } from '../../components/console/ModelsView';
import { useAppContext } from '../../contexts/AppContext';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import { analyticsEvents } from '../../services/analytics/events';
import { useGatewayRuntimeSettings } from '../ConfigScreen/hooks/useGatewayRuntimeSettings';
import type { ConsoleStackParamList } from './ConsoleTab';

type ModelsNavigation = NativeStackNavigationProp<ConsoleStackParamList, 'ModelList'>;

export function ModelsScreen(): React.JSX.Element {
  const { gateway, gatewayEpoch, config } = useAppContext();
  const { t } = useTranslation('console');
  const navigation = useNavigation<ModelsNavigation>();
  const hasActiveGateway = Boolean(config?.url);

  const settings = useGatewayRuntimeSettings({
    gateway,
    gatewayEpoch,
    hasActiveGateway,
  });

  const modelConfig = useMemo(() => ({
    defaultModel: settings.defaultModel,
    setDefaultModel: settings.setDefaultModel,
    fallbackModels: settings.fallbackModels,
    setFallbackModels: settings.setFallbackModels,
    thinkingDefault: settings.thinkingDefault,
    setThinkingDefault: settings.setThinkingDefault,
    availableModels: settings.availableModels,
    loadingSettings: settings.loadingGatewaySettings,
    savingSettings: settings.savingGatewaySettings,
    settingsError: settings.gatewaySettingsError,
    hasActiveGateway,
    onLoadSettings: settings.loadGatewaySettings,
    onSaveSettings: async () => {
      analyticsEvents.modelsSaveTapped({
        fallback_count: settings.fallbackModels.length,
        has_primary_model: Boolean(settings.defaultModel),
        has_thinking_default: Boolean(settings.thinkingDefault),
      });
      await settings.saveGatewaySettings();
    },
  }), [settings, hasActiveGateway]);

  const headerRight = useMemo(
    () => (
      <HeaderActionButton
        icon={RefreshCw}
        onPress={() => { void settings.loadGatewaySettings(); }}
        disabled={settings.loadingGatewaySettings || settings.savingGatewaySettings}
      />
    ),
    [
      settings.loadGatewaySettings,
      settings.loadingGatewaySettings,
      settings.savingGatewaySettings,
    ],
  );

  useNativeStackModalHeader({
    navigation,
    title: t('Models'),
    rightContent: headerRight,
    onClose: () => navigation.goBack(),
  });

  return (
    <ModelsView
      gateway={gateway}
      topInset={0}
      onBack={() => navigation.goBack()}
      modelConfig={modelConfig}
      hideHeader
    />
  );
}
