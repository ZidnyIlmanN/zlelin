import { AudioBus } from './audio-bus';
import { DEFAULT_DUCKING_CONFIG, VoiceDuckingConfig } from './types';

export class VoiceDucker {
  private readonly musicBus: AudioBus;
  private readonly analyser: AnalyserNode;
  private config: VoiceDuckingConfig;
  private rafId: number | null = null;
  private currentDuck = 1;
  private voiceSources: Map<string, MediaStreamAudioSourceNode> = new Map();
  private voiceAnalysers: AnalyserNode[] = [];
  private readonly voiceInput: GainNode;
  private readonly dataArray: Uint8Array<ArrayBuffer>;

  constructor(
    ctx: AudioContext,
    musicBus: AudioBus,
    voiceBusInput: GainNode,
    config: VoiceDuckingConfig = DEFAULT_DUCKING_CONFIG
  ) {
    this.musicBus = musicBus;
    this.config = { ...config };
    this.voiceInput = voiceBusInput;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.5;
    this.voiceInput.connect(this.analyser);
    this.dataArray = new Uint8Array(this.analyser.fftSize) as Uint8Array<ArrayBuffer>;
  }

  public setConfig(config: Partial<VoiceDuckingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public connectStream(ctx: AudioContext, stream: MediaStream, peerId: string): void {
    this.disconnectStream(peerId);

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      const source = ctx.createMediaStreamSource(stream);
      source.connect(this.voiceInput);

      const peerAnalyser = ctx.createAnalyser();
      peerAnalyser.fftSize = 512;
      peerAnalyser.smoothingTimeConstant = 0.5;
      source.connect(peerAnalyser);

      this.voiceSources.set(peerId, source);
      this.voiceAnalysers.push(peerAnalyser);

      if (this.rafId === null && this.config.enabled) {
        this.startMonitoring();
      }
    } catch (err) {
      console.warn('[VoiceDucker] Failed to connect stream:', err);
    }
  }

  public disconnectStream(peerId: string): void {
    const source = this.voiceSources.get(peerId);
    if (source) {
      try {
        source.disconnect();
      } catch {
        // ignore
      }
      this.voiceSources.delete(peerId);
    }

    if (this.voiceSources.size === 0) {
      this.stopMonitoring();
      this.setDuckGain(1, this.config.releaseMs);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.stopMonitoring();
      this.setDuckGain(1, this.config.releaseMs);
    } else if (this.voiceSources.size > 0) {
      this.startMonitoring();
    }
  }

  private startMonitoring(): void {
    if (this.rafId !== null) return;

    const tick = () => {
      if (!this.config.enabled) {
        this.rafId = requestAnimationFrame(tick);
        return;
      }

      const isSpeaking = this.detectSpeech();
      const duckLinear = dbToLinear(-this.config.amountDb);
      const targetDuck = isSpeaking ? duckLinear : 1;

      if (Math.abs(targetDuck - this.currentDuck) > 0.001) {
        const rampMs = isSpeaking ? this.config.attackMs : this.config.releaseMs;
        this.setDuckGain(targetDuck, rampMs);
        this.currentDuck = targetDuck;
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  private stopMonitoring(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private detectSpeech(): boolean {
    const analysers = this.voiceAnalysers.length > 0 ? this.voiceAnalysers : [this.analyser];

    for (const analyser of analysers) {
      analyser.getByteTimeDomainData(this.dataArray);
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        const normalized = (this.dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / this.dataArray.length);
      if (rms > this.config.rmsThreshold) {
        return true;
      }
    }

    return false;
  }

  private setDuckGain(target: number, rampMs: number): void {
    this.musicBus.rampDuckGain(target, rampMs);
  }

  public destroy(): void {
    this.stopMonitoring();
    this.voiceSources.forEach((source) => {
      try {
        source.disconnect();
      } catch {
        // ignore
      }
    });
    this.voiceSources.clear();
    this.voiceAnalysers = [];
    try {
      this.analyser.disconnect();
    } catch {
      // ignore
    }
  }
}

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}
