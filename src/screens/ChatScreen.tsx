import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Modal, Pressable, Image, Animated,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  fetchMessages, sendMessage, toggleReaction, reportMessage, removeMessage,
  translateMessage, TranslationUnavailableError,
  ensureModelLoaded, subscribeToModelState, getModelLoadState,
  type Message, type ModerationTier, type Reaction, type ReplyPreview,
} from '../services/messages';
import {api} from '../services/api';
import {type Channel, markChannelRead, markDmRead, leaveChannel} from '../services/auth';
import {ReactionBar, EmojiPickerSheet} from '../components/ReactionBar';
import {ProfileModal} from '../components/ProfileModal';
import {MembersModal} from '../components/MembersModal';
import {useTheme} from '../context/ThemeContext';
import {generateShades} from '../utils/colors';
import {toTitleCase} from '../utils/strings';


const ICONS = {
  black: {
    emoji:     require('../../assets/icons/black/btn-emoji-black.png'),
    thread:    require('../../assets/icons/black/btn-thread-black.png'),
    reply:     require('../../assets/icons/black/btn-reply-black.png'),
    flag:      require('../../assets/icons/black/btn-flag-black.png'),
    info:      require('../../assets/icons/black/info.png'),
    exit:      require('../../assets/icons/black/square-arrow-right-exit.png'),
    languages: require('../../assets/icons/black/languages.png'),
  },
  blue: {
    emoji:     require('../../assets/icons/blue/btn-emoji-blue.png'),
    thread:    require('../../assets/icons/blue/btn-thread-blue.png'),
    reply:     require('../../assets/icons/blue/btn-reply-blue.png'),
    flag:      require('../../assets/icons/blue/btn-flag-blue.png'),
    info:      require('../../assets/icons/blue/info.png'),
    exit:      require('../../assets/icons/blue/square-arrow-right-exit.png'),
    languages: require('../../assets/icons/blue/languages.png'),
  },
  white: {
    emoji:     require('../../assets/icons/white/btn-emoji-white.png'),
    thread:    require('../../assets/icons/white/btn-thread-white.png'),
    reply:     require('../../assets/icons/white/btn-reply-white.png'),
    flag:      require('../../assets/icons/white/btn-flag-white.png'),
    info:      require('../../assets/icons/white/info.png'),
    exit:      require('../../assets/icons/white/square-arrow-right-exit.png'),
    languages: require('../../assets/icons/white/languages.png'),
  },
  navy: {
    emoji:     require('../../assets/icons/navy/btn-emoji-blue.png'),
    thread:    require('../../assets/icons/navy/btn-thread-blue.png'),
    reply:     require('../../assets/icons/navy/btn-reply-blue.png'),
    flag:      require('../../assets/icons/navy/btn-flag-blue.png'),
    info:      require('../../assets/icons/navy/info.png'),
    exit:      require('../../assets/icons/navy/square-arrow-right-exit.png'),
    languages: require('../../assets/icons/navy/languages.png'),
  },
};

function isBlueHue(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return false;
  let h = 0;
  if (max === r)      h = ((g - b) / (max - min) + 6) % 6;
  else if (max === g) h = (b - r) / (max - min) + 2;
  else                h = (r - g) / (max - min) + 4;
  h = h * 60;
  return h >= 190 && h <= 280;
}

const ROLE_COLORS: Record<string, string> = {
  head_coach:      '#93C5FD',
  assistant_coach: '#93C5FD',
  student_captain: '#6EE7B7',
  student:         '#7DD3FC',
  parent:          '#C4B5FD',
};

function roleColor(role: string | null): string {
  return role ? (ROLE_COLORS[role] ?? '#7DD3FC') : '#7DD3FC';
}



function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  const month = d.toLocaleString('en-US', {month: 'short'});
  return `${h % 12 || 12}:${m} ${period} · ${month} ${d.getDate()}`;
}


interface LocalMessage extends Message {
  tier?: ModerationTier;
}

function SpinningIcon({source, style}: {source: any; style: any}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {toValue: 1, duration: 1000, useNativeDriver: true}),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return (
    <Animated.Image
      source={source}
      style={[style, {transform: [{rotate: anim.interpolate({inputRange: [0, 1], outputRange: ['0deg', '360deg']})}]}]}
    />
  );
}

