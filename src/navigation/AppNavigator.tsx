import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ThemeProvider} from '../context/ThemeContext';
import {SplashScreen} from '../screens/SplashScreen';
import {RoleSelectScreen} from '../screens/RoleSelectScreen';
import {WorkspaceScreen} from '../screens/WorkspaceScreen';
import {ChatScreen} from '../screens/ChatScreen';
import {ThreadScreen} from '../screens/ThreadScreen';
import {SettingsScreen} from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{headerShown: false, animation: 'fade'}}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
          <Stack.Screen name="ChannelList" component={WorkspaceScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Thread" component={ThreadScreen} options={{animation: 'slide_from_right'}} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{animation: 'slide_from_right'}} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
};
