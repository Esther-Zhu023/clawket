import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';

// On iOS the native tab bar overlays content, so screens need paddingBottom.
// On Android the JS tab bar occupies layout space, so no extra padding is needed.
const needsTabBarPadding = Platform.OS === 'ios';
import { useAppTheme } from '../../theme';
import { ConsoleMenuScreen } from './ConsoleMenuScreen';
import { ChannelsScreen } from './ChannelsScreen';
import { NodesScreen } from './NodesScreen';
import { DevicesScreen } from './DevicesScreen';
import { NodeDetailScreen } from './NodeDetailScreen';
import { CronDetailScreen } from './CronDetailScreen';
import { CronEditorScreen } from './CronEditorScreen';
import { CronListScreen } from './CronListScreen';
import { CronWizardScreen } from './CronWizardScreen';
import { FileEditorScreen } from './FileEditorScreen';
import { FileListScreen } from './FileListScreen';
import { LogScreen } from './LogScreen';
import { ModelsScreen } from './ModelsScreen';
import { SkillDetailScreen } from './SkillDetailScreen';
import { SkillListScreen } from './SkillListScreen';
import { AgentListScreen } from './AgentListScreen';
import { AgentDetailScreen } from './AgentDetailScreen';
import { ClawHubScreen } from './ClawHubScreen';
import { DocsScreen } from './DocsScreen';
import { ToolsScreen } from './ToolsScreen';
import { UsageScreen } from './UsageScreen';
import { HeartbeatSettingsScreen } from './HeartbeatSettingsScreen';
import { ChatHistoryScreen } from './ChatHistoryScreen';
import { ChatHistoryDetailScreen } from './ChatHistoryDetailScreen';
import { FavoriteMessageDetailScreen } from './FavoriteMessageDetailScreen';
import { SessionsBoardScreen } from './SessionsBoardScreen';

export type ConsoleStackParamList = {
  ConsoleMenu: undefined;
  FileList: undefined;
  FileEditor: { fileName: string };
  CronList: undefined;
  CronDetail: { jobId: string };
  CronEditor: { jobId?: string } | undefined;
  CronWizard: { jobId?: string } | undefined;
  SkillList: undefined;
  SkillDetail: { skillKey: string };
  Logs: undefined;
  Usage: undefined;
  ModelList: undefined;
  Channels: undefined;
  Nodes: undefined;
  Devices: undefined;
  NodeDetail: { nodeId: string; displayName?: string };
  ToolList: undefined;
  AgentList: { openCreate?: boolean } | undefined;
  AgentDetail: { agentId: string };
  ClawHub: undefined;
  Docs: { url?: string } | undefined;
  HeartbeatSettings: undefined;
  ChatHistory: undefined;
  SessionsBoard: undefined;
  ChatHistoryDetail: { storageKey: string; initialQuery?: string };
  FavoriteMessageDetail: { favoriteKey: string };
};

type ConsoleScreenOptions = {
  defaultScreenOptions: NativeStackNavigationOptions;
  detailScreenOptions: NativeStackNavigationOptions;
  editorScreenOptions: NativeStackNavigationOptions;
  nativeModalHeaderOptions: NativeStackNavigationOptions;
  nativeEditorHeaderOptions: NativeStackNavigationOptions;
};

function createConsoleScreenOptions(
  defaultContentStyle: {
    backgroundColor: string;
    paddingBottom?: number;
  },
  modalContentStyle: {
    backgroundColor: string;
  },
): ConsoleScreenOptions {
  const detailScreenOptions = buildDetailScreenOptions(modalContentStyle);
  const editorScreenOptions = buildEditorScreenOptions(modalContentStyle);

  return {
    defaultScreenOptions: {
      headerShown: false,
      animation: 'slide_from_right',
      gestureEnabled: true,
      fullScreenGestureEnabled: true,
      contentStyle: defaultContentStyle,
    },
    detailScreenOptions,
    editorScreenOptions,
    nativeModalHeaderOptions: {
      ...detailScreenOptions,
      headerShown: true,
    },
    nativeEditorHeaderOptions: {
      ...editorScreenOptions,
      headerShown: true,
    },
  };
}

function buildDetailScreenOptions(contentStyle: {
  backgroundColor: string;
}): NativeStackNavigationOptions {
  if (Platform.OS !== 'ios') {
    return {
      animation: 'slide_from_right',
      contentStyle,
    };
  }

  return {
    animation: 'slide_from_bottom',
    presentation: 'modal',
    contentStyle,
    gestureEnabled: true,
  };
}

