import { create } from 'zustand';
import {
  MusicTrack,
  MusicState,
  MusicControlMode,
  JIGSAW_MUSIC_CATALOG,
} from '@/domain/music';
import { UnifiedMusicEngine } from '@/infrastructure/music/unified-music-engine';

interface MusicStoreState {
  currentTrack: MusicTrack;
  musicState: MusicState;
  queue: MusicTrack[];
  history: MusicTrack[];
  controlMode: MusicControlMode;

  volume: number;
  isMuted: boolean;
  currentTime: number;
  duration: number;

  isCenterModalOpen: boolean;
  activeTab: 'library' | 'youtube' | 'upload' | 'queue' | 'settings';

  youtubeQuery: string;
  youtubeResults: MusicTrack[];
  isSearchingYoutube: boolean;
  syncEnabled: boolean;

  // Actions
  setCenterModalOpen: (open: boolean) => void;
  setActiveTab: (tab: 'library' | 'youtube' | 'upload' | 'queue' | 'settings') => void;
  setYoutubeQuery: (query: string) => void;
  searchYouTube: (query: string) => Promise<void>;
  uploadAudioFile: (file: File, uploadedBy: string) => Promise<MusicTrack | null>;

  playTrack: (track: MusicTrack, broadcast?: boolean) => Promise<void>;
  togglePlay: (broadcast?: boolean) => Promise<void>;
  pause: (broadcast?: boolean) => void;
  seek: (position: number, broadcast?: boolean) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;

  addToQueue: (track: MusicTrack, broadcast?: boolean) => void;
  removeFromQueue: (trackId: string, broadcast?: boolean) => void;
  reorderQueue: (fromIndex: number, toIndex: number, broadcast?: boolean) => void;
  playNext: (broadcast?: boolean) => Promise<void>;
  playPrevious: (broadcast?: boolean) => Promise<void>;
  clearQueue: (broadcast?: boolean) => void;
  setControlMode: (mode: MusicControlMode, broadcast?: boolean) => void;

  // Synchronize remote peer updates
  applyRemoteMusicState: (remoteState: MusicState, remoteQueue?: MusicTrack[], remoteMode?: MusicControlMode) => void;

  // Realtime Broadcast Dispatcher Callback
  onBroadcastMusicState?: (state: MusicState, queue: MusicTrack[], mode: MusicControlMode) => void;
  setBroadcastDispatcher: (fn: (state: MusicState, queue: MusicTrack[], mode: MusicControlMode) => void) => void;
}

const defaultTrack: MusicTrack = JIGSAW_MUSIC_CATALOG[0];

const defaultMusicState: MusicState = {
  source: 'jigsaw',
  trackId: defaultTrack.id,
  title: defaultTrack.title,
  artist: defaultTrack.artist,
  thumbnail: defaultTrack.thumbnail,
  isPlaying: false,
  position: 0,
  volume: 0.7,
  updatedAt: Date.now(),
  updatedBy: 'System',
};

