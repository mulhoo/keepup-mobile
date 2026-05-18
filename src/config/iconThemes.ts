export type IconKey =
  | 'keepup-icon-blue'
  | 'keepup-icon-border-blue'
  | 'keepup-icon-blwh'
  | 'keepup-icon-blwh-inverted'
  | 'keepup-icon-white';

export interface IconTheme {
  icon: any;
  wording: any;
  background: string;
}

export const ICON_THEMES: Record<IconKey, IconTheme> = {
  'keepup-icon-blue': {
    icon:       require('../assets/keepup-icon-blue.png'),
    wording:    require('../assets/keepup-wording-navy.png'),
    background: '#FFFFFF',
  },
  'keepup-icon-border-blue': {
    icon:       require('../assets/keepup-icon-border-blue.png'),
    wording:    require('../assets/keepup-wording-white.png'),
    background: '#0A0E28',
  },
  'keepup-icon-blwh': {
    icon:       require('../assets/keepup-icon-blwh.png'),
    wording:    require('../assets/keepup-wording-white-solid.png'),
    background: '#000000',
  },
  'keepup-icon-blwh-inverted': {
    icon:       require('../assets/keepup-icon-blwh-inverted.png'),
    wording:    require('../assets/keepup-wording-white-solid.png'),
    background: '#000000',
  },
  'keepup-icon-white': {
    icon:       require('../assets/keepup-icon-white.png'),
    wording:    require('../assets/keepup-wording-black-solid.png'),
    background: '#FFFFFF',
  },
};

export const ICON_STORAGE_KEY = '@keepup/selected_icon';
export const DEFAULT_ICON: IconKey = 'keepup-icon-border-blue';
