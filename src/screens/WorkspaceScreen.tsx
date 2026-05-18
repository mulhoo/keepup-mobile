import React, {useState, useEffect, useCallback} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Modal, Pressable, ScrollView, Image, type ImageSourcePropType,
} from 'react-native';

import {SafeAreaView} from 'react-native-safe-area-context';
import {
  fetchSeasons, fetchChannels, fetchDmConversations,
  type Season, type Channel, type DmConversation, type DemoRole, type SessionUser,
} from '../services/auth';
import {Sidebar} from '../components/Sidebar';
import {NewDmModal} from '../components/NewDmModal';
import {getNameFormat, getDefaultNameFormat, type NameFormat} from '../services/preferences';
import {useTheme} from '../context/ThemeContext';
import {toTitleCase} from '../utils/strings';

const CHANNEL_ICONS = {
  black: {
    conversation: require('../../assets/icons/black/conversation.png'),
    broadcast:    require('../../assets/icons/black/broadcast.png'),
    private:      require('../../assets/icons/black/private.png'),
    family:       require('../../assets/icons/black/family.png'),
  },
  blue: {
    conversation: require('../../assets/icons/blue/conversation.png'),
    broadcast:    require('../../assets/icons/blue/broadcast.png'),
    private:      require('../../assets/icons/blue/private.png'),
    family:       require('../../assets/icons/blue/family.png'),
  },
  white: {
    conversation: require('../../assets/icons/white/conversation.png'),
    broadcast:    require('../../assets/icons/white/broadcast.png'),
    private:      require('../../assets/icons/white/private.png'),
    family:       require('../../assets/icons/white/family.png'),
  },
};


function channelIconSource(channel: Channel, variant: 'black' | 'blue' | 'white') {
  const set = CHANNEL_ICONS[variant];
  if (channel.channel_type === 'family_group') return set.family;
  if (channel.channel_type === 'athletes_only' || channel.channel_type === 'coaches_only') return set.private;
  if (channel.channel_type === 'broadcast') return set.broadcast;
  return set.conversation;
}

const MULTI_SCHOOL_ROLES = ['head_coach', 'assistant_coach', 'parent'];

const CHEVRON_ICONS: Record<string, ImageSourcePropType> = {
  black: require('../../assets/icons/black/circle-chevron-down.png'),
  blue:  require('../../assets/icons/blue/circle-chevron-down.png'),
  white: require('../../assets/icons/white/circle-chevron-down.png'),
};

function isBlueHue(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return b > r + 20 && b > g + 10;
}

