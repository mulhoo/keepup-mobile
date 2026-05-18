import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {changeIcon} from 'react-native-change-icon';
import {ICON_THEMES, ICON_STORAGE_KEY, DEFAULT_ICON, type IconKey} from '../config/iconThemes';

const PICKER_ICONS: {key: IconKey; label: string}[] = [
  {key: 'keepup-icon-blue',          label: 'Blue'},
  {key: 'keepup-icon-border-blue',   label: 'Border'},
  {key: 'keepup-icon-blwh',          label: 'Black'},
  {key: 'keepup-icon-blwh-inverted', label: 'Dark'},
  {key: 'keepup-icon-white',         label: 'White'},
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const IconPicker = ({visible, onClose}: Props) => {
  const [current, setCurrent] = useState<IconKey>(DEFAULT_ICON);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ICON_STORAGE_KEY).then(val => {
      if (val) setCurrent(val as IconKey);
    });
  }, [visible]);

  async function handleSelect(key: IconKey) {
    if (key === current) { onClose(); return; }
    setLoading(true);
    try {
      await changeIcon(key === DEFAULT_ICON ? null : key);
      await AsyncStorage.setItem(ICON_STORAGE_KEY, key);
      setCurrent(key);
    } catch (e: any) {
      Alert.alert('Could not change icon', e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
      onClose();
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>App Icon</Text>
        <Text style={styles.subtitle}>Choose how KeepUp looks on your home screen</Text>

        <View style={styles.grid}>
          {PICKER_ICONS.map(({key, label}) => {
            const theme = ICON_THEMES[key];
            const isActive = key === current;
            return (
              <TouchableOpacity
                key={key}
                style={styles.iconCell}
                onPress={() => handleSelect(key)}
                activeOpacity={0.75}
                disabled={loading}>
                <View style={[styles.iconWrap, {backgroundColor: theme.background}, isActive && styles.iconWrapActive]}>
                  <Image source={theme.icon} style={styles.iconImage} resizeMode="contain" />
                  {isActive && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.iconLabel, isActive && styles.iconLabelActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#6366F1" />
          </View>
        )}

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)'},
  sheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#334155', alignSelf: 'center', marginBottom: 20,
  },
  title: {fontSize: 18, fontWeight: '800', color: '#F8FAFC', textAlign: 'center', marginBottom: 4},
  subtitle: {fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 28},

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 24,
  },
  iconCell: {alignItems: 'center', gap: 8},
  iconWrap: {
    width: 72, height: 72,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconWrapActive: {borderColor: '#6366F1'},
  iconImage: {width: 52, height: 52},
  checkBadge: {
    position: 'absolute', bottom: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#6366F1',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#0F172A',
  },
  checkText: {fontSize: 10, color: '#fff', fontWeight: '700'},
  iconLabel: {fontSize: 12, color: '#64748B', fontWeight: '500'},
  iconLabelActive: {color: '#F8FAFC', fontWeight: '700'},

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtn: {
    paddingVertical: 14,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {fontSize: 15, color: '#94A3B8', fontWeight: '600'},
});
