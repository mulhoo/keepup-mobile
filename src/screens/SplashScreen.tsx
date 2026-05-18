import React, {useEffect} from 'react';
import {View, Image, StyleSheet, Animated} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ICON_THEMES, ICON_STORAGE_KEY, DEFAULT_ICON, type IconKey} from '../config/iconThemes';

interface Props {
  navigation: any;
}

export const SplashScreen = ({navigation}: Props) => {
  const [iconKey, setIconKey] = React.useState<IconKey | null>(null);
  const opacity = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AsyncStorage.getItem(ICON_STORAGE_KEY).then(val => {
      setIconKey((val as IconKey) ?? DEFAULT_ICON);
    });
  }, []);

  useEffect(() => {
    if (iconKey === null) return;

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => navigation.replace('RoleSelect'));
    }, 1200);

    return () => clearTimeout(timer);
  }, [iconKey, navigation, opacity]);

  const theme = ICON_THEMES[iconKey ?? DEFAULT_ICON];

  return (
    <Animated.View style={[styles.container, {backgroundColor: theme.background, opacity}]}>
      <View style={styles.content}>
        <Image source={theme.icon} style={styles.icon} resizeMode="contain" />
        <Image source={theme.wording} style={styles.wording} resizeMode="contain" />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 24,
  },
  icon: {
    width: 120,
    height: 120,
  },
  wording: {
    width: 220,
    height: 62,
  },
});
