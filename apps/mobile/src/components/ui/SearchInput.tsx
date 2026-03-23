import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import { Search } from 'lucide-react-native';
import { useAppTheme } from '../../theme';
import { FontSize, Radius, Space } from '../../theme/tokens';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
};

export function SearchInput({ value, onChangeText, placeholder = 'Search...', style }: Props): React.JSX.Element {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  return (
    <View style={[styles.wrap, style]}>
      <Search size={16} color={theme.colors.textSubtle} strokeWidth={2} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSubtle}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['theme']['colors']) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.lg,
      paddingHorizontal: Space.lg,
      gap: Space.sm,
    },
    input: {
      flex: 1,
      fontSize: FontSize.base,
      color: colors.text,
      paddingVertical: Space.sm + 2,
    },
  });
}
