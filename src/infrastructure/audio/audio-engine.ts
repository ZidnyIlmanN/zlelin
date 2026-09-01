import { AudioContextManager } from './audio-context-manager';
import { AudioBus } from './audio-bus';
import { MusicProcessingChain } from './music-processing-chain';
import { VoiceDucker } from './voice-ducker';
import { AudioBusId, DEFAULT_DUCKING_CONFIG, VoiceDuckingConfig } from './types';

type VolumeRequestCallback = () => number;

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  private readonly contextManager: AudioContextManager;
  private masterGain: GainNode | null = null;
  private readonly buses: Map<AudioBusId, AudioBus> = new Map();
  private voiceDucker: VoiceDucker | null = null;
  private musicChains: MusicProcessingChain[] = [];
  private volumeRequestCallback: VolumeRequestCallback | null = null;
  private destroyed = false;

  private constructor() {
    this.contextManager = AudioContextManager.getInstance();
    this.initializeGraph();
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  private initializeGraph(): void {
    const ctx = this.contextManager.getContext();
    if (!ctx) return;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 1;
    this.masterGain.connect(ctx.destination);

    const busIds: AudioBusId[] = ['music', 'voice', 'sfx'];
    for (const id of busIds) {
      const bus = new AudioBus(id, ctx, this.masterGain);
      this.buses.set(id, bus);
    }

    const musicBus = this.buses.get('music');
    const voiceBus = this.buses.get('voice');
    if (musicBus && voiceBus) {
      this.voiceDucker = new VoiceDucker(ctx, musicBus, voiceBus.getInput(), DEFAULT_DUCKING_CONFIG);
    }
  }

  public async resume(): Promise<boolean> {
    return this.contextManager.resume();
  }

  public getContext(): AudioContext | null {
    return this.contextManager.getContext();
  }

  public getBus(id: AudioBusId): AudioBus {
    const bus = this.buses.get(id);
    if (!bus) {
      throw new Error(`Audio bus "${id}" not initialized`);
    }
    return bus;
  }

  public getMusicEffectiveVolume(): number {
    // YouTube volume is isolated from the Web Audio bus output gain (which may be
    // faded to 0 during Jigsaw/upload playback). Use the configured bus level instead.
    return this.getBus('music').getEffectiveGain();
  }

  public setVolumeRequestCallback(callback: VolumeRequestCallback): void {
    this.volumeRequestCallback = callback;
  }

  public getExternalMusicVolume(): number {
    if (this.volumeRequestCallback) {
      return this.volumeRequestCallback();
    }
    return this.getMusicEffectiveVolume();
  }

  public createMusicChain(element: HTMLAudioElement, loudnessGainDb: number = 0): MusicProcessingChain | null {
    const ctx = this.contextManager.getContext();
    const musicBus = this.buses.get('music');
    if (!ctx || !musicBus) return null;

    const chain = new MusicProcessingChain(ctx, musicBus.getInput());
    chain.connectElement(element, loudnessGainDb);
    this.musicChains.push(chain);
    return chain;
  }

  public connectVoiceStream(stream: MediaStream, peerId: string): void {
    const ctx = this.contextManager.getContext();
    if (!ctx || !this.voiceDucker) return;
    this.voiceDucker.connectStream(ctx, stream, peerId);
  }

  public disconnectVoiceStream(peerId: string): void {
    this.voiceDucker?.disconnectStream(peerId);
  }

  public setVoiceDuckingEnabled(enabled: boolean): void {
    this.voiceDucker?.setEnabled(enabled);
  }

  public setVoiceDuckingConfig(config: Partial<VoiceDuckingConfig>): void {
    this.voiceDucker?.setConfig(config);
  }

  public playSfx(generator: (ctx: AudioContext, dest: AudioNode) => void): void {
    const ctx = this.contextManager.getContext();
    const sfxBus = this.buses.get('sfx');
    if (!ctx || !sfxBus) return;

    void this.resume();
    generator(ctx, sfxBus.getInput());
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.musicChains.forEach((chain) => chain.destroy());
    this.musicChains = [];

    this.voiceDucker?.destroy();
    this.voiceDucker = null;

    this.buses.forEach((bus) => bus.disconnect());
    this.buses.clear();

    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // ignore
      }
      this.masterGain = null;
    }

    this.contextManager.destroy();
    AudioEngine.instance = null;
  }
}
