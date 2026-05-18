import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {loginAsDemo, resetDemoData, type DemoRole} from '../services/auth';
import {useTheme} from '../context/ThemeContext';

const GRADIENT_COLORS: [string, string, string] = ['#06B6D4', '#2563EB', '#06B6D4'];
const ROLE_LABEL_COLOR = '#22D3EE';

const ROLES: {key: DemoRole; label: string; description: string}[] = [
  {key: 'athletic_director', label: 'Athletic Director', description: 'Alfred High School · All sports'},
  {key: 'head_coach',        label: 'Head Coach',        description: 'Varsity Swimming · Alfred High School'},
  {key: 'student',           label: 'Student',           description: 'Varsity Swimming · Alfred High School'},
  {key: 'parent',            label: 'Parent',            description: 'Alfred High School · family'},
];

const WORDING_DARK  = require('../../assets/branding/keepup-wording-white.png');
const WORDING_LIGHT = require('../../assets/branding/keepup-wording-navy.png');

function isDarkBackground(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

export const RoleSelectScreen = ({navigation}: any) => {
  const {colors, theme} = useTheme();
  const [loading, setLoading] = useState<DemoRole | null>(null);
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    if (loading || resetting) return;
    setResetting(true);
    try {
      await resetDemoData();
      Alert.alert('Demo reset', 'The demo data has been reset to its original state.');
    } catch {
      Alert.alert('Error', 'Could not reset demo data.');
    } finally {
      setResetting(false);
    }
  }

  async function handleSelect(role: DemoRole) {
    if (loading) return;
    setLoading(role);
    try {
      const session = await loginAsDemo(role);
      navigation.replace('ChannelList', {role, user: session.user});
    } catch (e) {
      Alert.alert('Could not connect', 'Make sure the KeepUp server is reachable.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.color_background}]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Image
            source={isDarkBackground(colors.color_background) ? WORDING_DARK : WORDING_LIGHT}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.subtitle, {color: colors.color_text_secondary}]}>Choose a profile to explore</Text>
        </View>

        <View style={styles.grid}>
          {ROLES.map(role => (
            <LinearGradient
              key={role.key}
              colors={GRADIENT_COLORS}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.cardGradient}>
              <TouchableOpacity
                style={[styles.card, {backgroundColor: colors.color_surface}]}
                onPress={() => handleSelect(role.key)}
                disabled={loading !== null}
                activeOpacity={0.75}>
                {loading === role.key
                ? <ActivityIndicator color={ROLE_LABEL_COLOR} style={styles.spinner} />
                : <Text style={styles.roleLabel}>{role.label}</Text>}
                <Text style={[styles.roleDesc, {color: colors.color_text_secondary}]}>{role.description}</Text>
              </TouchableOpacity>
            </LinearGradient>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleReset}
          disabled={loading !== null || resetting}
          style={styles.resetBtn}>
          {resetting
            ? <ActivityIndicator size="small" color={colors.color_text_secondary} />
            : <Text style={[styles.resetText, {color: colors.color_text_secondary}]}>Reset demo</Text>
          }
        </TouchableOpacity>

        <Text style={[styles.footer, {color: colors.color_text_secondary}]}>
          This is a live demo. Messages are moderated by Gemma 4 running on this device.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1},
  container: {flex: 1, paddingHorizontal: 24, paddingTop: 48},
  header: {marginBottom: 40, alignItems: 'center'},
  logo: {width: 180, height: 52},
  subtitle: {fontSize: 15, marginTop: 8},
  grid: {gap: 14},
  cardGradient: {
    borderRadius: 18,
    padding: 2,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  spinner: {width: 24, height: 24},
  roleLabel: {fontSize: 16, fontWeight: '700', flex: 0, color: ROLE_LABEL_COLOR},
  roleDesc: {fontSize: 13, flex: 1, flexWrap: 'wrap'},
  resetBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 'auto',
  },
  resetText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    paddingBottom: 24,
    lineHeight: 18,
    marginTop: 8,
  },
});
