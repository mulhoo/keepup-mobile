import React, {useEffect} from 'react';
import {View, Image, StyleSheet} from 'react-native';
import {ICON_THEMES, DEFAULT_ICON} from '../config/iconThemes';

export const SplashScreen = ({navigation}: any) => {
  const theme = ICON_THEMES[DEFAULT_ICON];

  useEffect(() => {
    const t = setTimeout(() => navigation.replace('RoleSelect'), 800);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <View style={styles.content}>
        <Image source={theme.icon} style={styles.icon} resizeMode="contain" />
        <Image source={theme.wording} style={styles.wording} resizeMode="contain" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  content: {alignItems: 'center', gap: 24},
  icon: {width: 120, height: 120},
  wording: {width: 220, height: 62},
});
