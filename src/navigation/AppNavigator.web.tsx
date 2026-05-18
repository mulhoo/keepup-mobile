import React, {useState, useCallback} from 'react';
import {View, StyleSheet} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ThemeProvider} from '../context/ThemeContext';
import {RoleSelectScreen} from '../screens/RoleSelectScreen';
import {WorkspaceScreen} from '../screens/WorkspaceScreen';
import {ChatScreen} from '../screens/ChatScreen';
import {ThreadScreen} from '../screens/ThreadScreen';
import {SettingsScreen} from '../screens/SettingsScreen';

type ScreenName = 'RoleSelect' | 'ChannelList' | 'Chat' | 'Thread' | 'Settings';

interface StackEntry { name: ScreenName; params?: any; }

function makeNavigation(stack: StackEntry[], setStack: React.Dispatch<React.SetStateAction<StackEntry[]>>) {
  return {
    navigate: (name: ScreenName, params?: any) =>
      setStack(s => [...s, {name, params}]),
    replace: (name: ScreenName, params?: any) =>
      setStack(s => [...s.slice(0, -1), {name, params}]),
    goBack: () => setStack(s => s.length > 1 ? s.slice(0, -1) : s),
    push: (name: ScreenName, params?: any) =>
      setStack(s => [...s, {name, params}]),
  };
}

const SCREENS: Record<ScreenName, React.ComponentType<any>> = {
  RoleSelect: RoleSelectScreen,
  ChannelList: WorkspaceScreen,
  Chat: ChatScreen,
  Thread: ThreadScreen,
  Settings: SettingsScreen,
};

export const AppNavigator = () => {
  const [stack, setStack] = useState<StackEntry[]>([{name: 'RoleSelect'}]);
  const navigation = useCallback(() => makeNavigation(stack, setStack), [stack])();

  const current = stack[stack.length - 1];
  const Screen = SCREENS[current.name];

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <View style={styles.root}>
          <Screen
            navigation={navigation}
            route={{params: current.params ?? {}}}
          />
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, overflow: 'hidden' as any},
});
