import React, {useEffect, useRef, useState} from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable,
  ActivityIndicator, Image, TouchableOpacity, TextInput,
} from 'react-native';

const PENCIL_ICON = require('../../assets/icons/black/pencil.png');
import {fetchUserProfile, savePronouns, type UserProfile} from '../services/messages';
import {useTheme} from '../context/ThemeContext';

const ROLE_COLOR: Record<string, string> = {
  student:          '#2563EB',
  student_captain:  '#059669',
  head_coach:       '#16A34A',
  assistant_coach:  '#16A34A',
  parent:           '#EA580C',
};

interface Props {
  userId: number | null;
  seasonId?: number;
  currentUserId?: number;
  onClose: () => void;
}

export const ProfileModal = ({userId, seasonId, currentUserId, onClose}: Props) => {
  const {colors} = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingPronouns, setEditingPronouns] = useState(false);
  const [pronounsDraft, setPronounsDraft] = useState('');
  const inputRef = useRef<TextInput>(null);

  const isOwnProfile = userId !== null && userId === currentUserId;

  useEffect(() => {
    if (!userId) { setProfile(null); setEditingPronouns(false); return; }
    setLoading(true);
    fetchUserProfile(userId, seasonId)
      .then(p => { setProfile(p); setPronounsDraft(p.pronouns ?? ''); })
      .finally(() => setLoading(false));
  }, [userId, seasonId]);

  useEffect(() => {
    if (editingPronouns) setTimeout(() => inputRef.current?.focus(), 50);
  }, [editingPronouns]);

  async function handlePronounsBlur() {
    setEditingPronouns(false);
    const trimmed = pronounsDraft.trim();
    if (trimmed === (profile?.pronouns ?? '')) return;
    try {
      await savePronouns(trimmed);
      setProfile(prev => prev ? {...prev, pronouns: trimmed || null} : prev);
    } catch {}
  }

  const visible = userId !== null;
  const initials = profile ? `${profile.first_name[0]}${profile.last_name[0]}` : '';
  const roleColor = profile?.role ? (ROLE_COLOR[profile.role] ?? colors.color_primary) : colors.color_primary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.card, {backgroundColor: colors.color_surface, borderColor: colors.color_border}]}>
        {loading ? (
          <ActivityIndicator color={colors.color_primary} style={{padding: 32}} />
        ) : profile ? (
          <>
            {profile.profile_photo_url ? (
              <Image source={{uri: profile.profile_photo_url}} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, {backgroundColor: roleColor + '33'}]}>
                <Text style={[styles.avatarInitials, {color: roleColor}]}>{initials}</Text>
              </View>
            )}

            {/* Name + pronouns */}
            <View style={styles.nameRow}>
              <Text style={[styles.name, {color: colors.color_text_primary}]}>
                {profile.first_name} {profile.last_name}
              </Text>
              {editingPronouns ? (
                <TextInput
                  ref={inputRef}
                  style={[styles.pronounsInput, {color: colors.color_text_secondary, borderColor: colors.color_border}]}
                  value={pronounsDraft}
                  onChangeText={setPronounsDraft}
                  onBlur={handlePronounsBlur}
                  onSubmitEditing={handlePronounsBlur}
                  placeholder="they/them"
                  placeholderTextColor={colors.color_text_secondary + '80'}
                  autoCapitalize="none"
                  returnKeyType="done"
                  maxLength={30}
                />
              ) : profile.pronouns ? (
                <TouchableOpacity
                  onPress={() => isOwnProfile ? setEditingPronouns(true) : undefined}
                  activeOpacity={isOwnProfile ? 0.6 : 1}
                  disabled={!isOwnProfile}
                  style={styles.pronounsRow}>
                  <Text style={[styles.pronouns, {color: colors.color_text_secondary}]}>{profile.pronouns}</Text>
                  {isOwnProfile && (
                    <Image source={PENCIL_ICON} style={[styles.pencilIcon, {tintColor: colors.color_text_secondary}]} />
                  )}
                </TouchableOpacity>
              ) : isOwnProfile ? (
                <TouchableOpacity onPress={() => setEditingPronouns(true)} activeOpacity={0.6} style={styles.pronounsRow}>
                  <Text style={[styles.addPronouns, {color: colors.color_text_secondary}]}>(add pronouns)</Text>
                  <Image source={PENCIL_ICON} style={[styles.pencilIcon, {tintColor: colors.color_text_secondary}]} />
                </TouchableOpacity>
              ) : null}
            </View>

            {profile.role && (
              <View style={[styles.rolePill, {backgroundColor: colors.color_background, borderColor: roleColor + '55'}]}>
                <View style={[styles.roleDot, {backgroundColor: roleColor}]} />
                <Text style={[styles.roleText, {color: roleColor}]}>
                  {profile.role.replace(/_/g, ' ')}
                </Text>
              </View>
            )}
            <Text style={[styles.email, {color: colors.color_text_secondary}]}>{profile.email}</Text>
          </>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  card: {
    position: 'absolute',
    top: '30%',
    left: 32,
    right: 32,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  avatar: {width: 80, height: 80, borderRadius: 40, marginBottom: 4},
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  avatarInitials: {fontSize: 28, fontWeight: '800'},
  nameRow: {flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', justifyContent: 'center'},
  name: {fontSize: 20, fontWeight: '800', letterSpacing: -0.3},
  pronounsRow: {flexDirection: 'row', alignItems: 'center', gap: 4},
  pronouns: {fontSize: 13, fontStyle: 'italic', opacity: 0.75},
  addPronouns: {fontSize: 12, fontStyle: 'italic', opacity: 0.5},
  pencilIcon: {width: 11, height: 11, opacity: 0.5},
  pronounsInput: {
    fontSize: 13, fontStyle: 'italic',
    borderBottomWidth: 1, paddingVertical: 1, paddingHorizontal: 4,
    minWidth: 60, maxWidth: 120,
  },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  roleDot: {width: 6, height: 6, borderRadius: 3},
  roleText: {fontSize: 12, fontWeight: '600', textTransform: 'capitalize'},
  email: {fontSize: 13, marginTop: 2},
});
