import { MusicTrack } from '@/domain/music';
import { MusicProvider, MusicProviderEvents } from './music-provider';

export class JigsawAudioProvider implements MusicProvider {
  readonly type = 'jigsaw';
  private audio: HTMLAudioElement | null = null;
  private events: MusicProviderEvents = {};
  private currentTrack: MusicTrack | null = null;
  private isPlaying = false;
  private volume = 0.7;
  private timeUpdateInterval: number | null = null;
  private synthCtx: AudioContext | null = null;
  private synthOscs: OscillatorNode[] = [];
  private synthGain: GainNode | null = null;

  constructor() {
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
      console.warn('[JigsawAudioProvider] Audio source failed to load, activating cozy ambient synthesizer fallback');
      this.startSynthesizedAmbient();
      this.events.onReady?.();
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
    this.stopSynthesizedAmbient();

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
          // Autoplay policy fallback: audio waits for explicit user gesture
        }
      }
    } else {
      this.startSynthesizedAmbient();
    }
  }

  async play(): Promise<void> {
    if (this.synthCtx && this.synthGain) {
      this.synthGain.gain.setValueAtTime(this.volume * 0.15, this.synthCtx.currentTime);
      this.isPlaying = true;
      this.events.onStateChange?.(true);
      return;
    }

    if (this.audio) {
      try {
        await this.audio.play();
      } catch (err: any) {
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

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
    if (this.synthCtx && this.synthGain && this.isPlaying) {
      this.synthGain.gain.setValueAtTime(this.volume * 0.15, this.synthCtx.currentTime);
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

  /**
   * Cozy Procedural Ambient Synthesizer (Cmaj7 / Am9 chords)
   * Provides warm, relaxing acoustic/lo-fi tones if external audio streams are blocked.
   */
  private startSynthesizedAmbient() {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.stopSynthesizedAmbient();
      this.synthCtx = new AudioCtx();
      this.synthGain = this.synthCtx.createGain();
      this.synthGain.gain.setValueAtTime(this.isPlaying ? this.volume * 0.15 : 0, this.synthCtx.currentTime);
      this.synthGain.connect(this.synthCtx.destination);

      // Cmaj9 frequencies: C3, G3, B3, E4, D4
      const frequencies = [130.81, 196.0, 246.94, 329.63, 293.66];
      this.synthOscs = frequencies.map((freq, i) => {
        const osc = this.synthCtx!.createOscillator();
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, this.synthCtx!.currentTime);
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
      } catch {}
    });
    this.synthOscs = [];
    if (this.synthCtx) {
      try {
        this.synthCtx.close();
      } catch {}
      this.synthCtx = null;
      this.synthGain = null;
    }
  }

  destroy(): void {
    this.stopTimeTracker();
    this.stopSynthesizedAmbient();
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.currentTrack = null;
    this.isPlaying = false;
  }
}
