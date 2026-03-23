import React from 'react';
import { ConsoleTabNavigator } from './sharedNavigator';

export type { ConsoleStackParamList } from './sharedNavigator';

export function ConsoleTab(): React.JSX.Element {
  return <ConsoleTabNavigator />;
}
