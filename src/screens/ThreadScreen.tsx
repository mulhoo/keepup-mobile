import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  fetchThread, sendThreadReply, type Message, type Reaction,
} from '../services/messages';
import {ReactionBar, EmojiPickerSheet} from '../components/ReactionBar';
import {ProfileModal} from '../components/ProfileModal';
import {useTheme} from '../context/ThemeContext';
import {generateShades} from '../utils/colors';

const ROLE_COLORS: Record<string, string> = {
  head_coach:      '#93C5FD',
  assistant_coach: '#93C5FD',
  student_captain: '#6EE7B7',
  student:         '#7DD3FC',
  parent:          '#C4B5FD',
};
function roleColor(role: string | null | undefined): string {
  return role ? (ROLE_COLORS[role] ?? '#7DD3FC') : '#7DD3FC';
}


interface Props {
  navigation: any;
  route: any;
}

export const ThreadScreen = ({navigation, route}: Props) => {
  const {parentMessageId, channelName, currentUserId, seasonId} = route.params as {
    parentMessageId: number;
    channelName: string;
    currentUserId: number;
    seasonId: number;
  };
  const {colors} = useTheme();
  const bg   = colors.color_background;
  const sf   = colors.color_surface;
  const bd   = colors.color_border;
  const tp   = colors.color_text_primary;
  const ts   = colors.color_text_secondary;
  const acc  = colors.color_primary;
  const onAcc = colors.color_text_on_primary;

  const dmPalette = useMemo(() => generateShades(acc, 6), [acc]);
  const dmBubbleColor = useCallback((senderId: number) => dmPalette[senderId % dmPalette.length], [dmPalette]);

  const [parent, setParent] = useState<Message | null>(null);
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [pickerMessageId, setPickerMessageId] = useState<number | null>(null);
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(() => {
    fetchThread(parentMessageId)
      .then(data => { setParent(data.parent_message); setReplies(data.replies); })
      .finally(() => setLoading(false));
  }, [parentMessageId]);

  useEffect(() => { load(); }, [load]);

  function handleReactionsChange(messageId: number, updated: Reaction[]) {
    if (parent && parent.id === messageId) setParent(p => p ? {...p, reactions: updated} : p);
    setReplies(prev => prev.map(m => m.id === messageId ? {...m, reactions: updated} : m));
  }

  async function handleSend() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');
    try {
      const reply = await sendThreadReply(parentMessageId, content);
      setReplies(prev => [...prev, reply]);
      setTimeout(() => listRef.current?.scrollToEnd({animated: true}), 100);
    } finally {
      setSending(false);
    }
  }

  function renderBubble(msg: Message) {
    const isMine = msg.sender_id === currentUserId;
    return (
      <View key={msg.id} style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowTheirs]}>
        {!isMine && (
          <TouchableOpacity onPress={() => setProfileUserId(msg.sender_id)}>
            <Text style={[styles.senderName, {color: dmBubbleColor(msg.sender_id)}]}>{msg.sender}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onLongPress={() => setPickerMessageId(msg.id)}
          activeOpacity={0.85}>
          <View style={[
            styles.bubble,
            isMine
              ? {backgroundColor: acc}
              : {backgroundColor: dmBubbleColor(msg.sender_id)},
          ]}>
            <Text style={[styles.msgText, {color: isMine ? onAcc : '#FFFFFF'}]}>{msg.content}</Text>
          </View>
        </TouchableOpacity>
        {msg.reactions.length > 0 && (
          <ReactionBar messageId={msg.id} reactions={msg.reactions} onReactionsChange={handleReactionsChange} />
        )}
      </View>
    );
  }

  const ListHeader = parent ? (
    <>
      {/* original message */}
      <View style={[styles.parentCard, {backgroundColor: sf, borderColor: bd}]}>
        <Text style={[styles.parentLabel, {color: ts}]}>Original message</Text>
        <Text style={[styles.parentSender, {color: roleColor(parent.sender_role)}]}>{parent.sender}</Text>
        <Text style={[styles.parentText, {color: tp}]}>{parent.content}</Text>
        {parent.reactions.length > 0 && (
          <ReactionBar messageId={parent.id} reactions={parent.reactions} onReactionsChange={handleReactionsChange} />
        )}
      </View>

      <Text style={[styles.repliesLabel, {color: ts}]}>
        {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
      </Text>
    </>
  ) : null;

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: bg}]}>
      <View style={[styles.header, {backgroundColor: bg, borderBottomColor: bd}]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, {color: acc}]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, {color: tp}]}>Thread</Text>
          <Text style={[styles.headerSub, {color: ts}]}>#{channelName}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={acc} /></View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
          <FlatList
            ref={listRef}
            data={replies}
            keyExtractor={m => String(m.id)}
            contentContainerStyle={styles.list}
            ListHeaderComponent={ListHeader}
            renderItem={({item}) => renderBubble(item)}
            onContentSizeChange={() => listRef.current?.scrollToEnd({animated: false})}
          />
          <View style={[styles.inputRow, {backgroundColor: bg, borderTopColor: bd}]}>
            <TextInput
              style={[styles.input, {backgroundColor: sf, borderColor: bd, color: tp}]}
              value={text}
              onChangeText={setText}
              placeholder="Reply in thread…"
              placeholderTextColor={ts}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, {backgroundColor: acc}, (!text.trim() || sending) && {backgroundColor: sf}]}
              onPress={handleSend}
              disabled={!text.trim() || sending}>
              {sending
                ? <ActivityIndicator size="small" color={onAcc} />
                : <Text style={[styles.sendBtnText, {color: onAcc}]}>↑</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      <EmojiPickerSheet
        visible={pickerMessageId !== null}
        messageId={pickerMessageId ?? 0}
        onClose={() => setPickerMessageId(null)}
        onReactionsChange={handleReactionsChange}
      />
      <ProfileModal userId={profileUserId} seasonId={seasonId} onClose={() => setProfileUserId(null)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1},
  flex: {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  header: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12},
  backBtn: {padding: 4},
  backText: {fontSize: 32, lineHeight: 36},
  headerCenter: {flex: 1},
  headerTitle: {fontSize: 16, fontWeight: '800'},
  headerSub: {fontSize: 12},
  list: {padding: 16, gap: 4, flexGrow: 1},
  parentCard: {borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 8, gap: 4},
  parentLabel: {fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8},
  parentSender: {fontSize: 13, fontWeight: '700'},
  parentText: {fontSize: 15, lineHeight: 22},
  repliesLabel: {fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12, paddingHorizontal: 4},
  msgRow: {marginBottom: 12, gap: 4},
  msgRowMine: {alignItems: 'flex-end'},
  msgRowTheirs: {alignItems: 'flex-start'},
  senderName: {fontSize: 12, fontWeight: '700', marginLeft: 4, marginBottom: 2},
  bubble: {maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10},
  msgText: {fontSize: 15, lineHeight: 21},
  inputRow: {flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, gap: 10},
  input: {flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 120, borderWidth: 1},
  sendBtn: {width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center'},
  sendBtnText: {fontSize: 20, fontWeight: '700'},
});
