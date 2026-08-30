import { MusicTrack, MusicState } from '@/domain/music';
import { MusicProvider, MusicProviderEvents } from './music-provider';
import { JigsawAudioProvider } from './jigsaw-audio-provider';
import { YouTubeAudioProvider } from './youtube-audio-provider';
import { UploadAudioProvider } from './upload-audio-provider';

export class UnifiedMusicEngine {
  private static instance: UnifiedMusicEngine | null = null;

  private jigsawProvider: JigsawAudioProvider;
  private youtubeProvider: YouTubeAudioProvider;
  private uploadProvider: UploadAudioProvider;

  private activeProvider: MusicProvider;
  private currentTrack: MusicTrack | null = null;
  private volume = 0.7;
  private isMuted = false;

  private events: MusicProviderEvents = {};
  private lastDriftCheck = 0;

  private constructor() {
    this.jigsawProvider = new JigsawAudioProvider();
    this.youtubeProvider = new YouTubeAudioProvider();
    this.uploadProvider = new UploadAudioProvider();

    this.activeProvider = this.jigsawProvider;
    this.attachProviderEvents();
  }

  public static getInstance(): UnifiedMusicEngine {
    if (!UnifiedMusicEngine.instance) {
      UnifiedMusicEngine.instance = new UnifiedMusicEngine();
    }
    return UnifiedMusicEngine.instance;
  }

  public setEvents(events: MusicProviderEvents) {
    this.events = events;
    this.attachProviderEvents();
  }

  private attachProviderEvents() {
    const wrappedEvents: MusicProviderEvents = {
      onTimeUpdate: (current, duration) => {
        this.events.onTimeUpdate?.(current, duration);
      },
      onStateChange: (isPlaying) => {
        this.events.onStateChange?.(isPlaying);
      },
      onEnded: () => {
        this.events.onEnded?.();
      },
      onError: (err) => {
        this.events.onError?.(err);
      },
      onReady: () => {
        this.events.onReady?.();
      },
    };

    this.jigsawProvider.setEvents(wrappedEvents);
    this.youtubeProvider.setEvents(wrappedEvents);
    this.uploadProvider.setEvents(wrappedEvents);
  }

  /**
   * Switch active provider based on track source type.
   */
  private selectProviderForTrack(track: MusicTrack): MusicProvider {
    if (track.source === 'youtube') {
      return this.youtubeProvider;
    }
    if (track.source === 'upload') {
      return this.uploadProvider;
    }
    return this.jigsawProvider;
  }

  /**
   * Load and play track across provider boundaries.
   */
  public async loadTrack(track: MusicTrack, startPosition: number = 0, autoPlay: boolean = false): Promise<void> {
    const targetProvider = this.selectProviderForTrack(track);

    // If switching between different providers, pause the previous one
    if (this.activeProvider !== targetProvider) {
      this.activeProvider.pause();
      this.activeProvider = targetProvider;
    }

    this.currentTrack = track;
    this.activeProvider.setVolume(this.isMuted ? 0 : this.volume);
    await this.activeProvider.load(track, startPosition, autoPlay);
  }

  public async play(): Promise<void> {
    await this.activeProvider.play();
  }

  public pause(): void {
    this.activeProvider.pause();
  }

  public seek(position: number): void {
    this.activeProvider.seek(position);
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.activeProvider.setVolume(this.isMuted ? 0 : this.volume);
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.activeProvider.setVolume(this.isMuted ? 0 : this.volume);
  }

  public getCurrentTime(): number {
    return this.activeProvider.getCurrentTime();
  }

  public getDuration(): number {
    return this.activeProvider.getDuration();
  }

  public getIsPlaying(): boolean {
    return this.activeProvider.getIsPlaying();
  }

  public getCurrentTrack(): MusicTrack | null {
    return this.currentTrack;
  }

  /**
   * Clock Drift Alignment Engine
   * Calculates expected playback time based on server timestamp and corrects drift.
   */
  public syncWithServerState(state: MusicState): void {
    const now = Date.now();
    const elapsedSinceUpdate = state.isPlaying ? Math.max(0, (now - state.updatedAt) / 1000) : 0;
    const expectedPosition = state.position + elapsedSinceUpdate;

    const currentPosition = this.getCurrentTime();
    const drift = Math.abs(currentPosition - expectedPosition);

    // Throttle drift corrections to avoid constant seeking (every 1.5s)
    if (now - this.lastDriftCheck < 1500) return;
    this.lastDriftCheck = now;

    // 1. If drift is small (< 0.35s), ignore to ensure buttery smooth audio
    if (drift < 0.35) {
      return;
    }

    // 2. If drift is moderate to large (> 1.0s) or track paused/seeked, synchronize position
    if (drift > 1.0) {
      console.log(`[UnifiedMusicEngine] Correcting playback drift: ${drift.toFixed(2)}s -> expected: ${expectedPosition.toFixed(2)}s`);
      this.seek(expectedPosition);
    }
  }

  public destroy(): void {
    this.jigsawProvider.destroy();
    this.youtubeProvider.destroy();
    this.uploadProvider.destroy();
    this.currentTrack = null;
    UnifiedMusicEngine.instance = null;
  }
}