function buildEditorScreenOptions(contentStyle: {
  backgroundColor: string;
}): NativeStackNavigationOptions {
  if (Platform.OS !== 'ios') {
    return {
      animation: 'slide_from_right',
      contentStyle,
    };
  }

  return {
    animation: 'slide_from_bottom',
    presentation: 'modal',
    contentStyle,
    gestureEnabled: true,
  };
}

export function useConsoleTabScreenOptions(): ConsoleScreenOptions {
  const { theme } = useAppTheme();
  const tabBarHeight = useTabBarHeight();

  const defaultContentStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.background,
      paddingBottom: needsTabBarPadding ? tabBarHeight : 0,
    }),
    [tabBarHeight, theme.colors.background],
  );
  const modalContentStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.background,
    }),
    [theme.colors.background],
  );
  return useMemo(
    () => createConsoleScreenOptions(defaultContentStyle, modalContentStyle),
    [defaultContentStyle, modalContentStyle],
  );
}

export function useConsoleRootModalScreenOptions(): ConsoleScreenOptions {
  const { theme } = useAppTheme();

  const contentStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.background,
    }),
    [theme.colors.background],
  );

  return useMemo(
    () => createConsoleScreenOptions(contentStyle, contentStyle),
    [contentStyle],
  );
}

type ConsoleModalScreenListArgs = ConsoleScreenOptions & {
  renderScreen: (
    name: keyof ConsoleStackParamList,
    component: React.ComponentType,
    options?: NativeStackNavigationOptions,
  ) => React.ReactNode;
};

export function renderConsoleModalScreens({
  detailScreenOptions,
  editorScreenOptions,
  nativeModalHeaderOptions,
  nativeEditorHeaderOptions,
  renderScreen,
}: ConsoleModalScreenListArgs): React.ReactNode[] {
  return (
    [
      renderScreen('FileList', FileListScreen, nativeModalHeaderOptions),
      renderScreen('FileEditor', FileEditorScreen, editorScreenOptions),
      renderScreen('CronList', CronListScreen, nativeModalHeaderOptions),
      renderScreen('CronDetail', CronDetailScreen, detailScreenOptions),
      renderScreen('CronEditor', CronEditorScreen, nativeEditorHeaderOptions),
      renderScreen('CronWizard', CronWizardScreen, {
        ...nativeEditorHeaderOptions,
        gestureEnabled: false,
      }),
      renderScreen('SkillList', SkillListScreen, nativeModalHeaderOptions),
      renderScreen('SkillDetail', SkillDetailScreen, nativeModalHeaderOptions),
      renderScreen('Logs', LogScreen, nativeModalHeaderOptions),
      renderScreen('Usage', UsageScreen, nativeModalHeaderOptions),
      renderScreen('ModelList', ModelsScreen, nativeModalHeaderOptions),
      renderScreen('Channels', ChannelsScreen, nativeModalHeaderOptions),
      renderScreen('Nodes', NodesScreen, nativeModalHeaderOptions),
      renderScreen('Devices', DevicesScreen, nativeModalHeaderOptions),
      renderScreen('NodeDetail', NodeDetailScreen, detailScreenOptions),
      renderScreen('ToolList', ToolsScreen, nativeModalHeaderOptions),
      renderScreen('AgentList', AgentListScreen, nativeModalHeaderOptions),
      renderScreen('AgentDetail', AgentDetailScreen, nativeModalHeaderOptions),
      renderScreen('ClawHub', ClawHubScreen),
      renderScreen('Docs', DocsScreen),
      renderScreen('HeartbeatSettings', HeartbeatSettingsScreen, nativeEditorHeaderOptions),
      renderScreen('ChatHistory', ChatHistoryScreen, nativeModalHeaderOptions),
      renderScreen('SessionsBoard', SessionsBoardScreen, nativeModalHeaderOptions),
      renderScreen('ChatHistoryDetail', ChatHistoryDetailScreen, nativeModalHeaderOptions),
      renderScreen('FavoriteMessageDetail', FavoriteMessageDetailScreen, nativeModalHeaderOptions),
    ]
  );
}

const ConsoleStack = createNativeStackNavigator<ConsoleStackParamList>();

export function ConsoleTabNavigator(): React.JSX.Element {
  const screenOptions = useConsoleTabScreenOptions();

  return (
    <ConsoleStack.Navigator screenOptions={screenOptions.defaultScreenOptions}>
      <ConsoleStack.Screen name="ConsoleMenu" component={ConsoleMenuScreen} />
      {renderConsoleModalScreens({
        ...screenOptions,
        renderScreen: (name, component, options) => (
          <ConsoleStack.Screen key={name} name={name} component={component} options={options} />
        ),
      })}
    </ConsoleStack.Navigator>
  );
}
