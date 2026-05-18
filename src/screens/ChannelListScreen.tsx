import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import {fetchChannels, logout, type Channel, type DemoRole} from '../services/auth';
import {toTitleCase} from '../utils/strings';

const SPORT_ICONS: Array<[string, string]> = [
  ['swim', '🏊'],
  ['soccer', '⚽'],
  ['football', '🏈'],
  ['basketball', '🏀'],
  ['baseball', '⚾'],
  ['softball', '🥎'],
  ['volleyball', '🏐'],
  ['tennis', '🎾'],
  ['track', '🏃'],
  ['cross', '🏃'],
  ['lacrosse', '🥍'],
  ['hockey', '🏒'],
  ['wrestling', '🤼'],
  ['golf', '⛳'],
  ['gymnastics', '🤸'],
];

const ROLE_COLOR: Record<string, string> = {
  student: '#2563EB',
  student_captain: '#7C3AED',
  head_coach: '#16A34A',
  parent: '#EA580C',
};

function sportIcon(sport: string): string {
  const lower = sport.toLowerCase();
  for (const [key, icon] of SPORT_ICONS) {
    if (lower.includes(key)) return icon;
  }
  return '🏆';
}

export const ChannelListScreen = ({navigation, route}: any) => {
  const {role, user} = route.params as {role: DemoRole; user: {id: number; first_name: string}};
  const roleColor = ROLE_COLOR[role] ?? '#6366F1';

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetchChannels()
      .then(setChannels)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleChannel(channel: Channel) {
    navigation.navigate('Chat', {role, user, channel});
  }

  async function handleSwitchProfile() {
    await logout();
    navigation.reset('RoleSelect');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hey, {user.first_name}</Text>
          <Text style={styles.subGreeting}>Your channels this season</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.rolePill, {borderColor: roleColor + '55'}]}>
            <View style={[styles.roleDot, {backgroundColor: roleColor}]} />
            <Text style={[styles.rolePillText, {color: roleColor}]}>
              {role.replace(/_/g, ' ')}
            </Text>
          </View>
          <TouchableOpacity onPress={handleSwitchProfile} style={styles.switchBtn}>
            <Text style={styles.switchBtnText}>Switch</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Couldn't load channels.</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={channels}
          keyExtractor={c => String(c.id)}
          contentContainerStyle={styles.list}
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleChannel(item)}
              activeOpacity={0.72}>
              <View style={styles.iconWrap}>
                <Text style={styles.sportIcon}>{sportIcon(item.sport)}</Text>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.channelName}>#{toTitleCase(item.name)}</Text>
                  {(item.unread_count ?? 0) > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unread_count}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.meta}>
                  {item.sport}{item.season ? ` · ${item.season}` : ''}
                  {item.member_count != null ? ` · ${item.member_count} members` : ''}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No channels yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#0F172A'},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerLeft: {gap: 3},
  greeting: {fontSize: 20, fontWeight: '800', color: '#F8FAFC', letterSpacing: -0.3},
  subGreeting: {fontSize: 12, color: '#64748B'},
  headerRight: {flexDirection: 'row', alignItems: 'center', gap: 10},
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleDot: {width: 6, height: 6, borderRadius: 3},
  rolePillText: {fontSize: 11, fontWeight: '600', textTransform: 'capitalize'},
  switchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  switchBtnText: {fontSize: 13, color: '#6366F1', fontWeight: '600'},

  list: {paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 10},

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 14,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportIcon: {fontSize: 24},
  cardBody: {flex: 1, gap: 3},
  cardTop: {flexDirection: 'row', alignItems: 'center', gap: 8},
  channelName: {fontSize: 15, fontWeight: '700', color: '#F8FAFC'},
  badge: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {fontSize: 10, fontWeight: '700', color: '#fff'},
  meta: {fontSize: 12, color: '#64748B'},
chevron: {fontSize: 20, color: '#334155', fontWeight: '300'},

  errorText: {fontSize: 14, color: '#94A3B8'},
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  retryText: {fontSize: 14, color: '#6366F1', fontWeight: '600'},
  emptyText: {fontSize: 14, color: '#475569', marginTop: 60},
});
