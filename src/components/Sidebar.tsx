import React, {useEffect, useRef} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Pressable, ScrollView, Modal, Image,
} from 'react-native';
import {type Season, type SessionUser} from '../services/auth';
import {useTheme} from '../context/ThemeContext';

const SPORT_ICONS: Array<[string, string]> = [
  ['swim', '🏊'], ['soccer', '⚽'], ['football', '🏈'], ['basketball', '🏀'],
  ['baseball', '⚾'], ['softball', '🥎'], ['volleyball', '🏐'], ['tennis', '🎾'],
  ['track', '🏃'], ['cross', '🏃'], ['lacrosse', '🥍'], ['hockey', '🏒'],
  ['wrestling', '🤼'], ['golf', '⛳'], ['gymnastics', '🤸'],
];

function sportIcon(sport: string): string {
  const lower = sport.toLowerCase();
  for (const [key, icon] of SPORT_ICONS) {
    if (lower.includes(key)) return icon;
  }
  return '🏆';
}

function groupBySchool(seasons: Season[]): {schoolName: string; schoolId: number; seasons: Season[]}[] {
  const map = new Map<number, {schoolName: string; schoolId: number; seasons: Season[]}>();
  for (const s of seasons) {
    if (!map.has(s.school.id)) map.set(s.school.id, {schoolName: s.school.name, schoolId: s.school.id, seasons: []});
    map.get(s.school.id)!.seasons.push(s);
  }
  return Array.from(map.values());
}

const SIDEBAR_WIDTH = 280;

function isBlueHue(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return b > r + 20 && b > g + 10;
}

const SETTINGS_ICONS = {
  black: require('../../assets/icons/black/btn-settings-black.png'),
  blue:  require('../../assets/icons/blue/btn-settings-blue.png'),
  white: require('../../assets/icons/white/btn-settings-white.png'),
};

interface School {
  id: number;
  name: string;
}

interface Props {
  visible: boolean;
  user: SessionUser;
  role: string;
  seasons: Season[];
  schools: School[];
  activeSchoolId: number | null;
  activeSeasonId: number | null;
  onSelectSchool: (schoolId: number) => void;
  onSelectSeason: (season: Season) => void;
  onClose: () => void;
  onSettings: () => void;
}

