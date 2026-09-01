import { MusicTrack } from '@/domain/music';
import { MusicProvider, MusicProviderEvents } from './music-provider';
import { AudioEngine } from '@/infrastructure/audio/audio-engine';
import { MusicProcessingChain } from '@/infrastructure/audio/music-processing-chain';
import { getLoudnessGainDb } from '@/infrastructure/audio/loudness-normalizer';

export class JigsawAudioProvider implements MusicProvider {
  readonly type = 'jigsaw';
  private audio: HTMLAudioElement | null = null;
  private events: MusicProviderEvents = {};
  private currentTrack: MusicTrack | null = null;
  private isPlaying = false;
  private timeUpdateInterval: number | null = null;
  private musicChain: MusicProcessingChain | null = null;
  private synthCtx: AudioContext | null = null;
  private synthOscs: OscillatorNode[] = [];
  private synthGain: GainNode | null = null;
  private loadRetryCount = 0;
  private readonly audioEngine: AudioEngine;

  constructor() {
    this.audioEngine = AudioEngine.getInstance();
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.crossOrigin = 'anonymous';
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
      if (this.loadRetryCount < 1 && this.currentTrack?.audioUrl) {
        this.loadRetryCount++;
        const url = this.currentTrack.audioUrl;
        setTimeout(() => {
          if (this.audio && this.currentTrack) {
            this.audio.src = url;
            this.audio.load();
          }
        }, 500);
        return;
      }
      console.warn('[JigsawAudioProvider] Audio source failed, activating ambient synthesizer fallback');
      this.startSynthesizedAmbient();
      this.events.onReady?.();
    });

    this.audio.addEventListener('canplay', () => {
      this.loadRetryCount = 0;
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
    this.loadRetryCount = 0;
    this.stopSynthesizedAmbient();

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
          // Autoplay policy fallback
        }
      }
    } else {
      this.startSynthesizedAmbient();
    }
  }

  async play(): Promise<void> {
    await this.audioEngine.resume();

    if (this.synthCtx && this.synthGain) {
      const busVolume = this.audioEngine.getBus('music').getEffectiveGain();
      this.synthGain.gain.setValueAtTime(busVolume * 0.15, this.synthCtx.currentTime);
      this.isPlaying = true;
      this.events.onStateChange?.(true);
      return;
    }

    if (this.audio) {
      try {
        await this.audio.play();
      } catch (err: unknown) {
        console.warn('[JigsawAudioProvider] Play rejected:', err);
      }
    }
  }

  pause(): void {
    if (this.synthCtx && this.synthGain) {
      this.synthGain.gain.setValueAtTime(0, this.synthCtx.currentTime);
      this.isPlaying = false;
      this.events.onStateChange?.(false);
      return;
    }

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

  private startSynthesizedAmbient() {
    try {
      const ctx = this.audioEngine.getContext();
      if (!ctx) return;

      this.stopSynthesizedAmbient();
      this.synthCtx = ctx;
      this.synthGain = ctx.createGain();
      const busVolume = this.audioEngine.getBus('music').getEffectiveGain();
      this.synthGain.gain.setValueAtTime(this.isPlaying ? busVolume * 0.15 : 0, ctx.currentTime);
      this.synthGain.connect(this.audioEngine.getBus('music').getInput());

      const frequencies = [130.81, 196.0, 246.94, 329.63, 293.66];
      this.synthOscs = frequencies.map((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.connect(this.synthGain!);
        osc.start();
        return osc;
      });
    } catch {
      // Ignore audio context errors
    }
  }

  private stopSynthesizedAmbient() {
    this.synthOscs.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore
      }
    });
    this.synthOscs = [];
    if (this.synthGain) {
      try {
        this.synthGain.disconnect();
      } catch {
        // ignore
      }
      this.synthGain = null;
    }
    this.synthCtx = null;
  }

  destroy(): void {
    this.stopTimeTracker();
    this.stopSynthesizedAmbient();
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
