import {api} from './api';
import { translateOnDevice, ensureModelLoaded } from './onDeviceTranslation';

export { ensureModelLoaded, subscribeToModelState, getModelLoadState } from './onDeviceTranslation';

export interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean;
  users: string[];
}

export interface ReplyPreview {
  id: number;
  sender: string;
  content: string;
}

export interface Message {
  id: number;
  content: string | null;
  sender: string;
  sender_id: number;
  sender_role: string | null;
  sender_pronouns?: string | null;
  flag_action: string | null;
  flagged: boolean;
  created_at: string;
  reactions: Reaction[];
  reply_count: number;
  reply_to?: ReplyPreview | null;
  translatable: boolean;
  translation_path: 'server' | 'on_device' | null;
}

export interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_photo_url: string | null;
  role: string | null;
  pronouns: string | null;
}

export async function savePronouns(pronouns: string): Promise<void> {
  await api.patch('/demo/me/preferences', {preferences: {pronouns: pronouns.trim() || null}});
}

export interface ThreadData {
  parent_message: Message;
  reply_count: number;
  replies: Message[];
}

export type ModerationTier = 'clear' | 'questionable' | 'severe';

export interface SendResult {
  message: Message;
  moderation: {
    score: number;
    tier: ModerationTier;
    flag_action: string | null;
    notifications_sent_to: Array<{role: string; name: string}>;
  };
}

export async function fetchMessages(channelId: number, channelType?: string): Promise<Message[]> {
  if (channelType === 'dm') {
    return api.get<Message[]>(`/demo/dm_conversations/${channelId}/messages`);
  }
  return api.get<Message[]>(`/demo/channels/${channelId}/messages`);
}

export async function sendMessage(channelId: number, content: string, channelType?: string, replyToId?: number): Promise<SendResult> {
  if (channelType === 'dm') {
    return api.post<SendResult>(`/demo/dm_conversations/${channelId}/send_message`, {content, reply_to_id: replyToId});
  }
  return api.post<SendResult>(`/demo/channels/${channelId}/messages`, {content});
}

export async function fetchUserProfile(userId: number, seasonId?: number): Promise<UserProfile> {
  return api.get<UserProfile>(`/demo/users/${userId}`, {params: {season_id: seasonId}});
}

export async function toggleReaction(messageId: number, emoji: string): Promise<Reaction[]> {
  return api.post<Reaction[]>(`/demo/messages/${messageId}/reactions/toggle`, {emoji});
}

export async function fetchThread(messageId: number): Promise<ThreadData> {
  return api.get<ThreadData>(`/demo/messages/${messageId}/thread`);
}

export async function sendThreadReply(messageId: number, content: string): Promise<Message> {
  return api.post<Message>(`/demo/messages/${messageId}/thread`, {content});
}

export interface ChannelMember {
  id: number;
  name: string;
  role: string | null;
}

export interface ChannelMembersData {
  members: ChannelMember[];
  addable?: ChannelMember[];
}

export async function fetchChannelMembers(channelId: number): Promise<ChannelMembersData> {
  return api.get<ChannelMembersData>(`/demo/channels/${channelId}/members`);
}

export async function addChannelMember(channelId: number, userId: number): Promise<ChannelMember> {
  return api.post<ChannelMember>(`/demo/channels/${channelId}/members`, {user_id: userId});
}

export async function removeMessage(messageId: number, removeThread = false): Promise<void> {
  await api.post(`/demo/messages/${messageId}/remove`, {remove_thread: removeThread});
}

export interface TranslationResult {
  message_id: number;
  original_text: string;
  translated_text: string;
  target_language: string;
  language_name: string;
  from_cache: boolean;
}

export class TranslationUnavailableError extends Error {}

export async function translateMessage(
  messageId: number,
  message?: { content: string | null; translation_path: 'server' | 'on_device' | null },
  targetLanguage?: string,
): Promise<TranslationResult> {
  if (message?.translation_path === 'on_device' && message.content && targetLanguage) {
    // Privacy boundary: student content never leaves the device
    const translated = await translateOnDevice(message.content, targetLanguage);
    return {
      message_id: messageId,
      original_text: message.content,
      translated_text: translated,
      target_language: targetLanguage,
      language_name: targetLanguage,
      from_cache: false,
    };
  }

  try {
    return await api.post<TranslationResult>(`/demo/messages/${messageId}/translate`);
  } catch (err: any) {
    throw new TranslationUnavailableError(
      err?.response?.data?.error ?? 'Translation service unavailable.'
    );
  }
}

export async function reportMessage(
  messageId: number,
  notes: string,
  channelType?: string,
  conversationId?: number,
): Promise<void> {
  const body = {notes: notes || undefined};
  if (channelType === 'dm' && conversationId) {
    await api.post(`/demo/dm_conversations/${conversationId}/messages/${messageId}/report`, body);
  } else {
    await api.post(`/demo/messages/${messageId}/report`, body);
  }
}