export const Sidebar = ({visible, user, role, seasons, schools, activeSchoolId, activeSeasonId, onSelectSchool, onSelectSeason, onClose, onSettings}: Props) => {
  const {theme, colors} = useTheme();
  const settingsIcon = SETTINGS_ICONS[isBlueHue(colors.color_primary) ? 'blue' : theme.variant !== 'dark' ? 'black' : 'white'];
  const bg   = colors.color_background;
  const sf   = colors.color_surface;
  const bd   = colors.color_border;
  const tp   = colors.color_text_primary;
  const ts   = colors.color_text_secondary;
  const acc  = colors.color_primary;
  const onAcc = colors.color_text_on_primary;

  const translateX     = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {toValue: visible ? 0 : -SIDEBAR_WIDTH, useNativeDriver: true, bounciness: 0, speed: 20}),
      Animated.timing(backdropOpacity, {toValue: visible ? 1 : 0, duration: 200, useNativeDriver: true}),
    ]).start();
  }, [visible, translateX, backdropOpacity]);

  const multiSchool = schools.length > 1;
  const visibleSeasons = multiSchool && activeSchoolId
    ? seasons.filter(s => s.school.id === activeSchoolId)
    : seasons;
  const groups = groupBySchool(visibleSeasons);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, {opacity: backdropOpacity, backgroundColor: 'rgba(0,0,0,0.5)'}]} />
        </Pressable>

        <Animated.View style={[styles.sidebar, {backgroundColor: bg, borderRightColor: bd, transform: [{translateX}]}]}>
          <View style={[styles.profileSection, {borderBottomColor: bd}]}>
            <View style={[styles.profileAvatar, {backgroundColor: acc}]}>
              <Text style={[styles.profileAvatarText, {color: onAcc}]}>
                {user.first_name[0]}{user.last_name[0]}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, {color: tp}]}>{user.first_name} {user.last_name}</Text>
              <Text style={[styles.profileRole, {color: ts}]}>{role.replace(/_/g, ' ')}</Text>
            </View>
          </View>

          {multiSchool && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.schoolBar, {borderBottomColor: bd}]}
              contentContainerStyle={styles.schoolBarContent}>
              {schools.map(school => {
                const isActive = school.id === activeSchoolId;
                return (
                  <TouchableOpacity
                    key={school.id}
                    style={[styles.schoolPill, {borderColor: isActive ? acc : bd}, isActive && {backgroundColor: acc + '22'}]}
                    onPress={() => onSelectSchool(school.id)}
                    activeOpacity={0.7}>
                    <Text style={[styles.schoolPillText, {color: isActive ? acc : ts}]} numberOfLines={1}>
                      {school.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.workspacesLabel, {color: ts}]}>Workspaces</Text>
            {groups.map(group => (
              <View key={group.schoolId} style={styles.group}>
                <Text style={[styles.schoolLabel, {color: ts}]}>{group.schoolName}</Text>
                {group.seasons.map(season => {
                  const isActive = season.id === activeSeasonId;
                  return (
                    <TouchableOpacity
                      key={season.id}
                      style={[styles.seasonRow, isActive && {backgroundColor: sf}]}
                      onPress={() => { onSelectSeason(season); onClose(); }}
                      activeOpacity={0.7}>
                      <View style={[styles.seasonIcon, {backgroundColor: sf}, isActive && {backgroundColor: acc}]}>
                        <Text style={styles.seasonIconText}>{sportIcon(season.sport)}</Text>
                      </View>
                      <View style={styles.seasonInfo}>
                        <Text style={[styles.seasonSport, {color: ts}, isActive && {color: tp}]} numberOfLines={1}>
                          {season.sport}
                        </Text>
                        <Text style={[styles.seasonName, {color: ts}]} numberOfLines={1}>{season.name}</Text>
                      </View>
                      {isActive && <View style={[styles.activeDot, {backgroundColor: acc}]} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={[styles.settingsBtn, {borderTopColor: bd}]} onPress={onSettings} activeOpacity={0.72}>
            <Image source={settingsIcon} style={styles.settingsBtnIcon} resizeMode="contain" />
            <Text style={[styles.settingsBtnText, {color: ts}]}>Settings</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, flexDirection: 'row'},
  sidebar: {width: SIDEBAR_WIDTH, height: '100%', borderRightWidth: 1, shadowColor: '#000', shadowOffset: {width: 4, height: 0}, shadowOpacity: 0.4, shadowRadius: 12, elevation: 20},
  backdrop: {position: 'absolute', top: 0, bottom: 0, left: SIDEBAR_WIDTH, right: 0},
  profileSection: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, borderBottomWidth: 1},
  profileAvatar: {width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center'},
  profileAvatarText: {fontSize: 16, fontWeight: '700'},
  profileInfo: {flex: 1, gap: 2},
  profileName: {fontSize: 15, fontWeight: '700'},
  profileRole: {fontSize: 12, textTransform: 'capitalize'},
  schoolBar: {borderBottomWidth: 1, maxHeight: 52},
  schoolBarContent: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8},
  schoolPill: {borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5},
  schoolPillText: {fontSize: 12, fontWeight: '600'},
  scroll: {flex: 1, paddingTop: 8},
  workspacesLabel: {fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 20, paddingBottom: 8, paddingTop: 12},
  group: {marginBottom: 24, paddingHorizontal: 12},
  schoolLabel: {fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 8},
  seasonRow: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderRadius: 12, marginBottom: 4, gap: 12},
  seasonIcon: {width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  seasonIconText: {fontSize: 20},
  seasonInfo: {flex: 1},
  seasonSport: {fontSize: 14, fontWeight: '700'},
  seasonName: {fontSize: 12, marginTop: 1},
  activeDot: {width: 8, height: 8, borderRadius: 4},
  settingsBtn: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36, borderTopWidth: 1},
  settingsBtnIcon: {width: 22, height: 22},
  settingsBtnText: {fontSize: 15, fontWeight: '600'},
});
