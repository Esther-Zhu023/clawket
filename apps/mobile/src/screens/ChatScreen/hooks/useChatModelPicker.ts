import { useCallback, useState } from 'react';
import { analyticsEvents } from '../../../services/analytics/events';
import { ConnectionState, SessionInfo } from '../../../types';

export type ModelInfo = {
  id: string;
  name: string;
  provider: string;
};

function resolveProviderModel(model: ModelInfo): string {
  const modelRef = model.id.trim() || model.name;
  if (modelRef.includes('/')) return modelRef;
  const provider = model.provider.trim() || 'unknown';
  return `${provider}/${modelRef}`;
}

type Props = {
  connectionState: ConnectionState;
  gateway: {
    listModels: () => Promise<ModelInfo[]>;
  };
  sessionKey: string | null;
  setInput: (value: string) => void;
  setSessions: (updater: (prev: SessionInfo[]) => SessionInfo[]) => void;
  submitMessage: (text: string, images: []) => Promise<boolean> | boolean | void;
};

export function useChatModelPicker({
  connectionState,
  gateway,
  sessionKey,
  setInput,
  setSessions,
  submitMessage,
}: Props) {
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [modelPickerLoading, setModelPickerLoading] = useState(false);
  const [modelPickerError, setModelPickerError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);

  const loadModelsForPicker = useCallback(async () => {
    if (connectionState !== 'ready') {
      setModelPickerError('Gateway is not connected.');
      setAvailableModels([]);
      setModelPickerLoading(false);
      return;
    }

    setModelPickerLoading(true);
    setModelPickerError(null);
    try {
      const models = await gateway.listModels();
      setAvailableModels(models);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setModelPickerError(msg || 'Failed to load models.');
      setAvailableModels([]);
    } finally {
      setModelPickerLoading(false);
    }
  }, [connectionState, gateway]);

  const openModelPicker = useCallback((): boolean => {
    if (connectionState !== 'ready') {
      return false;
    }
    setModelPickerVisible(true);
    void loadModelsForPicker();
    return true;
  }, [connectionState, loadModelsForPicker]);

  const retryModelPickerLoad = useCallback(() => {
    void loadModelsForPicker();
  }, [loadModelsForPicker]);

  const onSelectModel = useCallback((selected: ModelInfo) => {
    const providerModel = resolveProviderModel(selected);
    if (!providerModel.trim()) return;

    analyticsEvents.chatModelSelected({
      provider_model: providerModel,
      model_id: selected.id.trim() || selected.name,
      model_name: selected.name || selected.id,
      provider: selected.provider.trim() || 'unknown',
      source: 'chat_model_picker',
      session_key_present: Boolean(sessionKey),
    });

    // Optimistically update current session's model label so ChatHeader updates immediately
    const slashIdx = providerModel.indexOf('/');
    const model = slashIdx >= 0 ? providerModel.slice(slashIdx + 1) : providerModel;
    const provider = slashIdx >= 0 ? providerModel.slice(0, slashIdx) : undefined;
    setSessions((prev) =>
      prev.map((session) =>
        session.key === sessionKey
          ? { ...session, model, modelProvider: provider }
          : session,
      ),
    );

    if (connectionState !== 'ready' || !sessionKey) {
      setModelPickerVisible(false);
      setInput(`/model ${providerModel}`);
      return;
    }

    setModelPickerVisible(false);
    void Promise.resolve(submitMessage(`/model ${providerModel}`, [])).then((sent) => {
      if (sent === false) {
        setInput(`/model ${providerModel}`);
      }
    });
  }, [connectionState, sessionKey, setInput, setSessions, submitMessage]);

  return {
    availableModels,
    modelPickerError,
    modelPickerLoading,
    modelPickerVisible,
    onSelectModel,
    openModelPicker,
    retryModelPickerLoad,
    setModelPickerVisible,
  };
}
