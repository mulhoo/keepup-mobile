import AsyncStorage from '@react-native-async-storage/async-storage';
import {api} from './api';
import type {ThemeColors} from './themes';

export type NameFormat =
  | 'first_last'          // First Last (default)
  | 'first_only'          // First name only
  | 'first_last_initial'  // First L.
  | 'coach_first'         // Coach FirstName
  | 'coach_last';         // Coach LastName

// The full color set for the active theme, persisted on-device so the UI
// never resets when the backend is unreachable.
export interface StoredTheme {
  id: number;
  name: string;
  scope: 'system' | 'school';
  variant: 'dark' | 'light';
  school_name: string | null;
  colors: ThemeColors;
}

// Neutral fallback — used only on first launch before any backend theme loads.
export const DEFAULT_THEME: StoredTheme = {
  id: -1,
  name: 'Default',
  scope: 'system',
  variant: 'dark',
  school_name: null,
  colors: {
    color_background:      '#0F172A',
    color_surface:         '#1E293B',
    color_surface_variant: '#334155',
    color_border:          '#334155',
    color_primary:         '#6366F1',
    color_accent:          '#4F46E5',
    color_text_primary:    '#F8FAFC',
    color_text_secondary:  '#94A3B8',
    color_text_on_primary: '#FFFFFF',
    color_text_on_accent:  '#FFFFFF',
  },
};

const STORED_THEME_KEY = '@keepup/theme_v2';
const NAME_FORMAT_KEY  = '@keepup/name_format';

// ── Theme ────────────────────────────────────────────────────────────────────

export async function getStoredTheme(): Promise<StoredTheme> {
  try {
    const raw = await AsyncStorage.getItem(STORED_THEME_KEY);
    if (raw) return JSON.parse(raw) as StoredTheme;
  } catch {}
  return DEFAULT_THEME;
}

export async function saveStoredTheme(theme: StoredTheme): Promise<void> {
  await AsyncStorage.setItem(STORED_THEME_KEY, JSON.stringify(theme));
}

// ── Name format ───────────────────────────────────────────────────────────────

export function getDefaultNameFormat(role: string): NameFormat {
  return 'first_last';
}

export function getAvailableFormats(role: string): {key: NameFormat; label: string}[] {
  if (role === 'student' || role === 'student_captain') {
    return [
      {key: 'first_last',         label: 'First & Last'},
      {key: 'first_only',         label: 'First Only'},
      {key: 'first_last_initial', label: 'First & Last Initial'},
    ];
  }
  if (role === 'head_coach' || role === 'assistant_coach') {
    return [
      {key: 'first_last',  label: 'First + Last name'},
      {key: 'coach_first', label: 'Coach + First name'},
      {key: 'coach_last',  label: 'Coach + Last name'},
    ];
  }
  return [];
}

export function formatDisplayName(
  firstName: string,
  lastName: string,
  format: NameFormat,
): string {
  switch (format) {
    case 'first_only':         return firstName;
    case 'first_last_initial': return `${firstName} ${lastName[0]}.`;
    case 'coach_first':        return `Coach ${firstName}`;
    case 'coach_last':         return `Coach ${lastName}`;
    default:                   return `${firstName} ${lastName}`;
  }
}

export async function getNameFormat(role: string): Promise<NameFormat> {
  const stored = await AsyncStorage.getItem(NAME_FORMAT_KEY);
  return (stored as NameFormat | null) ?? getDefaultNameFormat(role);
}

export async function savePreferredLanguage(language: string | null): Promise<void> {
  await api.patch('/demo/me/preferences', {preferences: {preferred_language: language || null}});
}

export async function saveNameFormat(format: NameFormat, syncToServer = false): Promise<void> {
  await AsyncStorage.setItem(NAME_FORMAT_KEY, format);
  if (syncToServer) {
    // Map local format keys to the backend's name_display values
    const serverFormat = format === 'first_last_initial' ? 'first_last_initial'
      : format === 'first_only' ? 'first_only'
      : 'first_last';
    await api.patch('/demo/me/preferences', {preferences: {name_display: serverFormat}}).catch(() => {});
  }
}
