import React, {useState, useEffect, useMemo} from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable,
  TouchableOpacity, FlatList, TextInput, ActivityIndicator,
} from 'react-native';
import {useTheme} from '../context/ThemeContext';
import {fetchDmStartable, findOrCreateDmConversation, type DmConversation, type DmStartableUser} from '../services/auth';

const ROLE_LABELS: Record<string, string> = {
  head_coach:        'Head Coach',
  assistant_coach:   'Asst Coach',
  student_captain:   'Captain',
  student:           'Student',
  parent:            'Parent',
  athletic_director: 'AD',
};

interface Props {
  visible: boolean;
  seasonId: number;
  onClose: () => void;
  onConversationReady: (conv: DmConversation) => void;
}

export const NewDmModal = ({visible, seasonId, onClose, onConversationReady}: Props) => {
  const {colors} = useTheme();
  const bg  = colors.color_background;
  const sf  = colors.color_surface;
  const bd  = colors.color_border;
  const tp  = colors.color_text_primary;
  const ts  = colors.color_text_secondary;
  const acc = colors.color_primary;

  const [users, setUsers]     = useState<DmStartableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery]     = useState('');
  const [starting, setStarting] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) { setUsers([]); setQuery(''); return; }
    setLoading(true);
    fetchDmStartable(seasonId)
      .then(setUsers)
      .catch(e => console.error('fetchDmStartable failed:', e?.response?.data ?? e?.message))
      .finally(() => setLoading(false));
  }, [visible, seasonId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return users.filter(u => u.name.toLowerCase().includes(q));
  }, [users, query]);

  async function handleSelect(user: DmStartableUser) {
    setStarting(user.id);
    try {
      const conv = await findOrCreateDmConversation(seasonId, user.id);
      onConversationReady(conv);
      onClose();
    } catch {}
    finally { setStarting(null); }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, {backgroundColor: sf, borderColor: bd}]} onPress={() => {}}>

          <View style={styles.header}>
            <Text style={[styles.title, {color: tp}]}>New Message</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
              <Text style={[styles.closeBtn, {color: ts}]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.searchWrap, {backgroundColor: bg, borderColor: bd}]}>
            <Text style={[styles.searchIcon, {color: ts}]}>⌕</Text>
            <TextInput
              style={[styles.searchInput, {color: tp}]}
              placeholder="Search people..."
              placeholderTextColor={ts}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
          </View>

          {loading ? (
            <ActivityIndicator color={acc} style={styles.spinner} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={u => String(u.id)}
              style={styles.list}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[styles.row, {borderBottomColor: bd}]}
                  onPress={() => handleSelect(item)}
                  disabled={starting === item.id}
                  activeOpacity={0.7}>
                  <View style={[styles.avatar, {backgroundColor: acc + '33'}]}>
                    <Text style={[styles.avatarText, {color: acc}]}>
                      {item.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={[styles.name, {color: tp}]}>{item.name}</Text>
                    {item.role && (
                      <Text style={[styles.role, {color: ts}]}>
                        {ROLE_LABELS[item.role] ?? item.role.replace(/_/g, ' ')}
                      </Text>
                    )}
                  </View>
                  {starting === item.id
                    ? <ActivityIndicator size="small" color={acc} />
                    : <Text style={[styles.chevron, {color: bd}]}>›</Text>}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.empty, {color: ts}]}>
                  {query.trim() ? 'No matches.' : 'Type a name to search.'}
                </Text>
              }
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24},
  card: {width: '100%', maxWidth: 380, borderRadius: 20, borderWidth: 1, overflow: 'hidden', maxHeight: '80%'},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12},
  title: {fontSize: 16, fontWeight: '700'},
  closeBtn: {fontSize: 16},
  searchWrap: {flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, height: 38},
  searchIcon: {fontSize: 18, marginRight: 6},
  searchInput: {flex: 1, fontSize: 14, paddingVertical: 0},
  spinner: {paddingVertical: 40},
  list: {maxHeight: 360},
  empty: {fontSize: 14, textAlign: 'center', paddingVertical: 32},
  row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth},
  avatar: {width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center'},
  avatarText: {fontSize: 13, fontWeight: '700'},
  info: {flex: 1, gap: 2},
  name: {fontSize: 14, fontWeight: '600'},
  role: {fontSize: 12},
  chevron: {fontSize: 20, fontWeight: '300'},
});
