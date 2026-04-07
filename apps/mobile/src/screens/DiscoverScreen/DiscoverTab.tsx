import React from 'react';
import { DiscoverTabNavigator } from './sharedNavigator';

export type { DiscoverStackParamList } from './sharedNavigator';

export function DiscoverTab(): React.JSX.Element {
  return <DiscoverTabNavigator />;
}
