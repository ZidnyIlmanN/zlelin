import { applyLoudnessGain } from './loudness-normalizer';

export class MusicProcessingChain {
  private readonly ctx: AudioContext;
  private readonly sourceGain: GainNode;
  private readonly normalizationGain: GainNode;
  private readonly eqHighPass: BiquadFilterNode;
  private readonly eqPresence: BiquadFilterNode;
  private readonly compressor: DynamicsCompressorNode;
  private readonly limiter: DynamicsCompressorNode;
  private readonly output: GainNode;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private connectedElement: HTMLAudioElement | null = null;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;

    this.sourceGain = ctx.createGain();
    this.normalizationGain = ctx.createGain();
    this.eqHighPass = ctx.createBiquadFilter();
    this.eqPresence = ctx.createBiquadFilter();
    this.compressor = ctx.createDynamicsCompressor();
    this.limiter = ctx.createDynamicsCompressor();
    this.output = ctx.createGain();

    this.eqHighPass.type = 'highpass';
    this.eqHighPass.frequency.value = 35;
    this.eqHighPass.Q.value = 0.7;

    this.eqPresence.type = 'peaking';
    this.eqPresence.frequency.value = 2500;
    this.eqPresence.Q.value = 1;
    this.eqPresence.gain.value = 1.5;

    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 6;
    this.compressor.ratio.value = 2;
    this.compressor.attack.value = 0.02;
    this.compressor.release.value = 0.2;

    this.limiter.threshold.value = -3;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.08;

    this.sourceGain.connect(this.normalizationGain);
    this.normalizationGain.connect(this.eqHighPass);
    this.eqHighPass.connect(this.eqPresence);
    this.eqPresence.connect(this.compressor);
    this.compressor.connect(this.limiter);
    this.limiter.connect(this.output);
    this.output.connect(destination);

    this.output.gain.value = 1;
    applyLoudnessGain(this.normalizationGain, 0);
  }

  public connectElement(element: HTMLAudioElement, loudnessGainDb: number = 0): void {
    if (this.connectedElement === element && this.mediaSource) {
      applyLoudnessGain(this.normalizationGain, loudnessGainDb);
      return;
    }

    this.disconnectElement();

    element.volume = 1;
    element.crossOrigin = 'anonymous';

    try {
      this.mediaSource = this.ctx.createMediaElementSource(element);
      this.mediaSource.connect(this.sourceGain);
      this.connectedElement = element;
      applyLoudnessGain(this.normalizationGain, loudnessGainDb);
    } catch (err) {
      console.warn('[MusicProcessingChain] Failed to create MediaElementSource:', err);
      this.mediaSource = null;
      this.connectedElement = null;
    }
  }

  public connectNode(source: AudioNode): void {
    source.connect(this.sourceGain);
  }

  public setLoudnessGainDb(loudnessGainDb: number): void {
    applyLoudnessGain(this.normalizationGain, loudnessGainDb);
  }

  public getInput(): GainNode {
    return this.sourceGain;
  }

  public disconnectElement(): void {
    if (this.mediaSource) {
      try {
        this.mediaSource.disconnect();
      } catch {
        // ignore
      }
      this.mediaSource = null;
    }
    this.connectedElement = null;
  }

  public destroy(): void {
    this.disconnectElement();
    try {
      this.output.disconnect();
    } catch {
      // ignore
    }
  }
}
