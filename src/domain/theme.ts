export type TableTheme = 'wood' | 'coffee' | 'forest' | 'night' | 'paper' | 'aurora';

export interface ThemeOption {
  id: TableTheme;
  name: string;
  description: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'wood', name: 'Wood', description: 'Warm Oak Cafe' },
  { id: 'coffee', name: 'Coffee', description: 'Dark Walnut & Espresso' },
  { id: 'forest', name: 'Forest', description: 'Moss Green Timber' },
  { id: 'night', name: 'Night', description: 'Dimly Lit Mahogany' },
  { id: 'paper', name: 'Paper', description: 'Warm Canvas Linen' },
  { id: 'aurora', name: 'Aurora', description: 'Pastel Glass Gradient' },
];

export type MusicTrackId = 'jazz' | 'lofi' | 'ambient';

export interface MusicTrackOption {
  id: MusicTrackId;
  title: string;
  subtitle: string;
}

export const MUSIC_TRACKS: MusicTrackOption[] = [
  { id: 'jazz', title: 'Coffeehouse Jazz Keys', subtitle: 'Synchronized Jam · Playing' },
  { id: 'lofi', title: 'Rainy Evening Lofi', subtitle: 'Synchronized Jam · Playing' },
  { id: 'ambient', title: 'Forest Chill Soundscape', subtitle: 'Synchronized Jam · Playing' },
];
