import {api, setAuthToken} from './api';

export type DemoRole = 'student' | 'head_coach' | 'parent' | 'athletic_director';

export interface SessionUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  role: string;
  user: SessionUser;
}

export interface School {
  id: number;
  name: string;
}

export interface Season {
  id: number;
  name: string;
  sport: string;
  school_year: string;
  status: string;
  role: string;
  school: School;
}

export interface Channel {
  id: number;
  name: string;
  channel_type: string;
  sport: string;
  season: string;
  season_id: number;
  school_id: number;
  school_name: string;
  system_generated: boolean;
  last_message?: string | null;
  member_count?: number;
  unread_count?: number;
}

export interface DmConversation {
  id: number;
  season_id: number;
  other_user: {
    id: number;
    first_name: string;
    last_name: string;
    role: string;
  };
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
}

export async function loginAsDemo(role: DemoRole): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/demo/session', {role});
  setAuthToken(res.token);
  return res;
}

export async function logout(): Promise<void> {
  await api.delete('/demo/session').catch(() => {});
  setAuthToken(null);
}

export async function resetDemoData(): Promise<void> {
  await api.post('/demo/reset').catch(() => {});
}

export async function fetchSeasons(): Promise<Season[]> {
  return api.get<Season[]>('/demo/seasons');
}

export async function fetchChannels(seasonId: number): Promise<Channel[]> {
  return api.get<Channel[]>('/demo/channels', {params: {season_id: seasonId}});
}

export async function leaveChannel(channelId: number): Promise<void> {
  await api.delete(`/demo/channels/${channelId}/leave`);
}

export async function fetchDmConversations(seasonId: number): Promise<DmConversation[]> {
  return api.get<DmConversation[]>('/demo/dm_conversations', {params: {season_id: seasonId}});
}

export interface DmStartableUser {
  id: number;
  name: string;
  role: string | null;
}

export async function fetchDmStartable(seasonId: number): Promise<DmStartableUser[]> {
  return api.get<DmStartableUser[]>('/demo/dm_conversations/startable', {params: {season_id: seasonId}});
}

export async function findOrCreateDmConversation(seasonId: number, otherUserId: number): Promise<DmConversation> {
  return api.post<DmConversation>('/demo/dm_conversations', {season_id: seasonId, other_user_id: otherUserId});
}

export async function markChannelRead(channelId: number): Promise<void> {
  await api.post(`/demo/channels/${channelId}/mark_read`);
}

export async function markDmRead(conversationId: number): Promise<void> {
  await api.post(`/demo/dm_conversations/${conversationId}/mark_read`);
}
