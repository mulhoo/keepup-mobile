import React, {useState, useMemo, useCallback} from 'react';
import {
  View, Text, Modal, Pressable, StyleSheet, TextInput,
  FlatList, TouchableOpacity, Image, Dimensions,
  ActivityIndicator, ScrollView,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../context/ThemeContext';
import {toggleReaction, type Reaction} from '../services/messages';
import {api} from '../services/api';
import {EMOJI_CATEGORIES, EMOJI_SEARCH_INDEX} from '../data/emoji';

const {width: SW} = Dimensions.get('window');
const COLS        = 7;
const CELL        = Math.floor((SW - 32) / COLS);
const SHEET_H     = Math.round(SW * 1.05); // roughly square, slight taller for tabs

interface Props {
  visible:           boolean;
  messageId:         number;
  onClose:           () => void;
  onReactionsChange: (messageId: number, updated: Reaction[]) => void;
}

interface CustomEmoji {uri: string}
type ModStatus = 'idle' | 'checking' | 'approved' | 'rejected';

export const EmojiPickerSheet = ({visible, messageId, onClose, onReactionsChange}: Props) => {
  const {colors} = useTheme();
  const insets   = useSafeAreaInsets();

  const [query,        setQuery]        = useState('');
  const [activeTab,    setActiveTab]    = useState('smileys');
  const [urlInput,     setUrlInput]     = useState('');
  const [modStatus,    setModStatus]    = useState<ModStatus>('idle');
  const [modError,     setModError]     = useState('');
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);

  const sf  = colors.color_surface;
  const bg  = colors.color_background;
  const bd  = colors.color_border;
  const tp  = colors.color_text_primary;
  const ts  = colors.color_text_secondary;
  const acc = colors.color_primary;
  const onA = colors.color_text_on_primary;

  // ── Emoji to display ──────────────────────────────────────────────────────
  const displayEmoji = useMemo<string[]>(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return EMOJI_SEARCH_INDEX
        .filter(([, kw]) => kw.includes(q))
        .map(([e]) => e);
    }
    if (activeTab === 'custom') return customEmojis.map(c => c.uri);
    return EMOJI_CATEGORIES.find(c => c.id === activeTab)?.entries.map(([e]) => e) ?? [];
  }, [query, activeTab, customEmojis]);

  // ── React to an emoji ─────────────────────────────────────────────────────
  const handleEmoji = useCallback(async (emoji: string) => {
    onClose();
    try {
      const updated = await toggleReaction(messageId, emoji);
      onReactionsChange(messageId, updated);
    } catch {}
  }, [messageId, onClose, onReactionsChange]);

  // ── Custom emoji moderation ───────────────────────────────────────────────
  async function handleAddCustom() {
    const url = urlInput.trim();
    if (!url) return;
    setModStatus('checking');
    setModError('');
    try {
      const description =
        `A user in a school sports communication app wants to add a custom image or GIF as a reaction emoji. ` +
        `The URL is: ${url}. ` +
        `Based on the URL domain and path, is this likely appropriate for a K-12 school athletics platform? ` +
        `Known safe GIF platforms include giphy.com, tenor.com, media.giphy.com, media.tenor.com.`;
      const result = await api.post<{tier: string}>('/demo/moderate', {content: description});
      if (result.tier === 'severe') {
        setModStatus('rejected');
        setModError('Gemma flagged this as inappropriate for school use.');
      } else {
        setModStatus('approved');
        setCustomEmojis(prev => [...prev, {uri: url}]);
      }
    } catch {
      setModStatus('rejected');
      setModError('Could not review this image. Please try another URL.');
    }
  }

  function resetCustom() {
    setUrlInput('');
    setModStatus('idle');
    setModError('');
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderEmojiCell = useCallback(({item}: {item: string}) => {
    const isUrl = item.startsWith('http');
    return (
      <TouchableOpacity
        style={[styles.cell, {width: CELL, height: CELL}]}
        onPress={() => handleEmoji(item)}
        activeOpacity={0.55}>
        {isUrl
          ? <Image source={{uri: item}} style={styles.customImg} resizeMode="contain" />
          : <Text style={styles.emojiText}>{item}</Text>}
      </TouchableOpacity>
    );
  }, [handleEmoji]);

  const allTabs = [...EMOJI_CATEGORIES.map(c => ({id: c.id, icon: c.icon})), {id: 'custom', icon: '✏️'}];

  // ── Custom tab body ───────────────────────────────────────────────────────
  const customBody = () => (
    <ScrollView style={styles.customScroll} contentContainerStyle={styles.customContent} keyboardShouldPersistTaps="handled">
      {customEmojis.length > 0 && (
        <View style={styles.customGrid}>
          {customEmojis.map((c, i) => (
            <TouchableOpacity key={i} style={[styles.cell, {width: CELL, height: CELL}]} onPress={() => handleEmoji(c.uri)}>
              <Image source={{uri: c.uri}} style={styles.customImg} resizeMode="contain" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={[styles.customHeading, {color: ts}]}>Add a GIF or image</Text>
      <Text style={[styles.customSub, {color: ts}]}>Paste a URL — Gemma will check it before adding.</Text>

      {modStatus === 'idle' || modStatus === 'rejected' ? (
        <>
          {modStatus === 'rejected' && (
            <View style={[styles.errorBox, {backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)'}]}>
              <Text style={styles.errorText}>{modError}</Text>
            </View>
          )}
          <View style={[styles.urlInputWrap, {backgroundColor: bg, borderColor: bd}]}>
            <TextInput
              style={[styles.urlInput, {color: tp}]}
              placeholder="https://media.giphy.com/…"
              placeholderTextColor={ts}
              value={urlInput}
              onChangeText={setUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {urlInput.trim().length > 0 && (
            <>
              <Image source={{uri: urlInput.trim()}} style={styles.previewImg} resizeMode="contain" />
              <TouchableOpacity
                style={[styles.addBtn, {backgroundColor: acc}]}
                onPress={handleAddCustom}>
                <Text style={[styles.addBtnText, {color: onA}]}>Check with Gemma & Add</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      ) : modStatus === 'checking' ? (
        <View style={styles.statusWrap}>
          <ActivityIndicator color={acc} />
          <Text style={[styles.statusText, {color: ts}]}>Gemma is reviewing…</Text>
        </View>
      ) : (
        <View style={styles.statusWrap}>
          <Text style={styles.approvedIcon}>✅</Text>
          <Text style={[styles.statusText, {color: tp}]}>Added! Tap it above to use it.</Text>
          <TouchableOpacity style={[styles.addBtn, {backgroundColor: colors.color_surface_variant, marginTop: 12}]} onPress={resetCustom}>
            <Text style={[styles.addBtnText, {color: tp}]}>Add another</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, {backgroundColor: sf, height: SHEET_H, paddingBottom: insets.bottom + 4}]}>

        {/* ── Handle ── */}
        <View style={[styles.handle, {backgroundColor: bd}]} />

        {/* ── Search ── */}
        {activeTab !== 'custom' && (
          <View style={[styles.searchRow, {backgroundColor: bg, borderColor: bd}]}>
            <Text style={[styles.searchIcon, {color: ts}]}>🔍</Text>
            <TextInput
              style={[styles.searchInput, {color: tp}]}
              placeholder="Search emoji…"
              placeholderTextColor={ts}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Text style={[styles.clearBtn, {color: ts}]}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Grid or custom tab ── */}
        {activeTab === 'custom' ? customBody() : (
          <FlatList
            data={displayEmoji}
            keyExtractor={(e, i) => `${e}${i}`}
            numColumns={COLS}
            renderItem={renderEmojiCell}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            ListEmptyComponent={
              <Text style={[styles.emptyText, {color: ts}]}>No emoji found for "{query}"</Text>
            }
          />
        )}

        {/* ── Category tabs ── */}
        <View style={[styles.tabBar, {borderTopColor: bd, backgroundColor: sf}]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {allTabs.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tab, activeTab === t.id && {borderBottomColor: acc, borderBottomWidth: 2}]}
                onPress={() => {setActiveTab(t.id); setQuery('');}}>
                <Text style={styles.tabIcon}>{t.icon}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop:    {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)'},
  sheet:       {borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: {width: 0, height: -4}, shadowOpacity: 0.15, shadowRadius: 16},
  handle:      {width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 8},
  // Search
  searchRow:   {flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, gap: 8},
  searchIcon:  {fontSize: 16},
  searchInput: {flex: 1, fontSize: 15, padding: 0},
  clearBtn:    {fontSize: 14, paddingHorizontal: 4},
  // Grid
  gridContent: {paddingHorizontal: 16, paddingBottom: 8},
  cell:        {alignItems: 'center', justifyContent: 'center'},
  emojiText:   {fontSize: 26},
  customImg:   {width: 32, height: 32, borderRadius: 4},
  emptyText:   {textAlign: 'center', marginTop: 32, fontSize: 14},
  // Category tabs
  tabBar:      {borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 4},
  tabScroll:   {paddingHorizontal: 8, gap: 2},
  tab:         {paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: 'transparent'},
  tabIcon:     {fontSize: 22},
  // Custom tab
  customScroll:   {flex: 1},
  customContent:  {paddingHorizontal: 16, paddingBottom: 12},
  customGrid:     {flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16},
  customHeading:  {fontSize: 14, fontWeight: '700', marginTop: 8, marginBottom: 4},
  customSub:      {fontSize: 12, marginBottom: 12, lineHeight: 17},
  errorBox:       {borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10},
  errorText:      {fontSize: 13, color: '#EF4444'},
  urlInputWrap:   {borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10},
  urlInput:       {fontSize: 14, padding: 0},
  previewImg:     {width: '100%', height: 120, borderRadius: 10, marginBottom: 12, backgroundColor: 'rgba(0,0,0,0.05)'},
  addBtn:         {borderRadius: 12, paddingVertical: 12, alignItems: 'center'},
  addBtnText:     {fontSize: 15, fontWeight: '700'},
  statusWrap:     {alignItems: 'center', paddingVertical: 24, gap: 10},
  statusText:     {fontSize: 14},
  approvedIcon:   {fontSize: 36},
});
