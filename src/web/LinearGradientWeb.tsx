import React from 'react';
import { View } from 'react-native';

export default function LinearGradient({ colors, style, children, ...props }: any) {
  return (
    <View style={[style, { backgroundColor: colors?.[0] ?? '#0F172A' }]} {...props}>
      {children}
    </View>
  );
}
