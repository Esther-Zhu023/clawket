import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ChannelsView } from '../../components/console/ChannelsView';
import { useAppContext } from '../../contexts/AppContext';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import type { ConsoleStackParamList } from './ConsoleTab';

type ChannelsNavigation = NativeStackNavigationProp<ConsoleStackParamList, 'Channels'>;

export function ChannelsScreen(): React.JSX.Element {
  const { gateway } = useAppContext();
  const { t } = useTranslation('console');
  const navigation = useNavigation<ChannelsNavigation>();

  useNativeStackModalHeader({
    navigation,
    title: t('Channels'),
    onClose: () => navigation.goBack(),
  });

  return (
    <ChannelsView
      gateway={gateway}
      topInset={0}
      onBack={() => navigation.goBack()}
      hideHeader
    />
  );
}
