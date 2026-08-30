export type MusicSource = 'jigsaw' | 'youtube' | 'upload';

export type MusicCategory =
  | 'All'
  | 'Cozy'
  | 'Lo-fi'
  | 'Coffee Shop'
  | 'Rainy'
  | 'Nature'
  | 'Focus'
  | 'Night'
  | 'Chill'
  | 'Acoustic'
  | 'YouTube'
  | 'Uploaded';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  audioUrl?: string;
  youtubeVideoId?: string;
  duration: number; // in seconds
  category: MusicCategory;
  source: MusicSource;
  uploadedBy?: string;
}

export interface MusicState {
  source: MusicSource;
  trackId: string;
  title: string;
  artist: string;
  thumbnail?: string;
  isPlaying: boolean;
  position: number; // seconds
  volume: number; // 0.0 - 1.0
  updatedAt: number; // timestamp
  updatedBy: string;
}

export type MusicControlMode = 'everyone' | 'host-only';

export interface MusicRealtimePayload {
  state: MusicState;
  queue: MusicTrack[];
  controlMode: MusicControlMode;
  senderId: string;
  senderName: string;
}

export const JIGSAW_MUSIC_CATEGORIES: MusicCategory[] = [
  'All',
  'Cozy',
  'Lo-fi',
  'Coffee Shop',
  'Rainy',
  'Nature',
  'Focus',
  'Night',
  'Chill',
  'Acoustic',
];

/**
 * Curated built-in ambient, lo-fi, and acoustic tracks with copyright-free audio streams.
 */
export const JIGSAW_MUSIC_CATALOG: MusicTrack[] = [
  {
    id: 'jigsaw-cozy-1',
    title: 'Coffeehouse Jazz Keys',
    artist: 'Zlelin Acoustic Trio',
    thumbnail: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=coffee-shop-chill-lo-fi-112191.mp3',
    duration: 142,
    category: 'Cozy',
    source: 'jigsaw',
  },
  {
    id: 'jigsaw-lofi-1',
    title: 'Rainy Evening Lofi Chill',
    artist: 'Nostalgia Beats',
    thumbnail: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=300&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=lofi-study-112191.mp3',
    duration: 165,
    category: 'Lo-fi',
    source: 'jigsaw',
  },
  {
    id: 'jigsaw-coffee-1',
    title: 'Warm Espresso & Soft Chords',
    artist: 'Milano Roastery Session',
    thumbnail: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=300&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/11/06/audio_c927f8a7e0.mp3?filename=cozy-coffee-shop-124976.mp3',
    duration: 154,
    category: 'Coffee Shop',
    source: 'jigsaw',
  },
  {
    id: 'jigsaw-rainy-1',
    title: 'Window Pane Raindrops',
    artist: 'Kyoto Rain Ensemble',
    thumbnail: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=300&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_95cf580ff7.mp3?filename=rain-and-nostalgia-20849.mp3',
    duration: 180,
    category: 'Rainy',
    source: 'jigsaw',
  },
  {
    id: 'jigsaw-nature-1',
    title: 'Pine Forest Birdsong',
    artist: 'Alpine Whispers',
    thumbnail: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=300&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=forest-lullaby-110624.mp3',
    duration: 138,
    category: 'Nature',
    source: 'jigsaw',
  },
  {
    id: 'jigsaw-focus-1',
    title: 'Deep Concentration Waves',
    artist: 'Mindful Solitude',
    thumbnail: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=300&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/26/audio_d0c6ff1101.mp3?filename=ambient-piano-amp-strings-10711.mp3',
    duration: 195,
    category: 'Focus',
    source: 'jigsaw',
  },
  {
    id: 'jigsaw-night-1',
    title: 'Midnight Stargazing',
    artist: 'Lunar Serenade',
    thumbnail: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3?filename=nightfall-future-bass-113652.mp3',
    duration: 160,
    category: 'Night',
    source: 'jigsaw',
  },
  {
    id: 'jigsaw-chill-1',
    title: 'Sunset Coastline Breeze',
    artist: 'Santorini Acoustic Session',
    thumbnail: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=300&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=chill-sunset-122784.mp3',
    duration: 172,
    category: 'Chill',
    source: 'jigsaw',
  },
  {
    id: 'jigsaw-acoustic-1',
    title: 'Campfire Nylon Guitar',
    artist: 'Woodland Strings',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/04/27/audio_40ffbfeb8c.mp3?filename=acoustic-guitars-ambient-111163.mp3',
    duration: 148,
    category: 'Acoustic',
    source: 'jigsaw',
  },
];
