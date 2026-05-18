import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import {toggleReaction, type Reaction} from '../services/messages';
import {useTheme} from '../context/ThemeContext';
import {EmojiPickerSheet} from './EmojiPickerSheet';

export {EmojiPickerSheet} from './EmojiPickerSheet';

interface Props {
  messageId: number;
  reactions: Reaction[];
  onReactionsChange: (messageId: number, reactions: Reaction[]) => void;
  maxVisible?: number;
}

export const ReactionBar = ({messageId, reactions, onReactionsChange, maxVisible}: Props) => {
  const {colors} = useTheme();
  const [pickerVisible, setPickerVisible] = useState(false);
  const isInline = maxVisible != null;
  const visible  = isInline ? reactions.slice(0, maxVisible) : reactions;

  async function handleEmoji(emoji: string) {
    try {
      const updated = await toggleReaction(messageId, emoji);
      onReactionsChange(messageId, updated);
    } catch {}
  }

  if (reactions.length === 0) return null;

  return (
    <View style={[styles.row, isInline && styles.rowInline]}>
      {visible.map(r => {
        const isUrl = r.emoji.startsWith('http');
        return (
          <TouchableOpacity
            key={r.emoji}
            style={[
              styles.chip,
              {backgroundColor: colors.color_surface, borderColor: colors.color_border},
              r.reacted && {backgroundColor: colors.color_surface_variant, borderColor: colors.color_primary},
            ]}
            onPress={() => handleEmoji(r.emoji)}
            activeOpacity={0.7}>
            {isUrl
              ? <Image source={{uri: r.emoji}} style={styles.chipImg} />
              : <Text style={styles.chipEmoji}>{r.emoji}</Text>}
            <Text style={[styles.chipCount, {color: colors.color_text_secondary}, r.reacted && {color: colors.color_primary}]}>
              {r.count}
            </Text>
          </TouchableOpacity>
        );
      })}
      {!isInline && (
        <TouchableOpacity
          style={[styles.addBtn, {backgroundColor: colors.color_surface, borderColor: colors.color_border}]}
          onPress={() => setPickerVisible(true)}>
          <Text style={[styles.addBtnText, {color: colors.color_text_secondary}]}>+</Text>
        </TouchableOpacity>
      )}
      {!isInline && (
        <EmojiPickerSheet
          visible={pickerVisible}
          messageId={messageId}
          onClose={() => setPickerVisible(false)}
          onReactionsChange={onReactionsChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row:       {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6},
  rowInline: {flexWrap: 'nowrap', marginTop: 0},
  chip:      {flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1},
  chipEmoji: {fontSize: 14},
  chipImg:   {width: 18, height: 18, borderRadius: 3},
  chipCount: {fontSize: 12, fontWeight: '600'},
  addBtn:    {width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  addBtnText:{fontSize: 16, lineHeight: 20},
});
