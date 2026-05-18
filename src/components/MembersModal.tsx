import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable,
  TouchableOpacity, ScrollView, ActivityIndicator, Dimensions,
} from 'react-native';

const SCROLL_MAX_HEIGHT = Dimensions.get('window').height * 0.55;
import {useTheme} from '../context/ThemeContext';
import {
  fetchChannelMembers, addChannelMember,
  type ChannelMember, type ChannelMembersData,
} from '../services/messages';

const ROLE_LABELS: Record<string, string> = {
  head_coach:      'Head Coach',
  assistant_coach: 'Asst Coach',
  student_captain: 'Captain',
  student:         'Student',
  parent:          'Parent',
  athletic_director: 'AD',
};

const ROLE_COLORS: Record<string, string> = {
  head_coach:        '#93C5FD',
  assistant_coach:   '#93C5FD',
  student_captain:   '#6EE7B7',
  student:           '#7DD3FC',
  parent:            '#C4B5FD',
  athletic_director: '#FCD34D',
};

function roleColor(role: string | null): string {
  return role ? (ROLE_COLORS[role] ?? '#94A3B8') : '#94A3B8';
}

interface Props {
  visible: boolean;
  channelId: number;
  canManage: boolean;
  onClose: () => void;
}

export const MembersModal = ({visible, channelId, canManage, onClose}: Props) => {
  const {colors} = useTheme();
  const bg  = colors.color_background;
  const sf  = colors.color_surface;
  const bd  = colors.color_border;
  const tp  = colors.color_text_primary;
  const ts  = colors.color_text_secondary;
  const acc = colors.color_primary;

  const [data, setData] = useState<ChannelMembersData | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [showAddable, setShowAddable] = useState(false);

  useEffect(() => {
    if (!visible) { setData(null); setShowAddable(false); return; }
    setLoading(true);
    fetchChannelMembers(channelId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, channelId]);

  async function handleAdd(user: ChannelMember) {
    setAdding(user.id);
    try {
      await addChannelMember(channelId, user.id);
      // Refetch — enrollment is multi-channel, so the members list may differ from addable
      const fresh = await fetchChannelMembers(channelId);
      setData(fresh);
      setShowAddable(false);
    } catch {}
    finally { setAdding(null); }
  }

  const list = showAddable ? (data?.addable ?? []) : (data?.members ?? []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.card, {backgroundColor: sf, borderColor: bd}]} onStartShouldSetResponder={() => true}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTabs}>
              <TouchableOpacity
                style={[styles.tab, !showAddable && {borderBottomColor: acc, borderBottomWidth: 2}]}
                onPress={() => setShowAddable(false)}>
                <Text style={[styles.tabText, {color: !showAddable ? acc : ts}]}>
                  Members{data ? ` (${data.members.length})` : ''}
                </Text>
              </TouchableOpacity>
              {canManage && (
                <TouchableOpacity
                  style={[styles.tab, showAddable && {borderBottomColor: acc, borderBottomWidth: 2}]}
                  onPress={() => setShowAddable(true)}>
                  <Text style={[styles.tabText, {color: showAddable ? acc : ts}]}>
                    Add{data?.addable ? ` (${data.addable.length})` : ''}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
              <Text style={[styles.closeBtn, {color: ts}]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          {loading ? (
            <ActivityIndicator color={acc} style={styles.spinner} />
          ) : (
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {list.length === 0 ? (
                <Text style={[styles.empty, {color: ts}]}>
                  {showAddable ? 'Everyone in the season is already a member.' : 'No members yet.'}
                </Text>
              ) : list.map(member => (
                <View key={member.id} style={[styles.row, {borderBottomColor: bd}]}>
                  <View style={[styles.avatar, {backgroundColor: acc + '33'}]}>
                    <Text style={[styles.avatarText, {color: acc}]}>
                      {member.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={[styles.name, {color: tp}]}>{member.name}</Text>
                    {member.role && (
                      <Text style={[styles.role, {color: roleColor(member.role)}]}>
                        {ROLE_LABELS[member.role] ?? member.role.replace(/_/g, ' ')}
                      </Text>
                    )}
                  </View>
                  {showAddable && (
                    <TouchableOpacity
                      style={[styles.addBtn, {backgroundColor: acc}]}
                      onPress={() => handleAdd(member)}
                      disabled={adding === member.id}>
                      {adding === member.id
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.addBtnText}>+ Add</Text>}
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24},
  card: {width: '100%', maxWidth: 360, borderRadius: 20, borderWidth: 1, overflow: 'hidden'},
  header: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 0},
  headerTabs: {flex: 1, flexDirection: 'row', gap: 16},
  tab: {paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: 'transparent'},
  tabText: {fontSize: 15, fontWeight: '700'},
  closeBtn: {fontSize: 16, paddingBottom: 12},
  spinner: {paddingVertical: 40},
  scroll: {maxHeight: SCROLL_MAX_HEIGHT},
  empty: {fontSize: 14, textAlign: 'center', paddingVertical: 32, paddingHorizontal: 16},
  row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth},
  avatar: {width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center'},
  avatarText: {fontSize: 13, fontWeight: '700'},
  info: {flex: 1, gap: 2},
  name: {fontSize: 14, fontWeight: '600'},
  role: {fontSize: 12},
  addBtn: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, minWidth: 60, alignItems: 'center'},
  addBtnText: {fontSize: 13, fontWeight: '700', color: '#fff'},
});
