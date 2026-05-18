import React, {useState, useEffect, useRef} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, Pressable, Image, Alert, ActivityIndicator, TextInput, Keyboard,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {changeIcon} from 'react-native-change-icon';
import {logout, type DemoRole, type SessionUser} from '../services/auth';
import {ICON_THEMES, ICON_STORAGE_KEY, DEFAULT_ICON, type IconKey} from '../config/iconThemes';
import {
  getNameFormat, saveNameFormat,
  getAvailableFormats, formatDisplayName, getDefaultNameFormat,
  savePreferredLanguage,
  DEFAULT_THEME, type NameFormat,
} from '../services/preferences';
import {savePronouns} from '../services/messages';
import {api} from '../services/api';
import {fetchThemes, type AppTheme} from '../services/themes';
import {useTheme} from '../context/ThemeContext';

const ICON_LABELS: Record<IconKey, string> = {
  'keepup-icon-blue':          'Blue',
  'keepup-icon-border-blue':   'Border Blue',
  'keepup-icon-blwh':          'Black & White',
  'keepup-icon-blwh-inverted': 'B&W Inverted',
  'keepup-icon-white':         'White',
};

interface Props {
  navigation: any;
  route: any;
}

function SplitSwatch({color1, color2, size = 52}: {color1: string; color2: string; size?: number}) {
  const r = size * 0.22;
  return (
    <View style={{width: size, height: size, borderRadius: r, overflow: 'hidden', backgroundColor: color2}}>
      <View style={{
        width: 0, height: 0, borderStyle: 'solid',
        borderRightWidth: size, borderTopWidth: size,
        borderRightColor: 'transparent', borderTopColor: color1,
      }} />
    </View>
  );
}