export const useMusicStore = create<MusicStoreState>((set, get) => {
  const engine = UnifiedMusicEngine.getInstance();

  // Attach engine callbacks into the store
  engine.setEvents({
    onTimeUpdate: (current, duration) => {
      set({
        currentTime: current,
        duration: duration || get().currentTrack.duration || 180,
      });
    },
    onStateChange: (isPlaying) => {
      set((state) => ({
        musicState: { ...state.musicState, isPlaying },
      }));
    },
    onEnded: () => {
      get().playNext(true);
    },
  });

  return {
    currentTrack: defaultTrack,
    musicState: defaultMusicState,
    queue: JIGSAW_MUSIC_CATALOG.slice(1, 6),
    history: [],
    controlMode: 'everyone',

    volume: 0.7,
    isMuted: false,
    currentTime: 0,
    duration: defaultTrack.duration,

    isCenterModalOpen: false,
    activeTab: 'library',

    youtubeQuery: '',
    youtubeResults: [],
    isSearchingYoutube: false,
    syncEnabled: true,

    setCenterModalOpen: (open) => set({ isCenterModalOpen: open }),
    setActiveTab: (tab) => set({ activeTab: tab }),
    setYoutubeQuery: (query) => set({ youtubeQuery: query }),

    searchYouTube: async (query: string) => {
      set({ isSearchingYoutube: true, youtubeQuery: query });
      try {
        const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          set({ youtubeResults: data.tracks || [], isSearchingYoutube: false });
        } else {
          set({ isSearchingYoutube: false });
        }
      } catch (err) {
        console.warn('[useMusicStore] searchYouTube error:', err);
        set({ isSearchingYoutube: false });
      }
    },

    uploadAudioFile: async (file: File, uploadedBy: string): Promise<MusicTrack | null> => {
      try {
        const url = URL.createObjectURL(file);
        const fileName = file.name.replace(/\.[^/.]+$/, '');
        const track: MusicTrack = {
          id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: fileName,
          artist: uploadedBy || 'Uploaded Track',
          thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
          audioUrl: url,
          duration: 180,
          category: 'Uploaded',
          source: 'upload',
          uploadedBy,
        };

        // Add to queue
        get().addToQueue(track, true);
        return track;
      } catch (err) {
        console.error('[useMusicStore] uploadAudioFile error:', err);
        return null;
      }
    },

    playTrack: async (track: MusicTrack, broadcast: boolean = true) => {
      const now = Date.now();
      const nextState: MusicState = {
        source: track.source,
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        isPlaying: true,
        position: 0,
        volume: get().volume,
        updatedAt: now,
        updatedBy: 'Player',
      };

      set((state) => ({
        currentTrack: track,
        musicState: nextState,
        currentTime: 0,
        duration: track.duration,
        history: state.currentTrack ? [state.currentTrack, ...state.history.slice(0, 19)] : state.history,
      }));

      await engine.loadTrack(track, 0, true);

      if (broadcast && get().onBroadcastMusicState) {
        get().onBroadcastMusicState!(nextState, get().queue, get().controlMode);
      }
    },

    togglePlay: async (broadcast: boolean = true) => {
      const { musicState, currentTrack, currentTime } = get();
      const nextPlaying = !musicState.isPlaying;
      const now = Date.now();

      const nextState: MusicState = {
        ...musicState,
        isPlaying: nextPlaying,
        position: currentTime,
        updatedAt: now,
      };

      set({ musicState: nextState });

      if (nextPlaying) {
        if (!engine.getCurrentTrack() || engine.getCurrentTrack()?.id !== currentTrack.id) {
          await engine.loadTrack(currentTrack, currentTime, true);
        } else {
          await engine.play();
        }
      } else {
        engine.pause();
      }

      if (broadcast && get().onBroadcastMusicState) {
        get().onBroadcastMusicState!(nextState, get().queue, get().controlMode);
      }
    },

    pause: (broadcast: boolean = true) => {
      const { musicState, currentTime } = get();
      const nextState: MusicState = {
        ...musicState,
        isPlaying: false,
        position: currentTime,
        updatedAt: Date.now(),
      };
      set({ musicState: nextState });
      engine.pause();

      if (broadcast && get().onBroadcastMusicState) {
        get().onBroadcastMusicState!(nextState, get().queue, get().controlMode);
      }
    },

    seek: (position: number, broadcast: boolean = true) => {
      const now = Date.now();
      const { musicState } = get();
      const nextState: MusicState = {
        ...musicState,
        position,
        updatedAt: now,
      };

      set({
        currentTime: position,
        musicState: nextState,
      });

      engine.seek(position);

      if (broadcast && get().onBroadcastMusicState) {
        get().onBroadcastMusicState!(nextState, get().queue, get().controlMode);
      }
    },

    setVolume: (volume: number) => {
      const clamped = Math.max(0, Math.min(1, volume));
      set({ volume: clamped, isMuted: clamped === 0 });
      engine.setVolume(clamped);
    },

    toggleMute: () => {
      const next = !get().isMuted;
      set({ isMuted: next });
      engine.setMuted(next);
    },

    addToQueue: (track: MusicTrack, broadcast: boolean = true) => {
      const nextQueue = [...get().queue, track];
      set({ queue: nextQueue });

      if (broadcast && get().onBroadcastMusicState) {
        get().onBroadcastMusicState!(get().musicState, nextQueue, get().controlMode);
      }
    },

    removeFromQueue: (trackId: string, broadcast: boolean = true) => {
      const nextQueue = get().queue.filter((t) => t.id !== trackId);
      set({ queue: nextQueue });

      if (broadcast && get().onBroadcastMusicState) {
        get().onBroadcastMusicState!(get().musicState, nextQueue, get().controlMode);
      }
    },

    reorderQueue: (fromIndex: number, toIndex: number, broadcast: boolean = true) => {
      const newQueue = [...get().queue];
      const [moved] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, moved);
      set({ queue: newQueue });

      if (broadcast && get().onBroadcastMusicState) {
        get().onBroadcastMusicState!(get().musicState, newQueue, get().controlMode);
      }
    },

    playNext: async (broadcast: boolean = true) => {
      const { queue } = get();
      if (queue.length === 0) return;

      const [nextTrack, ...remaining] = queue;
      set({ queue: remaining });

      await get().playTrack(nextTrack, broadcast);
    },

    playPrevious: async (broadcast: boolean = true) => {
      const { history } = get();
      if (history.length === 0) return;

      const [prevTrack, ...remainingHistory] = history;
      set({ history: remainingHistory });

      await get().playTrack(prevTrack, broadcast);
    },

    clearQueue: (broadcast: boolean = true) => {
      set({ queue: [] });
      if (broadcast && get().onBroadcastMusicState) {
        get().onBroadcastMusicState!(get().musicState, [], get().controlMode);
      }
    },

    setControlMode: (mode: MusicControlMode, broadcast: boolean = true) => {
      set({ controlMode: mode });
      if (broadcast && get().onBroadcastMusicState) {
        get().onBroadcastMusicState!(get().musicState, get().queue, mode);
      }
    },

    applyRemoteMusicState: async (remoteState: MusicState, remoteQueue?: MusicTrack[], remoteMode?: MusicControlMode) => {
      if (!get().syncEnabled) return;

      const current = get();

      // Update queue and permissions if provided
      if (remoteQueue) set({ queue: remoteQueue });
      if (remoteMode) set({ controlMode: remoteMode });

      // If track changed, load new track
      if (remoteState.trackId !== current.musicState.trackId) {
        // Find track in catalog, queue, or reconstruct from remote state
        let trackToLoad: MusicTrack | undefined =
          JIGSAW_MUSIC_CATALOG.find((t) => t.id === remoteState.trackId) ||
          current.queue.find((t) => t.id === remoteState.trackId);

        if (!trackToLoad) {
          trackToLoad = {
            id: remoteState.trackId,
            title: remoteState.title,
            artist: remoteState.artist,
            thumbnail: remoteState.thumbnail || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300&auto=format&fit=crop&q=80',
            youtubeVideoId: remoteState.source === 'youtube' ? remoteState.trackId.replace('youtube-', '') : undefined,
            duration: 240,
            category: remoteState.source === 'youtube' ? 'YouTube' : 'Cozy',
            source: remoteState.source,
          };
        }

        const elapsed = remoteState.isPlaying ? Math.max(0, (Date.now() - remoteState.updatedAt) / 1000) : 0;
        const targetPos = remoteState.position + elapsed;

        set({
          currentTrack: trackToLoad,
          musicState: remoteState,
          currentTime: targetPos,
          duration: trackToLoad.duration,
        });

        await engine.loadTrack(trackToLoad, targetPos, remoteState.isPlaying);
      } else {
        // Same track: sync play/pause state and correct clock drift
        set({ musicState: remoteState });

        if (remoteState.isPlaying && !engine.getIsPlaying()) {
          await engine.play();
        } else if (!remoteState.isPlaying && engine.getIsPlaying()) {
          engine.pause();
        }

        engine.syncWithServerState(remoteState);
      }
    },

    setBroadcastDispatcher: (fn) => {
      set({ onBroadcastMusicState: fn });
    },
  };
});
