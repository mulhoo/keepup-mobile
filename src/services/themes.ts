import {api} from './api';

export interface ThemeColors {
  color_background: string;
  color_surface: string;
  color_surface_variant: string;
  color_border: string;
  color_primary: string;
  color_accent: string;
  color_text_primary: string;
  color_text_secondary: string;
  color_text_on_primary: string;
  color_text_on_accent: string;
}

export interface AppTheme {
  id: number;
  name: string;
  scope: 'system' | 'school';
  variant: 'dark' | 'light';
  school_name: string | null;
  colors: ThemeColors;
}

export async function fetchThemes(): Promise<AppTheme[]> {
  return api.get<AppTheme[]>('/demo/themes');
}
