import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ModalSheet } from '../ui';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';
import type { ModelCostValue } from '../../utils/model-cost-config';

export type ModelCostDraft = {
  input: string;
  output: string;
  cacheRead: string;
  cacheWrite: string;
};

type Props = {
  visible: boolean;
  title: string;
  provider: string;
  modelId: string;
  editable: boolean;
  draft: ModelCostDraft;
  saving: boolean;
  saveDisabled: boolean;
  initialCost: ModelCostValue;
  deleteVisible: boolean;
  deleteDisabled: boolean;
  deleting: boolean;
  deleteBlockedReasons: string[];
  onChangeField: (field: keyof ModelCostDraft, value: string) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
};

type CostField = {
  key: keyof ModelCostDraft;
  label: string;
};

export function ModelCostEditorModal({
  visible,
  title,
  provider,
  modelId,
  editable,
  draft,
  saving,
  saveDisabled,
  initialCost,
  deleteVisible,
  deleteDisabled,
  deleting,
  deleteBlockedReasons,
  onChangeField,
  onClose,
  onSave,
  onDelete,
}: Props): React.JSX.Element {
  const { t } = useTranslation('console');
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  const fields = useMemo<CostField[]>(() => [
    { key: 'input', label: t('Input Cost') },
    { key: 'output', label: t('Output Cost') },
    { key: 'cacheRead', label: t('Cache Read Cost') },
    { key: 'cacheWrite', label: t('Cache Write Cost') },
  ], [t]);

  return (
    <ModalSheet visible={visible} onClose={onClose} title={title} maxHeight="82%">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.infoText}>
          <Text style={styles.infoLabel}>{t('Provider')}:  </Text>
          <Text style={styles.infoValue}>{provider}</Text>
        </Text>
        <Text style={styles.infoText} selectable>
          <Text style={styles.infoLabel}>{t('Model ID')}:  </Text>
          <Text style={styles.infoValue}>{modelId}</Text>
        </Text>

        <View style={styles.divider} />

        <Text style={styles.costHint}>{t('USD per 1M tokens')}</Text>

        {fields.map((field) => (
          <View key={field.key} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <TextInput
              value={draft[field.key]}
              onChangeText={(value) => onChangeField(field.key, value)}
              style={[styles.input, !editable && styles.inputDisabled]}
              placeholder={String(initialCost[field.key])}
              placeholderTextColor={theme.colors.textSubtle}
              keyboardType="decimal-pad"
              autoCapitalize="none"
              autoCorrect={false}
              editable={editable && !saving}
            />
          </View>
        ))}

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
            {saving ? t('common:Saving...') : t('common:Save')}
          </Text>
        </Pressable>

        {deleteVisible ? (
          <View style={styles.deleteSection}>
            {deleteBlockedReasons.length > 0 ? (
              <View style={styles.blockCard}>
                <Text style={styles.blockText}>{t('This model cannot be deleted yet.')}</Text>
                {deleteBlockedReasons.map((reason) => (
                  <Text key={reason} style={styles.blockReasonText}>- {reason}</Text>
                ))}
              </View>
            ) : null}

            <Pressable
              onPress={onDelete}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.deleteButtonPressed,
                deleteDisabled && styles.deleteButtonDisabled,
              ]}
              disabled={deleteDisabled}
            >
              <Text style={styles.deleteButtonText}>
                {deleting ? t('Deleting model...') : t('Delete Model')}
              </Text>
            </Pressable>
          </View>
        ) : null}
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
    infoText: {
      fontSize: FontSize.md,
      lineHeight: FontSize.md * 1.5,
    },
    infoLabel: {
      color: colors.textMuted,
      fontWeight: FontWeight.medium,
    },
    infoValue: {
      color: colors.text,
      fontWeight: FontWeight.medium,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    costHint: {
      color: colors.textSubtle,
      fontSize: FontSize.sm,
    },
    blockCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.error,
      padding: Space.md,
    },
    blockText: {
      color: colors.error,
      fontSize: FontSize.sm,
      lineHeight: FontSize.sm * 1.5,
    },
    blockReasonText: {
      color: colors.error,
      fontSize: FontSize.sm,
      lineHeight: FontSize.sm * 1.5,
      marginTop: Space.xs,
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Space.md,
    },
    fieldLabel: {
      color: colors.textMuted,
      fontSize: FontSize.md,
      fontWeight: FontWeight.medium,
      flexShrink: 0,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      fontSize: FontSize.md,
      fontWeight: FontWeight.medium,
      width: 100,
      textAlign: 'right',
      paddingHorizontal: Space.sm,
      paddingVertical: Space.xs + 2,
    },
    inputDisabled: {
      opacity: 0.6,
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
    deleteSection: {
      gap: Space.sm,
    },
    deleteButton: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.error,
      borderRadius: Radius.md,
      paddingVertical: 11,
    },
    deleteButtonPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    deleteButtonDisabled: {
      opacity: 0.55,
    },
    deleteButtonText: {
      color: colors.error,
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
    },
  });
}
