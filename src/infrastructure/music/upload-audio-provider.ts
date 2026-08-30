import { MusicTrack } from '@/domain/music';
import { MusicProvider, MusicProviderEvents } from './music-provider';

export class UploadAudioProvider implements MusicProvider {
  readonly type = 'upload';
  private audio: HTMLAudioElement | null = null;
  private events: MusicProviderEvents = {};
  private currentTrack: MusicTrack | null = null;
  private isPlaying = false;
  private volume = 0.7;
  private timeUpdateInterval: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.setupAudioListeners();
    }
  }

  setEvents(events: MusicProviderEvents) {
    this.events = events;
  }

  private setupAudioListeners() {
    if (!this.audio) return;

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.events.onStateChange?.(true);
      this.startTimeTracker();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.events.onStateChange?.(false);
      this.stopTimeTracker();
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.events.onStateChange?.(false);
      this.stopTimeTracker();
      this.events.onEnded?.();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('[UploadAudioProvider] Audio playback error:', e);
      this.events.onError?.('Failed to play uploaded audio file');
    });

    this.audio.addEventListener('canplay', () => {
      this.events.onReady?.();
    });
  }

  private startTimeTracker() {
    this.stopTimeTracker();
    this.timeUpdateInterval = window.setInterval(() => {
      if (this.audio && !this.audio.paused) {
        this.events.onTimeUpdate?.(this.audio.currentTime, this.audio.duration || this.currentTrack?.duration || 0);
      }
    }, 250);
  }

  private stopTimeTracker() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  async load(track: MusicTrack, startPosition: number = 0, autoPlay: boolean = false): Promise<void> {
    this.currentTrack = track;

    if (!this.audio) return;

    if (track.audioUrl) {
      this.audio.src = track.audioUrl;
      this.audio.volume = this.volume;

      if (startPosition > 0) {
        this.audio.currentTime = startPosition;
      }

      if (autoPlay) {
        try {
          await this.audio.play();
        } catch {
          // Autoplay policy waiting for user interaction
        }
      }
    }
  }

  async play(): Promise<void> {
    if (this.audio) {
      try {
        await this.audio.play();
      } catch (err) {
        console.warn('[UploadAudioProvider] play rejected:', err);
      }
    }
  }

  pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  seek(position: number): void {
    if (this.audio && !isNaN(position) && isFinite(position)) {
      this.audio.currentTime = Math.max(0, Math.min(position, this.getDuration()));
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  getCurrentTime(): number {
    return this.audio ? this.audio.currentTime : 0;
  }

  getDuration(): number {
    return this.audio && !isNaN(this.audio.duration) && this.audio.duration > 0
      ? this.audio.duration
      : (this.currentTrack?.duration || 180);
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  destroy(): void {
    this.stopTimeTracker();
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.currentTrack = null;
    this.isPlaying = false;
  }
}
