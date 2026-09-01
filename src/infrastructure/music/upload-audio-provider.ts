import { MusicTrack } from '@/domain/music';
import { MusicProvider, MusicProviderEvents } from './music-provider';
import { AudioEngine } from '@/infrastructure/audio/audio-engine';
import { MusicProcessingChain } from '@/infrastructure/audio/music-processing-chain';
import { getLoudnessGainDb } from '@/infrastructure/audio/loudness-normalizer';

export class UploadAudioProvider implements MusicProvider {
  readonly type = 'upload';
  private audio: HTMLAudioElement | null = null;
  private events: MusicProviderEvents = {};
  private currentTrack: MusicTrack | null = null;
  private isPlaying = false;
  private timeUpdateInterval: number | null = null;
  private musicChain: MusicProcessingChain | null = null;
  private readonly audioEngine: AudioEngine;

  constructor() {
    this.audioEngine = AudioEngine.getInstance();
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

    this.audio.addEventListener('error', () => {
      console.warn('[UploadAudioProvider] Audio playback error');
      this.events.onError?.('Failed to play uploaded audio file');
    });

    this.audio.addEventListener('canplay', () => {
      this.events.onReady?.();
    });
  }

  private ensureMusicChain(track: MusicTrack): void {
    if (!this.audio) return;

    const loudnessDb = getLoudnessGainDb(track);
    if (!this.musicChain) {
      this.musicChain = this.audioEngine.createMusicChain(this.audio, loudnessDb);
    } else {
      this.musicChain.connectElement(this.audio, loudnessDb);
    }
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
      this.ensureMusicChain(track);
      this.audio.src = track.audioUrl;
      this.audio.volume = 1;

      if (startPosition > 0) {
        this.audio.currentTime = startPosition;
      }

      if (autoPlay) {
        await this.audioEngine.resume();
        try {
          await this.audio.play();
        } catch {
          // Autoplay policy waiting for user interaction
        }
      }
    }
  }

  async play(): Promise<void> {
    await this.audioEngine.resume();
    if (this.audio) {
      try {
        await this.audio.play();
      } catch (err) {
        console.warn('[UploadAudioProvider] Play rejected:', err);
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

  setVolume(_volume: number): void {
    // Volume controlled via AudioEngine music bus
  }

  async fadeIn(durationMs: number): Promise<void> {
    await this.audioEngine.getBus('music').fadeIn(durationMs);
  }

  async fadeOut(durationMs: number): Promise<void> {
    await this.audioEngine.getBus('music').fadeOut(durationMs);
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
    this.musicChain?.destroy();
    this.musicChain = null;
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.currentTrack = null;
    this.isPlaying = false;
  }
}
