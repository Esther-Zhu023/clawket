import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ModalSheet } from '../ui';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';

export type AddModelDraft = {
  modelId: string;
  modelName: string;
};

type Props = {
  visible: boolean;
  provider: string;
  draft: AddModelDraft;
  saving: boolean;
  saveDisabled: boolean;
  onChangeField: (field: keyof AddModelDraft, value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function AddModelModal({
  visible,
  provider,
  draft,
  saving,
  saveDisabled,
  onChangeField,
  onClose,
  onSave,
}: Props): React.JSX.Element {
  const { t } = useTranslation('console');
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  return (
    <ModalSheet visible={visible} onClose={onClose} title={t('Add Model')} maxHeight="78%">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>{t('Provider')}</Text>
          <Text style={styles.metaValue}>{provider}</Text>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>{t('Model ID')}</Text>
          <TextInput
            value={draft.modelId}
            onChangeText={(value) => onChangeField('modelId', value)}
            style={styles.input}
            placeholder={t('Enter a unique model ID')}
            placeholderTextColor={theme.colors.textSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!saving}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>{t('Model Name')}</Text>
          <TextInput
            value={draft.modelName}
            onChangeText={(value) => onChangeField('modelName', value)}
            style={styles.input}
            placeholder={t('Enter a display name')}
            placeholderTextColor={theme.colors.textSubtle}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!saving}
          />
        </View>

        <Pressable
          onPress={onSave}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.saveButtonPressed,
            saveDisabled && styles.saveButtonDisabled,
          ]}
          disabled={saveDisabled}
        >
          <Text style={styles.saveButtonText}>
            {saving ? t('common:Saving...') : t('common:Add')}
          </Text>
        </Pressable>
      </ScrollView>
    </ModalSheet>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['theme']['colors']) {
  return StyleSheet.create({
    content: {
      padding: Space.md,
      paddingBottom: Space.xxxl,
      gap: Space.md,
    },
    metaCard: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Space.md,
      gap: Space.xs,
    },
    metaLabel: {
      color: colors.textMuted,
      fontSize: FontSize.sm,
      fontWeight: FontWeight.medium,
    },
    metaValue: {
      color: colors.text,
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      fontFamily: 'monospace',
    },
    fieldWrap: {
      gap: Space.xs,
    },
    fieldLabel: {
      color: colors.textMuted,
      fontSize: FontSize.md,
      fontWeight: FontWeight.medium,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      fontSize: FontSize.base,
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm + 2,
    },
    saveButton: {
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
      paddingVertical: 11,
      marginTop: Space.sm,
    },
    saveButtonPressed: {
      opacity: 0.88,
    },
    saveButtonDisabled: {
      opacity: 0.55,
    },
    saveButtonText: {
      color: colors.primaryText,
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
    },
  });
}
