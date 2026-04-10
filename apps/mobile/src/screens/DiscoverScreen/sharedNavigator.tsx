import React from 'react';
import { Platform } from 'react-native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import type { ClawHubBrowseSort, DiscoverSkillItem } from '../../features/discover/types';
import { DiscoverHomeScreen } from './DiscoverHomeScreen';
import { DiscoverDetailScreen } from './DiscoverDetailScreen';
import { ClawHubBrowseScreen } from './ClawHubBrowseScreen';
import { SkillsShBrowseScreen } from './SkillsShBrowseScreen';

export type DiscoverStackParamList = {
  DiscoverHome: undefined;
  DiscoverDetail: {
    item: DiscoverSkillItem;
  };
  DiscoverClawHubBrowse: {
    initialSort?: ClawHubBrowseSort;
  } | undefined;
  DiscoverSkillsShBrowse: undefined;
};

const DiscoverStack = createNativeStackNavigator<DiscoverStackParamList>();

const modalScreenOptions: NativeStackNavigationOptions = Platform.OS === 'ios'
  ? {
    animation: 'slide_from_bottom',
    presentation: 'modal',
    gestureEnabled: true,
    headerShown: true,
  }
  : {
    animation: 'slide_from_right',
    headerShown: true,
  };

export function DiscoverTabNavigator(): React.JSX.Element {
  return (
    <DiscoverStack.Navigator screenOptions={{ headerShown: false }}>
      <DiscoverStack.Screen name="DiscoverHome" component={DiscoverHomeScreen} />
      <DiscoverStack.Screen
        name="DiscoverDetail"
        component={DiscoverDetailScreen}
        options={modalScreenOptions}
      />
      <DiscoverStack.Screen
        name="DiscoverClawHubBrowse"
        component={ClawHubBrowseScreen}
        options={modalScreenOptions}
      />
      <DiscoverStack.Screen
        name="DiscoverSkillsShBrowse"
        component={SkillsShBrowseScreen}
        options={modalScreenOptions}
      />
    </DiscoverStack.Navigator>
  );
}
