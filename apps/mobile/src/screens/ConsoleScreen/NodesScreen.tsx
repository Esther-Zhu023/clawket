import React from 'react';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { NodesView } from '../../components/console/NodesView';
import { publicAppLinks } from '../../config/public';
import { useAppContext } from '../../contexts/AppContext';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import type { ConsoleStackParamList } from './ConsoleTab';

type NodesNavigation = NativeStackNavigationProp<ConsoleStackParamList, 'Nodes'>;

export function NodesScreen(): React.JSX.Element {
  const { gateway } = useAppContext();
  const { t } = useTranslation('console');
  const navigation = useNavigation<NodesNavigation>();

  useNativeStackModalHeader({
    navigation,
    title: t('Nodes'),
    onClose: () => navigation.goBack(),
  });

  return (
    <NodesView
      gateway={gateway}
      topInset={0}
      onBack={() => navigation.goBack()}
      onOpenNode={(node) => {
        navigation.navigate('NodeDetail', {
          nodeId: node.nodeId,
          displayName: node.displayName,
        });
      }}
      onOpenNodeDocs={publicAppLinks.docsUrl ? () => {
        navigation.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [
              { name: 'ConsoleMenu' },
              { name: 'Docs', params: { url: `${publicAppLinks.docsUrl}/nodes/index#nodes` } },
            ],
          }),
        );
      } : undefined}
      hideHeader
    />
  );
}