export const WorkspaceScreen = ({navigation, route}: any) => {
  const {role, user, restoreSeasonId} = route.params as {role: DemoRole; user: SessionUser; restoreSeasonId?: number};

  // Workspace state
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [dms, setDms] = useState<DmConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newDmOpen, setNewDmOpen] = useState(false);

  const uniqueSchools = seasons.length > 0
    ? Array.from(new Map(seasons.map(s => [s.school.id, s.school])).values()).sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const [activeSchoolId, setActiveSchoolId] = useState<number | null>(null);
  const seasonsBySchool = activeSchoolId
    ? seasons.filter(s => s.school.id === activeSchoolId)
    : seasons;

  const {theme, colors} = useTheme();
  const [nameFormat, setNameFormat] = useState<NameFormat>(getDefaultNameFormat(role));

  const iconVariant: 'black' | 'blue' | 'white' = isBlueHue(colors.color_primary) ? 'blue' : theme.variant !== 'dark' ? 'black' : 'white';
  const chevronIcon = CHEVRON_ICONS[iconVariant];

  const accent    = colors.color_primary;
  const accentDark = colors.color_accent;
  const bg  = colors.color_background;
  const sf  = colors.color_surface;
  const bd  = colors.color_border;
  const tp  = colors.color_text_primary;
  const ts  = colors.color_text_secondary;

  useEffect(() => {
    fetchSeasons()
      .then(data => {
        setSeasons(data);
        if (data.length > 0) {
          const initial = (restoreSeasonId && data.find(s => s.id === restoreSeasonId)) || data[0];
          setActiveSeason(initial);
          setActiveSchoolId(initial.school.id);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      getNameFormat(role).then(setNameFormat);
    }, [role]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!activeSeason) return;
      Promise.all([fetchChannels(activeSeason.id), fetchDmConversations(activeSeason.id)])
        .then(([ch, dm]) => { setChannels(ch); setDms(dm); })
        .catch(() => {});
    }, [activeSeason]),
  );

  useEffect(() => {
    if (!activeSeason) return;
    setContentLoading(true);
    Promise.all([
      fetchChannels(activeSeason.id),
      fetchDmConversations(activeSeason.id),
    ])
      .then(([ch, dm]) => { setChannels(ch); setDms(dm); })
      .catch(() => setError(true))
      .finally(() => setContentLoading(false));
  }, [activeSeason]);

  function selectSeason(season: Season) {
    setActiveSeason(season);
    setActiveSchoolId(season.school.id);
  }

  function selectSchool(schoolId: number) {
    setActiveSchoolId(schoolId);
    const first = seasons.find(s => s.school.id === schoolId);
    if (first) setActiveSeason(first);
  }

  function openSettings() {
    setSidebarOpen(false);
    navigation.navigate('Settings', {role, user, schoolName: activeSeason?.school.name ?? null});
  }

  function handleChannel(channel: Channel) {
    setChannels(prev => prev.map(ch => ch.id === channel.id ? {...ch, unread_count: 0} : ch));
    navigation.navigate('Chat', {role, user, channel});
  }

  function handleNewDm(dm: DmConversation) {
    setNewDmOpen(false);
    setDms(prev => {
      const exists = prev.some(d => d.id === dm.id);
      return exists ? prev : [dm, ...prev];
    });
    navigation.navigate('Chat', {
      role, user,
      channel: {
        id: dm.id,
        name: `${dm.other_user.first_name} ${dm.other_user.last_name}`,
        channel_type: 'dm',
        sport: activeSeason?.sport ?? '',
        season: activeSeason?.name ?? '',
        season_id: dm.season_id,
        school_id: activeSeason?.school.id ?? 0,
        school_name: activeSeason?.school.name ?? '',
        system_generated: false,
        last_message: dm.last_message,
        unread_count: dm.unread_count,
      },
    });
  }

  function handleDm(dm: DmConversation) {
    setDms(prev => prev.map(d => d.id === dm.id ? {...d, unread_count: 0} : d));
    navigation.navigate('Chat', {
      role, user,
      channel: {
        id: dm.id,
        name: `${dm.other_user.first_name} ${dm.other_user.last_name}`,
        channel_type: 'dm',
        sport: activeSeason?.sport ?? '',
        season: activeSeason?.name ?? '',
        season_id: dm.season_id,
        school_id: activeSeason?.school.id ?? 0,
        school_name: activeSeason?.school.name ?? '',
        system_generated: false,
        last_message: dm.last_message,
        unread_count: dm.unread_count,
      },
    });
  }


  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size="large" color="#6366F1" /></View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: bg}]}>
        <View style={styles.center}>
          <Text style={[styles.errorText, {color: ts}]}>Couldn't load your workspaces.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeSchool = uniqueSchools.find(s => s.id === activeSchoolId);

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: bg}]}>
      <View style={[styles.header, {backgroundColor: bg, borderBottomColor: bd}]}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => setSidebarOpen(true)}>
          <View style={[styles.menuLine, {backgroundColor: accent}]} />
          <View style={[styles.menuLine, {backgroundColor: accent}]} />
          <View style={[styles.menuLine, {backgroundColor: accent}]} />
        </TouchableOpacity>

        <View style={styles.headerCenter} pointerEvents="none">
          <Text style={[styles.workspaceTitle, {color: tp}]} numberOfLines={1}>
            {activeSeason ? activeSeason.sport : 'Workspace'}
          </Text>
          {activeSeason && (
            <Text style={[styles.seasonSubtitle, {color: ts}]}>{activeSeason.school_year}</Text>
          )}
        </View>
      </View>

      {contentLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={accent} /></View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {(() => {
            const regularChannels = channels.filter(c => c.channel_type !== 'family_group');
            const familyChannels  = channels.filter(c => c.channel_type === 'family_group');
            return (
              <>
                <Text style={[styles.sectionLabel, {color: ts, marginBottom: 10}]}>Channels</Text>
                {regularChannels.length === 0 ? (
                  <Text style={[styles.emptyText, {color: ts}]}>No channels in this season.</Text>
                ) : regularChannels.map(channel => (
                  <TouchableOpacity key={channel.id} style={[styles.card, {backgroundColor: sf, borderColor: bd}]} onPress={() => handleChannel(channel)} activeOpacity={0.72}>
                    <View style={[styles.iconWrap, {backgroundColor: sf}]}>
                      <Image source={channelIconSource(channel, iconVariant)} style={styles.cardIcon} resizeMode="contain" />
                    </View>
                    <View style={styles.cardBody}>
                      <View style={styles.cardTop}>
                        <Text style={[styles.cardName, {color: tp}]}>{toTitleCase(channel.name)}</Text>
                        {(channel.unread_count ?? 0) > 0 && (
                          <View style={[styles.badge, {backgroundColor: accent}]}>
                            <Text style={styles.badgeText}>{channel.unread_count}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.meta, {color: ts}]}>{channel.member_count != null ? `${channel.member_count} members` : ''}</Text>
                    </View>
                    <Text style={[styles.chevron, {color: bd}]}>›</Text>
                  </TouchableOpacity>
                ))}

                <View style={[styles.sectionRow, styles.sectionLabelSpaced]}>
                  <Text style={[styles.sectionLabel, {color: ts}]}>Direct Messages</Text>
                  <TouchableOpacity
                    style={[styles.newDmBtn, {backgroundColor: accentDark + '33', borderColor: accentDark}]}
                    onPress={() => setNewDmOpen(true)}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                    <Text style={[styles.newDmBtnText, {color: accentDark}]}>+ New</Text>
                  </TouchableOpacity>
                </View>

                {familyChannels.length > 0 && (
                  <>
                    <Text style={[styles.subLabel, {color: ts}]}>Groups</Text>
                    {familyChannels.map(channel => (
                      <TouchableOpacity key={channel.id} style={[styles.card, {backgroundColor: sf, borderColor: bd}]} onPress={() => handleChannel(channel)} activeOpacity={0.72}>
                        <View style={[styles.iconWrap, {backgroundColor: sf}]}>
                          <Image source={channelIconSource(channel, iconVariant)} style={styles.cardIcon} resizeMode="contain" />
                        </View>
                        <View style={styles.cardBody}>
                          <View style={styles.cardTop}>
                            <Text style={[styles.cardName, {color: tp}]}>{toTitleCase(channel.name)}</Text>
                            {(channel.unread_count ?? 0) > 0 && (
                              <View style={[styles.badge, {backgroundColor: accent}]}>
                                <Text style={styles.badgeText}>{channel.unread_count}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.meta, {color: ts}]}>{channel.member_count != null ? `${channel.member_count} members` : ''}</Text>
                        </View>
                        <Text style={[styles.chevron, {color: bd}]}>›</Text>
                      </TouchableOpacity>
                    ))}
                    {dms.length > 0 && <Text style={[styles.subLabel, {color: ts, marginTop: 12}]}>People</Text>}
                  </>
                )}

                {dms.length === 0 && familyChannels.length === 0 ? (
                  <Text style={[styles.emptyText, {color: ts}]}>No direct messages yet.</Text>
                ) : dms.map(dm => (
                  <TouchableOpacity key={dm.id} style={[styles.card, {backgroundColor: sf, borderColor: bd}]} onPress={() => handleDm(dm)} activeOpacity={0.72}>
                    <View style={[styles.avatarWrap, {backgroundColor: accentDark}]}>
                      <Text style={[styles.avatarText, {color: colors.color_text_on_primary}]}>
                        {dm.other_user.first_name[0]}{dm.other_user.last_name[0]}
                      </Text>
                    </View>
                    <View style={styles.cardBody}>
                      <View style={styles.cardTop}>
                        <Text style={[styles.cardName, {color: tp}]}>{dm.other_user.first_name} {dm.other_user.last_name}</Text>
                        {(dm.unread_count ?? 0) > 0 && (
                          <View style={[styles.badge, {backgroundColor: accent}]}>
                            <Text style={styles.badgeText}>{dm.unread_count}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.meta, {color: ts}]}>{dm.other_user.role?.replace(/_/g, ' ')}</Text>
                    </View>
                    <Text style={[styles.chevron, {color: bd}]}>›</Text>
                  </TouchableOpacity>
                ))}
              </>
            );
          })()}
        </ScrollView>
      )}

      <Sidebar
        visible={sidebarOpen}
        user={user}
        role={role}
        seasons={seasons}
        schools={uniqueSchools}
        activeSchoolId={activeSchoolId}
        activeSeasonId={activeSeason?.id ?? null}
        onSelectSchool={selectSchool}
        onSelectSeason={selectSeason}
        onClose={() => setSidebarOpen(false)}
        onSettings={openSettings}
      />

      {activeSeason && (
        <NewDmModal
          visible={newDmOpen}
          seasonId={activeSeason.id}
          onClose={() => setNewDmOpen(false)}
          onConversationReady={handleNewDm}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  header: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1},
  menuBtn: {gap: 5, padding: 4},
  menuLine: {width: 22, height: 2, borderRadius: 1},
  headerCenter: {position: 'absolute', left: 0, right: 0, alignItems: 'center'},
  workspaceTitle: {fontSize: 16, fontWeight: '800', letterSpacing: -0.3},
  seasonSubtitle: {fontSize: 11, marginTop: 1},
  scroll: {flex: 1},
  scrollContent: {paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40},
  sectionRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10},
  sectionLabel: {fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase'},
  sectionLabelSpaced: {marginTop: 28},
  subLabel: {fontSize: 10, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, marginTop: 4},
  newDmBtn: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1},
  newDmBtnText: {fontSize: 12, fontWeight: '700'},
  emptyText: {fontSize: 14, marginBottom: 8},
  card: {flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, gap: 6, marginBottom: 8},
  iconWrap: {width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  cardIcon: {width: 20, height: 20},
  avatarWrap: {width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center'},
  avatarText: {fontSize: 15, fontWeight: '700'},
  cardBody: {flex: 1, gap: 3},
  cardTop: {flexDirection: 'row', alignItems: 'center', gap: 8},
  cardName: {fontSize: 15, fontWeight: '700'},
  badge: {borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5},
  badgeText: {fontSize: 10, fontWeight: '700', color: '#fff'},
  meta: {fontSize: 12},
  preview: {fontSize: 13, marginTop: 1},
  chevron: {fontSize: 20, fontWeight: '300'},
  errorText: {fontSize: 14},
});