export const SettingsScreen = ({navigation, route}: Props) => {
  const {role, user, schoolName} = route.params as {role: DemoRole; user: SessionUser; schoolName: string | null};
  const {colors, theme: storedTheme, setTheme} = useTheme();

  const [nameFormat, setNameFormat] = useState<NameFormat>(getDefaultNameFormat(role));
  const [pronouns, setPronouns] = useState('');
  const [iconKey, setIconKey] = useState<IconKey>(DEFAULT_ICON);
  const pronounsInputRef = useRef<TextInput>(null);
  const [themes, setThemes] = useState<AppTheme[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<'dark' | 'light'>(storedTheme.variant ?? 'dark');
  const [preferredLanguage, setPreferredLanguage] = useState('');
  const languageInputRef = useRef<TextInput>(null);
  const [nameFormatModalOpen, setNameFormatModalOpen] = useState(false);
  const [iconModalOpen, setIconModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      getNameFormat(role),
      AsyncStorage.getItem(ICON_STORAGE_KEY),
      api.get<{pronouns?: string | null; preferred_language?: string | null}>('/demo/me').catch(() => ({})),
    ]).then(([fmt, icon, me]) => {
      setNameFormat(fmt);
      if (icon) setIconKey(icon as IconKey);
      if ('pronouns' in me && me.pronouns) setPronouns(me.pronouns);
      if ('preferred_language' in me) setPreferredLanguage(me.preferred_language ?? '');
    });
  }, []);

  const accent = colors.color_primary;
  const bg  = colors.color_background;
  const sf  = colors.color_surface;
  const bd  = colors.color_border;
  const tp  = colors.color_text_primary;
  const ts  = colors.color_text_secondary;

  const nameFormats = getAvailableFormats(role);
  const namePreview = role === 'parent'
    ? `${user.first_name} ${user.last_name}`
    : formatDisplayName(user.first_name, user.last_name, nameFormat);

  async function openThemeModal() {
    setThemeModalOpen(true);
    setThemesLoading(true);
    try {
      const data = await fetchThemes();
      setThemes(data);
    } catch {}
    finally {
      setThemesLoading(false);
    }
  }

  async function handlePronounsBlur() {
    await savePronouns(pronouns).catch(() => {});
  }

  async function handleNameFormat(format: NameFormat) {
    setNameFormat(format);
    await saveNameFormat(format, role === 'student' || role === 'student_captain');
    setNameFormatModalOpen(false);
  }

  async function handleTheme(theme: AppTheme) {
    await setTheme({
      id: theme.id, name: theme.name,
      scope: theme.scope, variant: theme.variant,
      school_name: theme.school_name, colors: theme.colors,
    });
  }

  function handleVariantToggle(variant: 'dark' | 'light') {
    setSelectedVariant(variant);
    if (themes.length === 0) return;
    // Auto-apply: prefer same-named theme in the new variant, then first system theme, then any.
    const pick =
      themes.find(t => t.variant === variant && t.name === storedTheme.name) ??
      themes.find(t => t.variant === variant && t.scope === 'system') ??
      themes.find(t => t.variant === variant);
    if (pick) handleTheme(pick);
  }

  async function handleLanguageBlur() {
    await savePreferredLanguage(preferredLanguage).catch(() => {});
  }

  async function handleIconKey(key: IconKey) {
    setIconKey(key);
    await AsyncStorage.setItem(ICON_STORAGE_KEY, key);
    try { await changeIcon(key); } catch {}
    setIconModalOpen(false);
  }

  async function handleSwitchProfile() {
    Alert.alert('Switch Profile', 'This will log you out of the current demo profile.', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Switch', style: 'destructive', onPress: async () => { await setTheme(DEFAULT_THEME); await logout(); navigation.reset('RoleSelect'); }},
    ]);
  }

  const filteredThemes = themes.filter(t => t.variant === selectedVariant);
  const systemThemes   = filteredThemes.filter(t => t.scope === 'system');
  const schoolGroups   = filteredThemes
    .filter(t => t.scope === 'school' && (schoolName == null || t.school_name === schoolName))
    .reduce<Record<string, AppTheme[]>>((acc, t) => {
      const key = t.school_name ?? 'School';
      acc[key] = [...(acc[key] ?? []), t];
      return acc;
    }, {});

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: bg}]}>
      <View style={[styles.header, {backgroundColor: bg, borderBottomColor: bd}]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, {color: accent}]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: tp}]}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}>

        <Text style={[styles.sectionLabel, {color: ts}]}>Profile</Text>

        {role === 'parent' ? (
          <View style={[styles.row, styles.rowLocked, {backgroundColor: sf, borderColor: bd}]}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIconWrap, {backgroundColor: bg}]}>
                <Text style={styles.rowEmoji}>👤</Text>
              </View>
              <View>
                <Text style={[styles.rowLabel, {color: tp}]}>Display Name</Text>
                <Text style={[styles.rowSub, {color: ts}]}>{namePreview}</Text>
              </View>
            </View>
            <View style={[styles.lockedBadge, {backgroundColor: bg, borderColor: bd}]}>
              <Text style={[styles.lockedText, {color: ts}]}>Locked</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={[styles.row, {backgroundColor: sf, borderColor: bd}]} onPress={() => setNameFormatModalOpen(true)} activeOpacity={0.72}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIconWrap, {backgroundColor: bg}]}>
                <Text style={styles.rowEmoji}>👤</Text>
              </View>
              <View>
                <Text style={[styles.rowLabel, {color: tp}]}>Display Name</Text>
                <Text style={[styles.rowSub, {color: ts}]}>{namePreview}</Text>
              </View>
            </View>
            <Text style={[styles.chevron, {color: bd}]}>›</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.row, {backgroundColor: sf, borderColor: bd}]}>
          <View style={styles.rowLeft}>
            <View style={[styles.rowIconWrap, {backgroundColor: bg}]}>
              <Text style={styles.rowEmoji}>💬</Text>
            </View>
            <View style={styles.pronounsLabelCol}>
              <Text style={[styles.rowLabel, {color: tp}]}>Pronouns</Text>
              <View style={styles.pronounsInputRow}>
                <TextInput
                  ref={pronounsInputRef}
                  style={[styles.pronounsInput, {color: ts}]}
                  value={pronouns}
                  onChangeText={setPronouns}
                  onBlur={handlePronounsBlur}
                  placeholder="e.g. they/them"
                  placeholderTextColor={ts + '60'}
                  autoCapitalize="none"
                  returnKeyType="done"
                  maxLength={30}
                />
                <TouchableOpacity
                  onPress={() => pronounsInputRef.current?.focus()}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                  <Image
                    source={require('../../assets/icons/black/pencil.png')}
                    style={[styles.pencilIcon, {tintColor: ts}]}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionLabel, styles.sectionSpaced, {color: ts}]}>Language</Text>

        <View style={[styles.row, {backgroundColor: sf, borderColor: bd}]}>
          <View style={styles.rowLeft}>
            <View style={[styles.rowIconWrap, {backgroundColor: bg}]}>
              <Text style={styles.rowEmoji}>🌐</Text>
            </View>
            <View style={styles.pronounsLabelCol}>
              <Text style={[styles.rowLabel, {color: tp}]}>Translate to</Text>
              <View style={styles.pronounsInputRow}>
                <TextInput
                  ref={languageInputRef}
                  style={[styles.pronounsInput, {color: ts, width: 130}]}
                  value={preferredLanguage}
                  onChangeText={setPreferredLanguage}
                  onBlur={handleLanguageBlur}
                  placeholder="e.g. French, Arabic"
                  placeholderTextColor={ts + '60'}
                  autoCapitalize="words"
                  returnKeyType="done"
                  maxLength={50}
                />
                <TouchableOpacity
                  onPress={() => languageInputRef.current?.focus()}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                  <Image
                    source={require('../../assets/icons/black/pencil.png')}
                    style={[styles.pencilIcon, {tintColor: ts}]}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionLabel, styles.sectionSpaced, {color: ts}]}>Appearance</Text>

        <TouchableOpacity style={[styles.row, {backgroundColor: sf, borderColor: bd}]} onPress={() => setIconModalOpen(true)} activeOpacity={0.72}>
          <View style={styles.rowLeft}>
            <View style={[styles.rowIconWrap, {backgroundColor: ICON_THEMES[iconKey].background, padding: 0}]}>
              <Image source={ICON_THEMES[iconKey].icon} style={styles.rowIconImg} resizeMode="contain" />
            </View>
            <View>
              <Text style={[styles.rowLabel, {color: tp}]}>App Icon</Text>
              <Text style={[styles.rowSub, {color: ts}]}>{ICON_LABELS[iconKey]}</Text>
            </View>
          </View>
          <Text style={[styles.chevron, {color: bd}]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.row, {backgroundColor: sf, borderColor: bd}]} onPress={openThemeModal} activeOpacity={0.72}>
          <View style={styles.rowLeft}>
            <View style={[styles.rowIconWrap, {backgroundColor: accent + '22', overflow: 'hidden', padding: 0}]}>
              <SplitSwatch color1={colors.color_primary} color2={colors.color_accent} size={36} />
            </View>
            <View>
              <Text style={[styles.rowLabel, {color: tp}]}>Color Theme</Text>
              <Text style={[styles.rowSub, {color: accent}]}>{storedTheme.name}</Text>
            </View>
          </View>
          <Text style={[styles.chevron, {color: bd}]}>›</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, styles.sectionSpaced, {color: ts}]}>Account</Text>

        <TouchableOpacity style={[styles.row, styles.rowDestructive, {backgroundColor: sf}]} onPress={handleSwitchProfile} activeOpacity={0.72}>
          <View style={styles.rowLeft}>
            <View style={[styles.rowIconWrap, {backgroundColor: '#7F1D1D33'}]}>
              <Text style={styles.rowEmoji}>🔄</Text>
            </View>
            <Text style={styles.rowLabelDestructive}>Switch Profile</Text>
          </View>
          <Text style={[styles.chevron, {color: bd}]}>›</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Display Name Modal */}
      <Modal visible={nameFormatModalOpen} transparent animationType="fade" onRequestClose={() => setNameFormatModalOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setNameFormatModalOpen(false)}>
          <Pressable style={[styles.sheet, {backgroundColor: sf, borderColor: bd}]}>
            <Text style={[styles.sheetTitle, {color: tp}]}>Display Name</Text>
            <Text style={[styles.sheetSub, {color: ts}]}>How your name appears in conversations</Text>
            {nameFormats.map(fmt => (
              <TouchableOpacity
                key={fmt.key}
                style={[styles.option, {borderColor: bd}, fmt.key === nameFormat && {borderColor: accent, backgroundColor: accent + '18'}]}
                onPress={() => handleNameFormat(fmt.key)}>
                <View style={{flex: 1}}>
                  <Text style={[styles.optionText, {color: ts}, fmt.key === nameFormat && {color: tp}]}>{fmt.label}</Text>
                  <Text style={[styles.optionPreview, {color: ts}]}>
                    {formatDisplayName(user.first_name, user.last_name, fmt.key)}
                  </Text>
                </View>
                {fmt.key === nameFormat && <Text style={[styles.check, {color: accent}]}>✓</Text>}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* App Icon Modal */}
      <Modal visible={iconModalOpen} transparent animationType="fade" onRequestClose={() => setIconModalOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIconModalOpen(false)}>
          <Pressable style={[styles.sheet, {backgroundColor: sf, borderColor: bd}]}>
            <Text style={[styles.sheetTitle, {color: tp}]}>App Icon</Text>
            <Text style={[styles.sheetSub, {color: ts}]}>Also updates your splash screen</Text>
            <View style={styles.iconGrid}>
              {(Object.keys(ICON_THEMES) as IconKey[]).map(key => (
                <TouchableOpacity
                  key={key}
                  style={[styles.iconCell, {borderColor: 'transparent'}, key === iconKey && {borderColor: accent}]}
                  onPress={() => handleIconKey(key)}>
                  <View style={[styles.iconBg, {backgroundColor: ICON_THEMES[key].background}]}>
                    <Image source={ICON_THEMES[key].icon} style={styles.iconImg} resizeMode="contain" />
                  </View>
                  <Text style={[styles.iconLabel, {color: ts}, key === iconKey && {color: accent}]} numberOfLines={2}>
                    {ICON_LABELS[key]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Color Theme Modal */}
      <Modal visible={themeModalOpen} transparent animationType="fade" onRequestClose={() => setThemeModalOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setThemeModalOpen(false)}>
          <Pressable style={[styles.themeSheet, {backgroundColor: sf, borderColor: bd}]}>

            {/* Modal header */}
            <View style={styles.themeSheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, {color: tp}]}>Color Theme</Text>
                <Text style={[styles.sheetSub, {color: ts}]}>Choose your palette</Text>
              </View>
              <TouchableOpacity onPress={() => setThemeModalOpen(false)} style={[styles.closeBtn, {backgroundColor: bg, borderColor: bd}]} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Text style={[styles.closeBtnText, {color: ts}]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Dark / Light toggle */}
            <View style={[styles.variantToggle, {backgroundColor: bg, borderColor: bd}]}>
              {(['dark', 'light'] as const).map(v => (
                <TouchableOpacity
                  key={v}
                  style={[styles.variantBtn, selectedVariant === v && {backgroundColor: accent}]}
                  onPress={() => handleVariantToggle(v)}
                  activeOpacity={0.8}>
                  <Text style={[
                    styles.variantBtnText,
                    {color: ts},
                    selectedVariant === v && {color: colors.color_text_on_primary, fontWeight: '700'},
                  ]}>
                    {v === 'dark' ? '🌙 Dark' : '☀️ Light'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {themesLoading ? (
              <ActivityIndicator color={accent} style={{paddingVertical: 32}} />
            ) : themes.length === 0 ? (
              <Text style={[styles.emptyThemes, {color: ts}]}>Couldn't load themes. Your current theme is still active.</Text>
            ) : filteredThemes.length === 0 ? (
              <Text style={[styles.emptyThemes, {color: ts}]}>No {selectedVariant} themes available.</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.themeScroll}>
                {systemThemes.length > 0 && (
                  <>
                    <Text style={[styles.themeGroupLabel, {color: ts}]}>KeepUp</Text>
                    <View style={styles.swatchGrid}>
                      {systemThemes.map(t => (
                        <SwatchCell key={t.id} theme={t} selected={storedTheme.id === t.id} accent={accent} bd={bd} ts={ts} tp={tp} onPress={() => handleTheme(t)} />
                      ))}
                    </View>
                  </>
                )}
                {Object.entries(schoolGroups).map(([schoolName, group]) => (
                  <View key={schoolName}>
                    <Text style={[styles.themeGroupLabel, {color: ts}]}>{schoolName}</Text>
                    <View style={styles.swatchGrid}>
                      {group.map(t => (
                        <SwatchCell key={t.id} theme={t} selected={storedTheme.id === t.id} accent={accent} bd={bd} ts={ts} tp={tp} onPress={() => handleTheme(t)} />
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

interface SwatchCellProps {
  theme: AppTheme;
  selected: boolean;
  accent: string;
  bd: string; ts: string; tp: string;
  onPress: () => void;
}

function SwatchCell({theme, selected, accent, bd, ts, tp, onPress}: SwatchCellProps) {
  return (
    <TouchableOpacity style={styles.swatchCell} onPress={onPress} activeOpacity={0.75}>
      <View style={[
        styles.swatchOuter,
        {borderColor: selected ? accent : bd},
        selected && {shadowColor: accent, shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: {width: 0, height: 0}},
      ]}>
        <SplitSwatch color1={theme.colors.color_primary} color2={theme.colors.color_accent} size={52} />
        {selected && (
          <View style={[styles.swatchCheck, {backgroundColor: accent}]}>
            <Text style={styles.swatchCheckText}>✓</Text>
          </View>
        )}
      </View>
      <Text style={[styles.swatchLabel, {color: selected ? tp : ts}]} numberOfLines={2}>{theme.name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: {width: 36, padding: 4},
  backText: {fontSize: 32, lineHeight: 36},
  headerTitle: {fontSize: 16, fontWeight: '800'},
  scroll: {flex: 1},
  scrollContent: {paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40},
  sectionLabel: {fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10},
  sectionSpaced: {marginTop: 28},
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, marginBottom: 8,
  },
  rowLocked: {opacity: 0.65},
  rowDestructive: {borderColor: '#7F1D1D44'},
  rowLeft: {flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1},
  rowIconWrap: {width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  rowEmoji: {fontSize: 18},
  rowIconImg: {width: 36, height: 36},
  rowLabel: {fontSize: 15, fontWeight: '600'},
  rowLabelDestructive: {fontSize: 15, fontWeight: '600', color: '#F87171'},
  rowSub: {fontSize: 12, marginTop: 1},
  chevron: {fontSize: 20},
  pronounsLabelCol: {flex: 1, gap: 2},
  pronounsInputRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  pronounsInput: {fontSize: 13, paddingVertical: 0, width: 75},
  pencilIcon: {width: 14, height: 14, opacity: 0.45},
  lockedBadge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1},
  lockedText: {fontSize: 11, fontWeight: '600'},
  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 20},
  sheet: {
    borderRadius: 20, padding: 20, borderWidth: 1,
    shadowColor: '#000', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.4, shadowRadius: 20,
    maxHeight: '80%',
  },
  themeSheet: {
    borderRadius: 20, padding: 20, borderWidth: 1,
    shadowColor: '#000', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.4, shadowRadius: 20,
    maxHeight: '85%',
  },
  themeSheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginTop: 2,
  },
  closeBtnText: {fontSize: 14, fontWeight: '600'},
  sheetTitle: {fontSize: 17, fontWeight: '800', marginBottom: 2},
  sheetSub: {fontSize: 13, marginBottom: 0},
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8,
  },
  optionText: {fontSize: 15, fontWeight: '600'},
  optionPreview: {fontSize: 12, marginTop: 2, fontWeight: '500', textTransform: 'capitalize'},
  check: {fontSize: 16, fontWeight: '700'},
  variantToggle: {
    flexDirection: 'row', borderRadius: 12, borderWidth: 1,
    overflow: 'hidden', marginBottom: 16,
  },
  variantBtn: {flex: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center'},
  variantBtnText: {fontSize: 14, fontWeight: '500'},
  themeScroll: {maxHeight: 380},
  themeGroupLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.7,
    textTransform: 'uppercase', marginTop: 4, marginBottom: 10,
  },
  swatchGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16},
  swatchCell: {alignItems: 'center', gap: 6, width: 72},
  swatchOuter: {
    borderRadius: 14, borderWidth: 2, padding: 2,
    shadowColor: 'transparent', shadowOpacity: 0, shadowRadius: 0, shadowOffset: {width: 0, height: 0},
  },
  swatchCheck: {
    position: 'absolute', bottom: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  swatchCheckText: {fontSize: 10, fontWeight: '800', color: '#fff'},
  swatchLabel: {fontSize: 11, textAlign: 'center', fontWeight: '500'},
  emptyThemes: {fontSize: 14, textAlign: 'center', paddingVertical: 24},
  iconGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  iconCell: {width: '30%', alignItems: 'center', gap: 6, padding: 8, borderRadius: 12, borderWidth: 2},
  iconBg: {width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  iconImg: {width: 46, height: 46},
  iconLabel: {fontSize: 11, textAlign: 'center'},
});
