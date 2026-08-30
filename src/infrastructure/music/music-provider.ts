import { MusicTrack } from '@/domain/music';

export interface MusicProviderEvents {
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onStateChange?: (isPlaying: boolean) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onReady?: () => void;
}

export interface MusicProvider {
  /** Identifier of the provider type */
  readonly type: 'jigsaw' | 'youtube' | 'upload';

  /** Initialize event callbacks */
  setEvents(events: MusicProviderEvents): void;

  /** Load a track and prepare for playback */
  load(track: MusicTrack, startPosition?: number, autoPlay?: boolean): Promise<void>;

  /** Start or resume playback */
  play(): Promise<void>;

  /** Pause playback */
  pause(): void;

  /** Seek to target position in seconds */
  seek(position: number): void;

  /** Set playback volume (0.0 to 1.0) */
  setVolume(volume: number): void;

  /** Get current playback position in seconds */
  getCurrentTime(): number;

  /** Get total duration of active track in seconds */
  getDuration(): number;

  /** Check if audio is currently playing */
  getIsPlaying(): boolean;

  /** Release resources and stop playback */
  destroy(): void;
}
