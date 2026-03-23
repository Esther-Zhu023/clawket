import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTranslation } from 'react-i18next';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LoadingState } from '../../components/ui';
import { useGatewayPatch } from '../../hooks/useGatewayPatch';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import { ModelConfigSection } from '../../components/console/ModelConfigSection';
import { ModelPickerModal, resolveProviderModel } from '../../components/chat/ModelPickerModal';
import type { ModelInfo } from '../../components/chat/ModelPickerModal';
import { useAppContext } from '../../contexts/AppContext';
import { useAppTheme } from '../../theme';
import { analyticsEvents } from '../../services/analytics/events';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';
import type { AgentInfo } from '../../types/agent';
import { addFallbackModel, moveFallbackModel, removeFallbackModelAt, sanitizeFallbackModels } from '../../utils/fallback-models';
import type { ConsoleStackParamList } from './ConsoleTab';
import { pendingAgentDeletes } from './AgentListScreen';

type AgentDetailNavigation = NativeStackNavigationProp<ConsoleStackParamList, 'AgentDetail'>;
type AgentDetailRoute = RouteProp<ConsoleStackParamList, 'AgentDetail'>;

type PickerTarget = 'primary' | 'fallback';

export function AgentDetailScreen(): React.JSX.Element {
  const { gateway, gatewayEpoch, currentAgentId, switchAgent, setAgents } = useAppContext();
  const { theme } = useAppTheme();
  const { t } = useTranslation('console');
  const { t: tCommon } = useTranslation('common');
  const { t: tChat } = useTranslation('chat');
  const navigation = useNavigation<AgentDetailNavigation>();
  const route = useRoute<AgentDetailRoute>();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  const { agentId } = route.params;

  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [mainKey, setMainKey] = useState('main');
  const [saving, setSaving] = useState(false);
  const { patchWithRestart } = useGatewayPatch(gateway);

  // Form fields
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [model, setModel] = useState('');
  const [fallbacks, setFallbacks] = useState<string[]>([]);

  // Initial values for dirty tracking
  const initialRef = useRef({ name: '', model: '', fallbacks: '' });

  // Config hash for patch
  const configHashRef = useRef<string | null>(null);
  const agentIndexRef = useRef<number>(-1);

  // Model picker
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>('primary');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  const isMain = agentId === mainKey;
  const isCurrent = agentId === currentAgentId;
  const trimmedName = name.trim();
  const isDirty = trimmedName !== initialRef.current.name
    || model !== initialRef.current.model
    || JSON.stringify(fallbacks) !== initialRef.current.fallbacks;

  const loadAgent = useCallback(async () => {
    setLoading(true);
    try {
      const [agentsResult, identityResult, configResult] = await Promise.allSettled([
        gateway.listAgents(),
        gateway.fetchIdentity(agentId),
        gateway.getConfig(),
      ]);

      let loadedName = '';
      let loadedModel = '';
      let loadedFallbacks: string[] = [];

      if (agentsResult.status === 'fulfilled') {
        const found = agentsResult.value.agents.find((a) => a.id === agentId);
        setAgent(found ?? null);
        setMainKey(agentsResult.value.mainKey);
        loadedName = found?.identity?.name || found?.name || '';
      }

      if (identityResult.status === 'fulfilled') {
        const identity = identityResult.value;
        if (identity.name) loadedName = identity.name;
        setEmoji(identity.emoji ?? '');
      }

      setName(loadedName);

      // Extract current model + fallbacks from gateway config
      if (configResult.status === 'fulfilled' && configResult.value.config) {
        configHashRef.current = configResult.value.hash;
        const cfg = configResult.value.config;
        const agentsList = (cfg.agents as Record<string, unknown>)?.list;
        if (Array.isArray(agentsList)) {
          const idx = agentsList.findIndex(
            (a: Record<string, unknown>) => a && a.id === agentId,
          );
          agentIndexRef.current = idx;
          if (idx >= 0) {
            const agentCfg = agentsList[idx] as Record<string, unknown>;
            if (agentCfg?.model) {
              if (typeof agentCfg.model === 'string') {
                loadedModel = agentCfg.model;
              } else if (typeof agentCfg.model === 'object' && agentCfg.model !== null) {
                const modelObj = agentCfg.model as Record<string, unknown>;
                const primaryVal = modelObj.primary as string | undefined;
                if (primaryVal) loadedModel = primaryVal;
                const fb = modelObj.fallbacks;
                if (Array.isArray(fb)) {
                  loadedFallbacks = sanitizeFallbackModels(
                    fb.filter((s): s is string => typeof s === 'string' && s.length > 0),
                    { primaryModel: loadedModel || primaryVal },
                  );
                }
              }
            }
          }
        }
      }

      setModel(loadedModel);
      setFallbacks(loadedFallbacks);

      // Snapshot initial values for dirty tracking
      initialRef.current = {
        name: loadedName,
        model: loadedModel,
        fallbacks: JSON.stringify(loadedFallbacks),
      };
    } catch {
      // handled by empty state
    } finally {
      setLoading(false);
    }
  }, [agentId, gateway, gatewayEpoch]);

  useEffect(() => {
    loadAgent();
  }, [loadAgent]);

  const commitSave = useCallback(async () => {
    const nextName = name.trim();
    if (!nextName) {
      Alert.alert(tCommon('Error'), tChat('Please enter a name for the agent.'));
      return;
    }
    if (nextName.length > 50) {
      Alert.alert(tCommon('Error'), t('Name must be 50 characters or fewer.'));
      return;
    }

    analyticsEvents.agentSaveTapped({
      fallback_count: fallbacks.length,
      has_model: Boolean(model),
      has_name: Boolean(nextName),
    });
    setSaving(true);
    try {
      const sanitizedFallbacks = sanitizeFallbackModels(fallbacks, { primaryModel: model });

      // Persist the visible display name through both the agent entry and identity,
      // since identity.name takes precedence in gateway reads.
      if (!configHashRef.current || agentIndexRef.current < 0) {
        throw new Error('Agent config is unavailable. Reload and try again.');
      }

      const freshConfig = await gateway.getConfig();
      if (!freshConfig.config || !freshConfig.hash) {
        throw new Error('Gateway config is unavailable. Reload and try again.');
      }

      const cfg = freshConfig.config;
      const agentsList = (cfg.agents as Record<string, unknown>)?.list;
      if (!Array.isArray(agentsList)) {
        throw new Error('Agent list is unavailable in gateway config.');
      }

      const idx = agentsList.findIndex(
        (a: Record<string, unknown>) => a && a.id === agentId,
      );
      if (idx < 0) {
        throw new Error(`Agent "${agentId}" was not found in gateway config.`);
      }

      const agentCfg = { ...(agentsList[idx] as Record<string, unknown>) };
      agentCfg.name = nextName;
      const currentIdentity = typeof agentCfg.identity === 'object' && agentCfg.identity !== null
        ? agentCfg.identity as Record<string, unknown>
        : {};
      agentCfg.identity = {
        ...currentIdentity,
        name: nextName,
      };
      const currentPrimary = model || undefined;
      const nextFallbacks = sanitizeFallbackModels(sanitizedFallbacks, { primaryModel: currentPrimary });
      const currentFallbacks = nextFallbacks.length > 0 ? nextFallbacks : undefined;
      if (currentPrimary || currentFallbacks) {
        agentCfg.model = {
          ...(currentPrimary ? { primary: currentPrimary } : {}),
          ...(currentFallbacks ? { fallbacks: currentFallbacks } : {}),
        };
      }
      const newList = [...agentsList];
      newList[idx] = agentCfg;
      const patchObj = { agents: { ...(cfg.agents as Record<string, unknown>), list: newList } };
      await patchWithRestart({
        patch: patchObj,
        configHash: freshConfig.hash,
      });

      // Refresh global agents
      const result = await gateway.listAgents();
      setAgents(result.agents);

      // Reset dirty tracking to current values
      setFallbacks(sanitizedFallbacks);
      initialRef.current = {
        name: nextName,
        model,
        fallbacks: JSON.stringify(sanitizedFallbacks),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update agent';
      Alert.alert(tCommon('Error'), message);
    } finally {
      setSaving(false);
    }
  }, [agentId, name, model, fallbacks, gateway, setAgents, patchWithRestart, t, tChat, tCommon]);

  const handleSave = useCallback(() => {
    if (saving) {
      return;
    }

    Alert.alert(
      tCommon('Confirm Save'),
      tCommon('Saving this config will restart Gateway and may interrupt active tasks like chats, cron jobs, or sub-agents. Continue?'),
      [
        { text: tCommon('Cancel'), style: 'cancel' },
        {
          text: tCommon('Save'),
          style: 'default',
          onPress: () => {
            void commitSave();
          },
        },
      ],
    );
  }, [commitSave, saving, tCommon]);

  const handleSwitch = useCallback(() => {
    switchAgent(agentId);
    Alert.alert(t('Switched'), t('Now using agent "{{name}}".', { name: name || agentId }));
  }, [agentId, name, switchAgent, t]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      t('Delete Agent'),
      t('Are you sure you want to delete "{{name}}"? This cannot be undone.', { name: name || agentId }),
      [
        { text: tCommon('Cancel'), style: 'cancel' },
        {
          text: tCommon('Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await gateway.deleteAgent(agentId);
              // Mark as pending-delete so the list screen filters it out
              // from fetch results until the gateway confirms removal.
              pendingAgentDeletes.add(agentId);
              // If the deleted agent was the active one, fall back to main
              if (agentId === currentAgentId) {
                switchAgent(mainKey);
              }
              navigation.goBack();
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Failed to delete agent';
              Alert.alert(tCommon('Error'), message);
            }
          },
        },
      ],
    );
  }, [agentId, name, gateway, navigation, currentAgentId, switchAgent, mainKey, t, tCommon]);

  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const result = await gateway.listModels();
      setModels(result.map((m) => ({ id: m.id, name: m.name, provider: m.provider })));
    } catch {
      setModels([]);
    } finally {
      setModelsLoading(false);
    }
  }, [gateway]);

  const openModelPicker = useCallback((target: PickerTarget) => {
    setPickerTarget(target);
    setModelPickerVisible(true);
    loadModels();
  }, [loadModels]);

  const selectModel = useCallback((selected: ModelInfo) => {
    const resolved = selected.id ? resolveProviderModel(selected) : '';
    if (pickerTarget === 'primary') {
      setModel(resolved);
      setFallbacks((prev) => sanitizeFallbackModels(prev, { primaryModel: resolved }));
    } else {
      setFallbacks((prev) => addFallbackModel(prev, resolved, { primaryModel: model }));
    }
    setModelPickerVisible(false);
  }, [model, pickerTarget]);

  const removeFallback = useCallback((index: number) => {
    setFallbacks((prev) => removeFallbackModelAt(prev, index));
  }, []);

  const reorderFallback = useCallback((fromIndex: number, toIndex: number) => {
    setFallbacks((prev) => moveFallbackModel(prev, fromIndex, toIndex));
  }, []);

  // Models to show in picker: filter out existing fallbacks when adding a new one
  const pickerModels = useMemo(() => {
    if (pickerTarget === 'fallback') {
      return models.filter((m) => !fallbacks.includes(m.id));
    }
    return models;
  }, [models, pickerTarget, fallbacks]);

  useNativeStackModalHeader({
    navigation,
    title: agent?.identity?.name || agent?.name || tCommon('Agent'),
    onClose: () => navigation.goBack(),
  });

  if (loading) {
    return (
      <View style={styles.root}>
        <LoadingState message={t('Loading agent...')} />
      </View>
    );
  }

  if (!agent) {
    return (
      <View style={styles.root}>
        <View style={styles.centerState}>
          <Text style={styles.stateText}>{t('Agent not found.')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Name */}
        <Text style={styles.fieldLabel}>{t('Name')}</Text>
        <View style={styles.fieldRow}>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder={t('Agent name')}
            placeholderTextColor={theme.colors.textSubtle}
            editable={!saving}
            maxLength={50}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        {/* Emoji (read-only — only set at creation) */}
        <Text style={styles.fieldLabel}>{t('Emoji')}</Text>
        <View style={[styles.fieldRow, styles.fieldDisabled]}>
          <Text style={[styles.fieldRowText, { color: theme.colors.textSubtle }]}>
            {emoji || t('Not set')}
          </Text>
        </View>

        {/* Model Configuration */}
        <ModelConfigSection
          model={model}
          fallbacks={fallbacks}
          models={models}
          onPickPrimary={() => openModelPicker('primary')}
          onPickFallback={() => openModelPicker('fallback')}
          onRemoveFallback={removeFallback}
          onMoveFallback={reorderFallback}
          reorderEnabled
          disabled={saving}
        />

        {/* Save button */}
        <TouchableOpacity
          style={[styles.primaryButton, (!isDirty || saving) && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!isDirty || saving}
          activeOpacity={0.88}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? tCommon('Saving...') : t('Save Changes')}
          </Text>
        </TouchableOpacity>

        {/* Switch to agent */}
        {!isCurrent && (
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={handleSwitch}
            activeOpacity={0.7}
          >
            <Text style={styles.outlineButtonText}>{t('Switch to This Agent')}</Text>
          </TouchableOpacity>
        )}

        {/* Delete agent */}
        {!isMain && (
          <TouchableOpacity
            style={styles.destructiveButton}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Text style={styles.destructiveButtonText}>{t('Delete Agent')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <ModelPickerModal
        visible={modelPickerVisible}
        onClose={() => setModelPickerVisible(false)}
        title={pickerTarget === 'primary' ? t('Primary Model') : t('Add Fallback')}
        models={pickerModels}
        loading={modelsLoading}
        selectedModelId={pickerTarget === 'primary' ? model : undefined}
        showDefault={pickerTarget === 'primary'}
        onSelectModel={selectModel}
      />

    </View>
  );
}

function createStyles(colors: ReturnType<typeof import('../../theme').useAppTheme>['theme']['colors']) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: Space.lg,
      paddingBottom: Space.xxxl,
    },
    centerState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stateText: {
      color: colors.textMuted,
      fontSize: FontSize.md,
    },
    fieldLabel: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.medium,
      color: colors.textMuted,
      marginBottom: Space.xs,
      marginTop: Space.lg,
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.inputBackground,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: Radius.md,
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm + 4,
    },
    fieldDisabled: {
      opacity: 0.5,
    },
    fieldRowText: {
      flex: 1,
      fontSize: FontSize.base,
      color: colors.text,
    },
    textInput: {
      flex: 1,
      fontSize: FontSize.base,
      color: colors.text,
      paddingVertical: 0,
    },
    // Buttons
    primaryButton: {
      marginTop: Space.xl,
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
      paddingVertical: 11,
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      color: colors.primaryText,
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
    },
    outlineButton: {
      marginTop: Space.md,
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingVertical: 11,
      alignItems: 'center',
    },
    outlineButtonText: {
      color: colors.primary,
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
    },
    destructiveButton: {
      marginTop: Space.md,
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.error,
      paddingVertical: 11,
      alignItems: 'center',
    },
    destructiveButtonText: {
      color: colors.error,
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
    },
  });
}
