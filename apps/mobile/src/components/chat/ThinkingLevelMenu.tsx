import React from 'react';
import * as Haptics from 'expo-haptics';
import { StyleProp, View, ViewStyle } from 'react-native';
import { MenuAction, MenuView } from '@react-native-menu/menu';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../theme';
import { THINKING_LEVELS } from '../../utils/gateway-settings';

const MENU_THINKING_LEVELS = [...THINKING_LEVELS].reverse();

type Props = {
  current: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
  title?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export function ThinkingLevelMenu({
  current,
  onSelect,
  disabled = false,
  title,
  style,
  children,
}: Props): React.JSX.Element {
  const { t } = useTranslation('chat');
  const { theme } = useAppTheme();
  const resolvedTitle = title ?? t('Thinking Level');
  const normalizedCurrent = current || 'off';
  const actions = React.useMemo<MenuAction[]>(() => MENU_THINKING_LEVELS.map((level) => ({
    id: level,
    title: t(`thinking_${level}`),
    state: normalizedCurrent === level ? 'on' : 'off',
  })), [normalizedCurrent, t]);

  if (disabled) {
    return <View style={style}>{children}</View>;
  }

  return (
    <MenuView
      actions={actions}
      shouldOpenOnLongPress={false}
      title={resolvedTitle}
      themeVariant={theme.scheme}
      style={style}
      onPressAction={({ nativeEvent }) => {
        const selectedLevel = THINKING_LEVELS.find((level) => level === nativeEvent.event);
        if (!selectedLevel) return;
        Haptics.selectionAsync();
        onSelect(selectedLevel);
      }}
    >
      {children}
    </MenuView>
  );
}
