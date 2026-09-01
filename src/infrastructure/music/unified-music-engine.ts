import { MusicTrack, MusicState } from '@/domain/music';
import { MusicProvider, MusicProviderEvents } from './music-provider';
import { JigsawAudioProvider } from './jigsaw-audio-provider';
import { YouTubeAudioProvider } from './youtube-audio-provider';
import { UploadAudioProvider } from './upload-audio-provider';
import { AudioEngine } from '@/infrastructure/audio/audio-engine';
import { evaluateDrift, shouldRunDriftCheck } from '@/infrastructure/audio/music-sync';

const FADE_IN_MS = 400;
const FADE_OUT_MS = 200;

export class UnifiedMusicEngine {
  private static instance: UnifiedMusicEngine | null = null;

  private readonly audioEngine: AudioEngine;
  private jigsawProvider: JigsawAudioProvider;
  private youtubeProvider: YouTubeAudioProvider;
  private uploadProvider: UploadAudioProvider;

  private activeProvider: MusicProvider;
  private currentTrack: MusicTrack | null = null;

  private events: MusicProviderEvents = {};
  private lastDriftCheck = 0;
  private driftCheckInterval: number | null = null;

  private constructor() {
    this.audioEngine = AudioEngine.getInstance();
    this.jigsawProvider = new JigsawAudioProvider();
    this.youtubeProvider = new YouTubeAudioProvider(() => this.audioEngine.getMusicEffectiveVolume());
    this.uploadProvider = new UploadAudioProvider();

    this.audioEngine.setVolumeRequestCallback(() => this.audioEngine.getMusicEffectiveVolume());
    this.youtubeProvider.setVolumeRequestCallback(() => this.audioEngine.getMusicEffectiveVolume());

    this.activeProvider = this.jigsawProvider;
    this.attachProviderEvents();
    this.startDriftMonitor();
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

  private selectProviderForTrack(track: MusicTrack): MusicProvider {
    if (track.source === 'youtube') {
      return this.youtubeProvider;
    }
    if (track.source === 'upload') {
      return this.uploadProvider;
    }
    return this.jigsawProvider;
  }

  private startDriftMonitor(): void {
    if (typeof window === 'undefined') return;
    this.driftCheckInterval = window.setInterval(() => {
      // Drift monitor runs via syncWithServerState when remote state is available
    }, 3000);
  }

  private stopDriftMonitor(): void {
    if (this.driftCheckInterval !== null) {
      clearInterval(this.driftCheckInterval);
      this.driftCheckInterval = null;
    }
  }

  public async loadTrack(track: MusicTrack, startPosition: number = 0, autoPlay: boolean = false): Promise<void> {
    const targetProvider = this.selectProviderForTrack(track);
    const switchingProvider = this.activeProvider !== targetProvider;

    if (switchingProvider && this.getIsPlaying() && this.activeProvider.type !== 'youtube') {
      await this.fadeOut(FADE_OUT_MS);
    }

    if (switchingProvider) {
      this.activeProvider.pause();
      this.activeProvider = targetProvider;
    }

    this.currentTrack = track;
    await this.audioEngine.resume();
    await this.activeProvider.load(track, startPosition, autoPlay);

    if (autoPlay) {
      if (track.source === 'youtube') {
        await this.youtubeProvider.fadeIn(FADE_IN_MS);
      } else {
        await this.audioEngine.getBus('music').fadeIn(FADE_IN_MS);
      }
    }

    if (track.source === 'youtube') {
      this.youtubeProvider.setVolume(0);
    } else if (switchingProvider) {
      // Restore bus output when returning to Web Audio providers
      this.audioEngine.getBus('music').setVolume(this.audioEngine.getBus('music').getVolume());
    }
  }

  public async play(): Promise<void> {
    await this.audioEngine.resume();
    await this.activeProvider.play();
    if (this.activeProvider.type === 'youtube') {
      this.youtubeProvider.setVolume(0);
    }
  }

  public pause(): void {
    this.activeProvider.pause();
  }

  public seek(position: number): void {
    this.activeProvider.seek(position);
  }

  public setVolume(volume: number): void {
    this.audioEngine.getBus('music').setVolume(volume);
    if (this.activeProvider.type === 'youtube') {
      this.youtubeProvider.setVolume(0);
    }
  }

  public setMuted(muted: boolean): void {
    this.audioEngine.getBus('music').setMuted(muted);
    if (this.activeProvider.type === 'youtube') {
      this.youtubeProvider.setVolume(0);
    }
  }

  public async fadeIn(durationMs: number = FADE_IN_MS): Promise<void> {
    if (this.activeProvider.type === 'youtube') {
      await this.youtubeProvider.fadeIn(durationMs);
    } else {
      await this.audioEngine.getBus('music').fadeIn(durationMs);
    }
  }

  public async fadeOut(durationMs: number = FADE_OUT_MS): Promise<void> {
    if (this.activeProvider.type === 'youtube') {
      await this.youtubeProvider.fadeOut(durationMs);
    } else {
      await this.audioEngine.getBus('music').fadeOut(durationMs);
    }
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

  public syncWithServerState(state: MusicState): void {
    const now = Date.now();

    if (!shouldRunDriftCheck(this.lastDriftCheck, now)) return;
    this.lastDriftCheck = now;

    const currentPosition = this.getCurrentTime();
    const correction = evaluateDrift(currentPosition, {
      isPlaying: state.isPlaying,
      position: state.position,
      serverTimestamp: state.serverTimestamp ?? state.updatedAt ?? now,
      updatedAt: state.updatedAt,
    }, now);

    if (correction.action === 'seek') {
      console.log(
        `[UnifiedMusicEngine] Correcting playback drift: ${correction.drift.toFixed(2)}s -> expected: ${correction.expectedPosition.toFixed(2)}s`
      );
      this.seek(correction.expectedPosition);
    } else if (correction.action === 'nudge') {
      // Moderate drift: allow natural convergence; seek only if drift grows
      if (correction.drift > 0.75) {
        this.seek(correction.expectedPosition);
      }
    }
  }

  public destroy(): void {
    this.stopDriftMonitor();
    this.jigsawProvider.destroy();
    this.youtubeProvider.destroy();
    this.uploadProvider.destroy();
    this.currentTrack = null;
    UnifiedMusicEngine.instance = null;
  }
}