export const ChatScreen = ({navigation, route}: any) => {
  const {role, user, channel} = route.params as {
    role: string;
    user: {id: number; first_name: string};
    channel: Channel;
  };
  const {colors, theme} = useTheme();
  const isDark    = theme.variant === 'dark';
  const iconSet   = isBlueHue(colors.color_primary) ? 'blue' : !isDark ? 'black' : 'white';
  const icons     = ICONS[iconSet as keyof typeof ICONS];
  const iconBg    = iconSet === 'white' ? '#000000' : (iconSet === 'blue' && isDark) ? '#162B5C' : '#FFFFFF';
  const bg  = colors.color_background;
  const sf  = colors.color_surface;
  const bd  = colors.color_border;
  const tp  = colors.color_text_primary;
  const ts  = colors.color_text_secondary;
  const acc = colors.color_primary;
  const onAcc = colors.color_text_on_primary;

  const dmPalette = useMemo(() => generateShades(acc, 6), [acc]);
  const dmBubbleColor = useCallback((senderId: number) => dmPalette[senderId % dmPalette.length], [dmPalette]);

  const [messages, setMessages]       = useState<LocalMessage[]>([]);
  const [text, setText]               = useState('');
  const [sending, setSending]         = useState(false);
  const [analyzing, setAnalyzing]     = useState(false);
  const [pickerMsgId, setPickerMsgId] = useState<number | null>(null);
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const [reportMsg, setReportMsg]     = useState<LocalMessage | null>(null);
  const [reportNotes, setReportNotes] = useState('');
  const [reporting, setReporting]     = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyPreview | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [activeMsgId, setActiveMsgId] = useState<number | null>(null);
  const [coachActionMsg, setCoachActionMsg] = useState<LocalMessage | null>(null);
  const [showRemoveOptions, setShowRemoveOptions] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoAnchor, setInfoAnchor] = useState<{top: number; left: number}>({top: 0, left: 0});
  const [preferredLanguage, setPreferredLanguage] = useState('');
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [translating, setTranslating] = useState<Record<number, boolean>>({});
  const [onDeviceModelState, setOnDeviceModelState] = useState(getModelLoadState);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [analyzingDots, setAnalyzingDots] = useState('');
  const [sendResult, setSendResult] = useState<'success' | null>(null);
  const sendResultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const infoIconRef = useRef<TouchableOpacity>(null);
  const listRef = useRef<FlatList>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isStudent = role === 'student';
  const isCoach   = role === 'head_coach' || role === 'assistant_coach' || role === 'athletic_director';

  useEffect(() => {
    if (channel.channel_type === 'dm') {
      markDmRead(channel.id).catch(() => {});
    } else {
      markChannelRead(channel.id).catch(() => {});
    }
  }, [channel.id, channel.channel_type]);

  useEffect(() => {
    fetchMessages(channel.id, channel.channel_type)
      .then(msgs => setMessages(msgs.map(m => ({...m, tier: tierFromAction(m.flag_action)}))))
      .catch(err => console.error('[ChatScreen] fetchMessages error:', err?.response?.data ?? err?.message));
  }, [channel.id]);

  useEffect(() => {
    api.get<{preferred_language?: string | null}>('/demo/me')
      .then(me => setPreferredLanguage(me.preferred_language ?? ''))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!analyzing && !sending) { setAnalyzingDots(''); return; }
    const id = setInterval(() => setAnalyzingDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(id);
  }, [analyzing, sending]);

  useEffect(() => {
    if (!analyzing && !sending) { spinAnim.setValue(0); return; }
    const loop = Animated.loop(
      Animated.timing(spinAnim, {toValue: 1, duration: 1200, useNativeDriver: true}),
    );
    loop.start();
    return () => loop.stop();
  }, [analyzing, sending, spinAnim]);

  useEffect(() => {
    return () => { if (sendResultTimer.current) clearTimeout(sendResultTimer.current); };
  }, []);

  // Subscribe to on-device model load state and pre-warm if any on_device messages exist
  useEffect(() => {
    const unsub = subscribeToModelState(state => setOnDeviceModelState(state));
    return unsub;
  }, []);

  useEffect(() => {
    const hasOnDevice = messages.some(m => m.translation_path === 'on_device');
    if (hasOnDevice && preferredLanguage.trim() && getModelLoadState() === 'idle') {
      ensureModelLoaded().catch(() => {});
    }
  }, [messages, preferredLanguage]);

  useEffect(() => {
    const id = setInterval(() => {
      fetchMessages(channel.id, channel.channel_type)
        .then(msgs => {
          setMessages(prev => {
            const incomingMap = new Map(msgs.map(m => [m.id, {...m, tier: tierFromAction(m.flag_action)}]));
            const updated = prev.map(m => {
              const incoming = incomingMap.get(m.id);
              // Guard: don't revert a locally-removed message if the server hasn't committed yet
              if (m.flag_action === 'removed' && incoming && incoming.flag_action !== 'removed') return m;
              return incoming ?? m;
            });
            const prevIds = new Set(prev.map(m => m.id));
            msgs.forEach(m => { if (!prevIds.has(m.id)) updated.push({...m, tier: tierFromAction(m.flag_action)}); });
            return updated;
          });
        })
        .catch(err => console.error('[ChatScreen] poll error:', err?.response?.data ?? err?.message));
    }, 5000);
    return () => clearInterval(id);
  }, [channel.id]);

  function tierFromAction(action: string | null): ModerationTier {
    if (action === 'blocked') return 'severe';
    if (action === 'held') return 'questionable';
    return 'clear';
  }

  function handleReactionsChange(messageId: number, updated: Reaction[]) {
    setMessages(prev => prev.map(m => m.id === messageId ? {...m, reactions: updated} : m));
  }

  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content || sending) return;
    const replyToId = replyTo?.id;
    setReplyTo(null);
    setText('');
    setSending(true);
    try {
      const result = await sendMessage(channel.id, content, channel.channel_type, replyToId);
      const tier = result.moderation.tier;
      setMessages(prev => [...prev, {...result.message, content: result.message.content ?? content, tier}]);
      setTimeout(() => listRef.current?.scrollToOffset({offset: 0, animated: true}), 100);
      if (result.message.flag_action === 'blocked') {
        Alert.alert(
          'Message blocked',
          'Your message was flagged as inappropriate and was not delivered to others.',
        );
      } else if (tier === 'questionable') {
        showToast('Your message was flagged for coach review', 5000);
      } else {
        setSendResult('success');
        if (sendResultTimer.current) clearTimeout(sendResultTimer.current);
        sendResultTimer.current = setTimeout(() => { setSendResult(null); sendResultTimer.current = null; }, 2500);
      }
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.moderated) {
        Alert.alert(
          'Could not send',
          data.reason ?? 'Your message was flagged as inappropriate. Please revise before sending.',
        );
      } else {
        Alert.alert('Could not send', 'Something went wrong. Please try again.');
      }
    } finally {
      setSending(false);
    }
  }, [text, channel, sending, isStudent, replyTo]);

  function openThread(msg: LocalMessage) {
    navigation.push('Thread', {
      parentMessageId: msg.id,
      channelName: toTitleCase(channel.name),
      currentUserId: user.id,
      seasonId: channel.season_id,
      role,
    });
  }

  async function handleReport() {
    if (!reportMsg || reporting) return;
    const msg   = reportMsg;
    const notes = reportNotes.trim();
    setReportMsg(null);
    setReportNotes('');
    setReporting(true);
    try {
      await reportMessage(msg.id, notes, channel.channel_type, channel.id);
    } catch {}
    setReporting(false);
    Alert.alert('Reported', 'Thank you. A coach or admin will review this message.');
  }

  async function handleRemove(removeThread: boolean) {
    if (!coachActionMsg || removing) return;
    const msg = coachActionMsg;
    setCoachActionMsg(null);
    setShowRemoveOptions(false);
    setRemoving(true);

    const applyRemoval = (msgs: LocalMessage[]) => msgs.map(m => {
      if (m.id === msg.id) return {...m, flag_action: 'removed', content: null};
      if (removeThread && m.reply_to?.id === msg.id) return {...m, flag_action: 'removed', content: null};
      return m;
    });

    setMessages(prev => applyRemoval(prev));

    try {
      await removeMessage(msg.id, removeThread);
    } catch {
      setMessages(prev => prev.map(m => {
        if (m.id === msg.id) return {...m, flag_action: msg.flag_action, content: msg.content};
        if (removeThread && m.reply_to?.id === msg.id) return {...m, flag_action: msg.flag_action, content: msg.content};
        return m;
      }));
      Alert.alert('Error', 'Could not remove the message. Please try again.');
    } finally {
      setRemoving(false);
    }
  }

  function showToast(msg: string, duration = 3000) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => { setToastMsg(null); toastTimer.current = null; }, duration);
  }

  async function handleTranslate(messageId: number) {
    const msg = messages.find(m => m.id === messageId);
    if (!msg || !preferredLanguage.trim()) return;
    setTranslating(prev => ({...prev, [messageId]: true}));
    try {
      const result = await translateMessage(messageId, msg, preferredLanguage.trim());
      setTranslations(prev => ({...prev, [messageId]: result.translated_text}));
    } catch (err) {
      showToast('Currently unable to translate. Try again later.');
    } finally {
      setTranslating(prev => ({...prev, [messageId]: false}));
    }
  }

  const isDm     = channel.channel_type === 'dm';
  const canLeave = !isDm && !channel.system_generated && (channel.channel_type === 'conversation' || channel.channel_type === 'broadcast');

  async function handleLeave() {
    Alert.alert(
      'Leave channel',
      `Leave #${toTitleCase(channel.name)}? You can rejoin later if a coach adds you back.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Leave', style: 'destructive', onPress: async () => {
          try {
            await leaveChannel(channel.id);
            navigation.replace('ChannelList', {role, user, restoreSeasonId: channel.season_id});
          } catch {
            Alert.alert('Error', 'Could not leave the channel. Please try again.');
          }
        }},
      ],
    );
  }

  const renderMessage = ({item}: {item: LocalMessage}) => {
    const isMine    = item.sender_id === user.id;
    const isRemoved = item.flag_action === 'removed';
    const isPending = isMine && item.flag_action === 'held';
    const isCleared = isMine && item.flagged && !item.flag_action && !isRemoved;

    if (isDm) {
      const isActive = activeMsgId === item.id;
      // ── iMessage-style bubble layout ────────────────────────────────────────
      return (
        <Pressable
          onLongPress={() => !isRemoved && setActiveMsgId(item.id)}
          onPress={() => activeMsgId !== null && setActiveMsgId(null)}
          delayLongPress={350}>
          <View style={[styles.dmRow, isMine ? styles.dmRowMine : styles.dmRowTheirs]}>
            {!isMine && (
              <View style={styles.dmSenderRow}>
                <Text style={[styles.dmSender, {color: dmBubbleColor(item.sender_id)}]}>{item.sender}</Text>
                {item.sender_pronouns ? (
                  <Text style={[styles.pronouns, {color: ts}]}>{item.sender_pronouns}</Text>
                ) : null}
              </View>
            )}
            <View style={styles.dmBubbleWrap}>
              {isRemoved ? (
                <View style={styles.blockedBubble}>
                  <Text style={styles.blockedIcon}>🛑</Text>
                  <Text style={styles.blockedMsg}>This message has been flagged as inappropriate and removed</Text>
                </View>
              ) : (
                <>
                  {item.reply_to && (
                    <View style={[styles.dmReplyQuote, isMine
                      ? {borderLeftColor: onAcc, backgroundColor: 'rgba(255,255,255,0.15)'}
                      : {borderLeftColor: dmBubbleColor(item.sender_id), backgroundColor: 'rgba(0,0,0,0.07)'}]}>
                      <Text style={[styles.replyQuoteSender, {color: isMine ? onAcc : dmBubbleColor(item.sender_id)}]}>{item.reply_to.sender}</Text>
                      <Text style={[styles.replyQuoteText, {color: isMine ? onAcc : ts}]} numberOfLines={1}>{item.reply_to.content}</Text>
                    </View>
                  )}
                  <View style={[
                    styles.dmBubble,
                    isMine ? {backgroundColor: acc} : {backgroundColor: dmBubbleColor(item.sender_id)},
                  ]}>
                    <Text style={[styles.dmText, {color: isMine ? onAcc : '#FFFFFF'}]}>
                      {item.content ?? ''}
                    </Text>
                    {isActive && (
                      <View style={[styles.floatingActions, isMine ? styles.floatingActionsLeft : styles.floatingActionsRight, {backgroundColor: sf, borderColor: bd}]}>
                        <TouchableOpacity onPress={() => { setPickerMsgId(item.id); setActiveMsgId(null); }}>
                          <View style={[styles.dmActionBtn, {backgroundColor: iconBg}]}>
                            <Image source={icons.emoji} style={styles.dmActionIcon} />
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setReplyTo({id: item.id, sender: item.sender, content: item.content ?? ''}); setActiveMsgId(null); }}>
                          <View style={[styles.dmActionBtn, {backgroundColor: iconBg}]}>
                            <Image source={icons.reply} style={styles.dmActionIcon} />
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { isCoach ? setCoachActionMsg(item) : setReportMsg(item); setActiveMsgId(null); }}>
                          <View style={[styles.dmActionBtn, {backgroundColor: iconBg}]}>
                            <Image source={icons.flag} style={styles.dmActionIcon} />
                          </View>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  <ReactionBar messageId={item.id} reactions={item.reactions ?? []} onReactionsChange={handleReactionsChange} maxVisible={2} />
                  {item.reply_count > 0 && (
                    <TouchableOpacity
                      onPress={() => openThread(item)}
                      style={[styles.threadPill, {backgroundColor: acc + '18', borderColor: acc + '40'}]}
                      activeOpacity={0.7}>
                      <Text style={[styles.threadPillCount, {color: acc}]}>
                        {`${item.reply_count} ${item.reply_count === 1 ? 'reply' : 'replies'}`}
                      </Text>
                      <Text style={[styles.threadPillChevron, {color: acc}]}>›</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
            <Text style={[styles.dmTime, {color: ts}, isMine && styles.dmTimeMine]}>{formatTime(item.created_at)}</Text>
          </View>
        </Pressable>
      );
    }

    // ── Slack-style full-width row with content box ──────────────────────────
    const isActive = activeMsgId === item.id;
    return (
      <Pressable
        onLongPress={() => !isRemoved && setActiveMsgId(item.id)}
        onPress={() => activeMsgId !== null && setActiveMsgId(null)}
        delayLongPress={350}>
        <View style={[styles.msgRow, {borderBottomColor: bd}, isActive && {backgroundColor: sf + '88'}]}>
          <View style={styles.msgHeader}>
            <TouchableOpacity onPress={() => setProfileUserId(item.sender_id)}>
              <Text style={[styles.senderName, {color: roleColor(item.sender_role)}]}>{item.sender}</Text>
            </TouchableOpacity>
            {item.sender_pronouns ? (
              <Text style={[styles.pronouns, {color: ts}]}>{item.sender_pronouns}</Text>
            ) : null}
            <Text style={[styles.timestamp, {color: ts}]}>{formatTime(item.created_at)}</Text>
            {isPending && <Text style={[styles.flagIcon, {color: '#EAB308'}]}>⚑</Text>}
            {isCleared && <Text style={[styles.flagIcon, {color: '#22C55E'}]}>⚑</Text>}
            {item.translation_path && preferredLanguage.trim() && (
              <TouchableOpacity
                onPress={() => {
                  if (translations[item.id]) return;
                  if (item.translation_path === 'on_device' && onDeviceModelState === 'idle') {
                    ensureModelLoaded().catch(() => {});
                    showToast('Loading Gemma 4 on-device model…');
                    return;
                  }
                  handleTranslate(item.id);
                }}
                disabled={!!translating[item.id] || (item.translation_path === 'on_device' && onDeviceModelState === 'loading')}
                style={styles.translateHeaderBtn}
                hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
                {translating[item.id] || (item.translation_path === 'on_device' && onDeviceModelState === 'loading' && !translations[item.id])
                  ? <SpinningIcon source={icons.languages} style={[styles.translateIcon, {tintColor: ts}]} />
                  : <Image source={icons.languages} style={[styles.translateIcon, {tintColor: translations[item.id] ? acc : (item.translation_path === 'on_device' ? '#A78BFA' : ts)}]} />}
              </TouchableOpacity>
            )}
          </View>
          {isRemoved ? (
            <View style={styles.blockedBox}>
              <Text style={styles.blockedIcon}>🛑</Text>
              <Text style={styles.blockedMsg}>This message has been flagged as inappropriate and removed</Text>
            </View>
          ) : (
            <>
              <View style={[styles.msgBox, {backgroundColor: sf, borderColor: bd}]}>
                <Text style={[styles.msgContent, {color: tp}]}>
                  {item.content ?? ''}
                </Text>
                {isActive && (
                  <View style={[styles.floatingActions, styles.floatingActionsRight, {backgroundColor: sf, borderColor: bd}]}>
                    <TouchableOpacity onPress={() => { setPickerMsgId(item.id); setActiveMsgId(null); }}>
                      <View style={[styles.actionBtn, {backgroundColor: iconBg}]}>
                        <Image source={icons.emoji} style={styles.actionIcon} />
                      </View>
                    </TouchableOpacity>
                    <View>
                      <TouchableOpacity onPress={() => { openThread(item); setActiveMsgId(null); }}>
                        <View style={[styles.actionBtn, {backgroundColor: iconBg}]}>
                          <Image source={icons.thread} style={styles.actionIcon} />
                        </View>
                      </TouchableOpacity>
                      {item.reply_count > 0 && (
                        <View style={[styles.replyDot, {backgroundColor: acc, borderColor: bg}]} />
                      )}
                    </View>
                    <TouchableOpacity onPress={() => { isCoach ? setCoachActionMsg(item) : setReportMsg(item); setActiveMsgId(null); }}>
                      <View style={[styles.actionBtn, {backgroundColor: iconBg}]}>
                        <Image source={icons.flag} style={styles.actionIcon} />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              {translations[item.id] ? (
                <View style={[styles.translationBox, {borderLeftColor: acc, backgroundColor: acc + '12'}]}>
                  <Text style={[styles.translationLabel, {color: acc}]}>🌐</Text>
                  <Text style={[styles.translationText, {color: tp}]}>{translations[item.id]}</Text>
                </View>
              ) : null}
              <View style={styles.msgActionsRow}>
                <View style={styles.reactionsInlineWrap}>
                  <ReactionBar messageId={item.id} reactions={item.reactions ?? []} onReactionsChange={handleReactionsChange} maxVisible={3} />
                </View>
                {item.reply_count > 0 && (
                  <TouchableOpacity onPress={() => openThread(item)} activeOpacity={0.6}>
                    <Text style={[styles.threadReplyText, {color: ts}]}>
                      {`${item.reply_count} ${item.reply_count === 1 ? 'reply' : 'replies'} ›`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
          {isRemoved && item.reply_count > 0 && (
            <TouchableOpacity onPress={() => openThread(item)} activeOpacity={0.6} style={styles.replyCountRight}>
              <Text style={[styles.threadReplyText, {color: ts}]}>
                {`${item.reply_count} ${item.reply_count === 1 ? 'reply' : 'replies'} ›`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: bg}]}>
      <View style={[styles.header, {backgroundColor: bg, borderBottomColor: bd}]}>
        <TouchableOpacity onPress={() => navigation.replace('ChannelList', {role, user, restoreSeasonId: channel.season_id})} style={styles.backBtn}>
          <Text style={[styles.backText, {color: acc}]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.channelName, {color: tp}]}>{channel?.name ? toTitleCase(channel.name) : '...'}</Text>
            {!isDm && (
              <TouchableOpacity
                ref={infoIconRef}
                onPress={() => {
                  infoIconRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
                    setInfoAnchor({top: pageY + height + 6, left: pageX});
                    setInfoOpen(true);
                  });
                }}
                style={styles.infoBtn}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Image source={icons.info} style={[styles.infoIcon, {tintColor: ts}]} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.channelSport, {color: ts}]}>{channel?.sport}</Text>
        </View>
        {!isDm && (
          <TouchableOpacity onPress={() => setMembersOpen(true)} style={styles.membersBtn}>
            <Text style={[styles.membersBtnText, {color: ts}]}>
              {channel.member_count != null ? channel.member_count : ''}
            </Text>
            <Text style={[styles.membersBtnIcon, {color: ts}]}>people</Text>
          </TouchableOpacity>
        )}
      </View>

      {toastMsg ? (
        <View style={styles.toastBanner}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={[...messages].reverse()}
          keyExtractor={m => String(m.id)}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          inverted
          ListEmptyComponent={<Text style={[styles.emptyText, {color: ts}]}>No messages yet. Say something!</Text>}
        />

        {(analyzing || sending || sendResult) && (
          <View style={[
            styles.analyzingBar,
            sendResult === 'success'
              ? {backgroundColor: 'rgba(22,101,52,0.15)', borderTopColor: 'rgba(22,101,52,0.4)'}
              : {backgroundColor: acc + '22', borderTopColor: acc + '55'},
          ]}>
            <Animated.Image
              source={require('../../assets/branding/keepup-icon-blwh-inverted.png')}
              style={[styles.analyzingIcon, {
                tintColor: sendResult === 'success' ? '#16a34a' : acc,
                transform: [{rotate: spinAnim.interpolate({inputRange: [0, 1], outputRange: ['0deg', '360deg']})}],
              }]}
            />
            <Text style={[styles.analyzingText, {color: sendResult === 'success' ? '#16a34a' : acc}]}>
              {sendResult === 'success' ? 'Approved ✓ Message delivered' : `Gemma reviewing your message${analyzingDots}`}
            </Text>
          </View>
        )}

        {replyTo && (
          <View style={[styles.replyBar, {backgroundColor: sf, borderTopColor: bd, borderLeftColor: acc}]}>
            <View style={styles.replyBarContent}>
              <Text style={[styles.replyBarLabel, {color: acc}]}>Replying to {replyTo.sender}</Text>
              <Text style={[styles.replyBarText, {color: ts}]} numberOfLines={1}>{replyTo.content}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyBarClose}>
              <Text style={[styles.replyBarCloseText, {color: ts}]}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.compose, {backgroundColor: bg, borderTopColor: bd}]}>
          <TextInput
            style={[styles.input, {backgroundColor: sf, borderColor: bd, color: tp}]}
            value={text}
            onChangeText={setText}
            placeholder="Message…"
            placeholderTextColor={ts}
            multiline
            maxLength={500}
            editable={!sending && !analyzing}
          />
          <TouchableOpacity
            style={[styles.sendBtn, {backgroundColor: acc}, (!text.trim() || sending || analyzing) && {backgroundColor: sf}]}
            onPress={handleSend}
            disabled={!text.trim() || sending || analyzing}>
            {sending
              ? <ActivityIndicator size="small" color={onAcc} />
              : <Text style={[styles.sendBtnText, {color: onAcc}]}>↑</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <EmojiPickerSheet
        visible={pickerMsgId !== null}
        messageId={pickerMsgId ?? 0}
        onClose={() => setPickerMsgId(null)}
        onReactionsChange={handleReactionsChange}
      />
      <ProfileModal
        userId={profileUserId}
        seasonId={channel.season_id}
        currentUserId={user.id}
        onClose={() => setProfileUserId(null)}
      />
      <MembersModal
        visible={membersOpen}
        channelId={channel.id}
        canManage={['head_coach', 'assistant_coach', 'athletic_director'].includes(role)}
        onClose={() => setMembersOpen(false)}
      />

      <Modal
        visible={coachActionMsg !== null}
        transparent
        animationType="fade"
        onRequestClose={() => { setCoachActionMsg(null); setShowRemoveOptions(false); }}>
        <Pressable style={styles.reportOverlay} onPress={() => { setCoachActionMsg(null); setShowRemoveOptions(false); }}>
          <Pressable style={[styles.reportCard, {backgroundColor: sf, borderColor: bd}]} onPress={() => {}}>
            {showRemoveOptions ? (
              <>
                <Text style={[styles.reportTitle, {color: tp}]}>What should be removed?</Text>
                <Text style={[styles.reportBody, {color: ts}]}>
                  {`This message has ${coachActionMsg?.reply_count} ${coachActionMsg?.reply_count === 1 ? 'reply' : 'replies'} in its thread.`}
                </Text>

                <TouchableOpacity
                  style={[styles.coachActionBtn, styles.coachActionDanger]}
                  onPress={() => handleRemove(false)}
                  disabled={removing}>
                  {removing
                    ? <ActivityIndicator size="small" color="#fff" style={{width: 28}} />
                    : <Text style={styles.coachActionIcon}>🛑</Text>}
                  <View style={styles.coachActionText}>
                    <Text style={styles.coachActionLabelDanger}>Parent message only</Text>
                    <Text style={styles.coachActionDescDanger}>Replies stay visible in the thread</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.coachActionBtn, styles.coachActionDanger]}
                  onPress={() => handleRemove(true)}
                  disabled={removing}>
                  {removing
                    ? <ActivityIndicator size="small" color="#fff" style={{width: 28}} />
                    : <Text style={styles.coachActionIcon}>🗑️</Text>}
                  <View style={styles.coachActionText}>
                    <Text style={styles.coachActionLabelDanger}>Entire thread</Text>
                    <Text style={styles.coachActionDescDanger}>{`Removes parent + all ${coachActionMsg?.reply_count} ${coachActionMsg?.reply_count === 1 ? 'reply' : 'replies'}`}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.reportCancel, {borderColor: bd, alignSelf: 'flex-start', marginTop: 4}]}
                  onPress={() => setShowRemoveOptions(false)}>
                  <Text style={[styles.reportCancelText, {color: ts}]}>‹ Back</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.reportTitle, {color: tp}]}>Message Action</Text>
                <Text style={[styles.reportBody, {color: ts}]}>What would you like to do with this message?</Text>

                <TouchableOpacity
                  style={[styles.coachActionBtn, {backgroundColor: sf, borderColor: bd}]}
                  onPress={() => { setReportMsg(coachActionMsg); setCoachActionMsg(null); }}>
                  <Text style={styles.coachActionIcon}>📋</Text>
                  <View style={styles.coachActionText}>
                    <Text style={[styles.coachActionLabel, {color: tp}]}>Flag for Review</Text>
                    <Text style={[styles.coachActionDesc, {color: ts}]}>Send to the AD queue to review later</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.coachActionBtn, styles.coachActionDanger]}
                  onPress={() => {
                    if ((coachActionMsg?.reply_count ?? 0) > 0) {
                      setShowRemoveOptions(true);
                    } else {
                      handleRemove(false);
                    }
                  }}
                  disabled={removing}>
                  {removing
                    ? <ActivityIndicator size="small" color="#fff" style={{width: 28}} />
                    : <Text style={styles.coachActionIcon}>🛑</Text>}
                  <View style={styles.coachActionText}>
                    <Text style={styles.coachActionLabelDanger}>Remove from Chat</Text>
                    <Text style={styles.coachActionDescDanger}>
                      {(coachActionMsg?.reply_count ?? 0) > 0
                        ? `Has ${coachActionMsg?.reply_count} ${coachActionMsg?.reply_count === 1 ? 'reply' : 'replies'} — choose scope next`
                        : 'Immediately removes for everyone'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.reportCancel, {borderColor: bd, alignSelf: 'flex-end', marginTop: 4}]}
                  onPress={() => { setCoachActionMsg(null); setShowRemoveOptions(false); }}>
                  <Text style={[styles.reportCancelText, {color: ts}]}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={reportMsg !== null}
        transparent
        animationType="fade"
        onRequestClose={() => { setReportMsg(null); setReportNotes(''); }}>
        <Pressable style={styles.reportOverlay} onPress={() => { setReportMsg(null); setReportNotes(''); }}>
          <Pressable style={[styles.reportCard, {backgroundColor: sf, borderColor: bd}]} onPress={() => {}}>
            <Text style={[styles.reportTitle, {color: tp}]}>Report Message</Text>
            <Text style={[styles.reportBody, {color: ts}]}>Are you sure you wish to report this message?</Text>
            <TextInput
              style={[styles.reportNotes, {backgroundColor: bg, borderColor: bd, color: tp}]}
              placeholder="Notes (optional)"
              placeholderTextColor={ts}
              value={reportNotes}
              onChangeText={setReportNotes}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.reportActions}>
              <TouchableOpacity
                style={[styles.reportCancel, {borderColor: bd}]}
                onPress={() => { setReportMsg(null); setReportNotes(''); }}>
                <Text style={[styles.reportCancelText, {color: ts}]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reportConfirm} onPress={handleReport} disabled={reporting}>
                {reporting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.reportConfirmText}>Report</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Channel info popover ───────────────────────────────────────── */}
      <Modal
        visible={infoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoOpen(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setInfoOpen(false)}>
          <Pressable
            style={[styles.sheetCard, {backgroundColor: sf, borderColor: bd, top: infoAnchor.top, left: infoAnchor.left}]}
            onPress={() => {}}>
            {canLeave ? (
              <TouchableOpacity
                style={styles.sheetRow}
                onPress={() => { setInfoOpen(false); handleLeave(); }}>
                <Image source={icons.exit} style={[styles.sheetRowIcon, {tintColor: '#EF4444'}]} />
                <Text style={styles.sheetRowLabel}>Leave</Text>
              </TouchableOpacity>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1},
  flex: {flex: 1},
  header: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10},
  backBtn: {padding: 4},
  backText: {fontSize: 32, lineHeight: 36},
  headerCenter: {flex: 1, gap: 2},
  headerTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  channelName: {fontSize: 16, fontWeight: '700'},
  channelSport: {fontSize: 12},
  membersBtn: {alignItems: 'center', padding: 4},
  membersBtnText: {fontSize: 13, fontWeight: '700', lineHeight: 16},
  membersBtnIcon: {fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5},
  infoBtn: {padding: 2},
  infoIcon: {width: 16, height: 16},
  messageList: {flexGrow: 1},
  // ── Channel (Slack-style) ────────────────────────────────────────────────
  msgRow: {paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4, overflow: 'visible'},
  msgHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap'},
  senderName: {fontSize: 14, fontWeight: '700'},
  timestamp: {fontSize: 11},
  flagIcon: {fontSize: 16, fontWeight: '900'},
  msgBox: {borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth, overflow: 'visible'},
  msgContent: {fontSize: 15, lineHeight: 22},
  blockedBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  blockedBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  blockedIcon: {fontSize: 15, lineHeight: 21},
  blockedMsg: {flex: 1, fontSize: 13, lineHeight: 20, color: '#EF4444', fontStyle: 'italic'},
  threadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  threadPillCount: {fontSize: 12, fontWeight: '600'},
  threadPillChevron: {fontSize: 16, lineHeight: 18, fontWeight: '300'},
  // ── DM (iMessage-style) ──────────────────────────────────────────────────
  pronouns: {fontSize: 11, fontStyle: 'italic', opacity: 0.7},
  dmRow: {paddingHorizontal: 12, paddingVertical: 6, gap: 3},
  dmBubbleWrap: {maxWidth: '78%'},
  dmRowMine: {alignItems: 'flex-end'},
  dmRowTheirs: {alignItems: 'flex-start'},
  dmSenderRow: {flexDirection: 'row', alignItems: 'baseline', gap: 5, marginLeft: 4, marginBottom: 1},
  dmSender: {fontSize: 12, fontWeight: '700'},
  dmReplyQuote: {borderLeftWidth: 3, paddingLeft: 8, paddingVertical: 3, marginBottom: 2, borderRadius: 4},
  dmBubble: {borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, overflow: 'visible'},
  dmText: {fontSize: 15, lineHeight: 21},
  dmTime: {fontSize: 10, marginLeft: 4},
  dmTimeMine: {marginLeft: 0, marginRight: 4},
  analyzingBar:  {flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1},
  analyzingIcon: {width: 16, height: 16},
  analyzingText: {fontSize: 13},
  compose: {flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1},
  input: {flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 120, borderWidth: 1},
  sendBtn: {width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center'},
  sendBtnText: {fontSize: 20, fontWeight: '700'},
  emptyText: {textAlign: 'center', marginTop: 60, fontSize: 14},
  replyQuote: {borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 4, marginBottom: 4, borderRadius: 4},
  replyQuoteSender: {fontSize: 12, fontWeight: '700', marginBottom: 1},
  replyQuoteText: {fontSize: 12},
  replyBar: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1, borderLeftWidth: 3, gap: 10},
  replyBarContent: {flex: 1, gap: 1},
  replyBarLabel: {fontSize: 12, fontWeight: '700'},
  replyBarText: {fontSize: 12},
  replyBarClose: {padding: 4},
  replyBarCloseText: {fontSize: 16},
  // ── Message action buttons ───────────────────────────────────────────────
  msgActionsRow:       {flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8},
  reactionsInlineWrap: {flex: 1, overflow: 'hidden'},
  threadReplyText:     {fontSize: 12, fontWeight: '500'},
  translationBox:      {borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 6, marginTop: 4, borderRadius: 4, flexDirection: 'row', gap: 6},
  translationLabel:    {fontSize: 13},
  translationText:     {flex: 1, fontSize: 14, lineHeight: 20},
  translateHeaderBtn:  {marginLeft: 'auto'},
  translateIcon:       {width: 14, height: 14},
  toastBanner:         {paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(24,24,27,0.92)'},
  toastText:           {fontSize: 13, color: '#F4F4F5', fontWeight: '500'},
  replyCountRight:     {alignSelf: 'flex-end', marginTop: 4},
  actionBtn:           {width: 35, height: 35, borderRadius: 17.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  actionIcon:          {width: 30, height: 30},
  replyDot:            {position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: 4.5, borderWidth: 1.5},
  floatingActions:     {position: 'absolute', top: -22, flexDirection: 'row', gap: 4, borderRadius: 20, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 4, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.15, shadowRadius: 6, elevation: 6, zIndex: 10},
  floatingActionsRight:{right: 8},
  floatingActionsLeft: {left: 8},
  dmActionBtn:         {width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  dmActionIcon:        {width: 20, height: 20},
  // ── Coach action modal ───────────────────────────────────────────────────
  coachActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  coachActionDanger: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  coachActionIcon: {fontSize: 22},
  coachActionText: {flex: 1, gap: 2},
  coachActionLabel: {fontSize: 15, fontWeight: '700'},
  coachActionLabelDanger: {fontSize: 15, fontWeight: '700', color: '#fff'},
  coachActionDesc: {fontSize: 12},
  coachActionDescDanger: {fontSize: 12, color: 'rgba(255,255,255,0.8)'},
  // ── Report modal ─────────────────────────────────────────────────────────
  reportOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 28},
  reportCard: {width: '100%', maxWidth: 360, borderRadius: 18, borderWidth: 1, padding: 20, gap: 14},
  reportTitle: {fontSize: 17, fontWeight: '700'},
  reportBody: {fontSize: 14, lineHeight: 20},
  reportNotes: {borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, minHeight: 72},
  reportActions: {flexDirection: 'row', gap: 10, justifyContent: 'flex-end'},
  reportCancel: {borderWidth: 1, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10},
  reportCancelText: {fontSize: 14, fontWeight: '600'},
  reportConfirm: {backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, minWidth: 72, alignItems: 'center'},
  reportConfirmText: {fontSize: 14, fontWeight: '700', color: '#fff'},
  // ── Channel info popover ──────────────────────────────────────────────────
  sheetOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.15)'},
  sheetCard: {position: 'absolute', borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 4, shadowColor: '#000', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.18, shadowRadius: 16, elevation: 10},
  sheetRow: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12},
  sheetRowIcon: {width: 18, height: 18},
  sheetRowLabel: {fontSize: 15, fontWeight: '500', color: '#EF4444'},
});
