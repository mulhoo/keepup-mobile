import React from 'react';
import {View} from 'react-native';

export const GestureHandlerRootView = ({children, style}: any) => (
  <View style={[{flex: 1}, style]}>{children}</View>
);

export const PanGestureHandler = ({children}: any) => <>{children}</>;
export const TapGestureHandler = ({children}: any) => <>{children}</>;
export const State = {};
export const Directions = {};
export default {};
