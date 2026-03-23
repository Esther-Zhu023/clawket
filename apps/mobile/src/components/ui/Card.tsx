import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../../theme';
import { Radius, Space } from '../../theme/tokens';

type Props = {
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle | (ViewStyle | false | undefined)[];
  children: React.ReactNode;
};

export function Card({ onPress, disabled, style, children }: Props): React.JSX.Element {
  const { theme } = useAppTheme();
  const { colors } = theme;
  const cardStyle = [styles.card, { backgroundColor: colors.surface }, style];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} disabled={disabled} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    padding: Space.lg - 2,
  },
});
