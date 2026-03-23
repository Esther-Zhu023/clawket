import React, { useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { X } from 'lucide-react-native';
import { NativeStackNavigationProp, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { HeaderActionButton } from '../components/ui';
import { useAppTheme } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  title: string;
  rightContent?: React.ReactNode;
  onClose?: () => void;
};

export function useNativeStackModalHeader({
  navigation,
  title,
  rightContent,
  onClose,
}: Props) {
  const { theme } = useAppTheme();

  useLayoutEffect(() => {
    const options: NativeStackNavigationOptions = {
      headerShown: true,
      headerBackVisible: false,
      headerShadowVisible: false,
      headerTitle: title,
      headerTitleAlign: 'center',
      headerStyle: {
        backgroundColor: theme.colors.surface,
      },
      headerTitleStyle: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '600',
      },
      headerLeft: onClose
        ? () => (
            <View style={styles.slotStart}>
              <HeaderActionButton icon={X} onPress={onClose} size={20} />
            </View>
          )
        : undefined,
      headerRight: rightContent
        ? () => <View style={styles.slotEnd}>{rightContent}</View>
        : undefined,
    };

    navigation.setOptions(options);
  }, [navigation, onClose, rightContent, theme.colors.surface, theme.colors.text, theme.colors.textMuted, title]);
}

const styles = StyleSheet.create({
  slotStart: {
    minWidth: 44,
    alignItems: 'flex-start',
  },
  slotEnd: {
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
});
