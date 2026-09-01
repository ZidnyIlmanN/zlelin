import { AudioBusId } from './types';

export class AudioBus {
  readonly id: AudioBusId;
  private readonly gainNode: GainNode;
  private volume = 1;
  private muted = false;
  private duckGain = 1;
  constructor(id: AudioBusId, ctx: AudioContext, destination: AudioNode) {
    this.id = id;
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 1;
    this.gainNode.connect(destination);
  }

  public getInput(): GainNode {
    return this.gainNode;
  }

  public getEffectiveGain(): number {
    if (this.muted) return 0;
    return this.volume * this.duckGain;
  }

  public getOutputGain(): number {
    return this.gainNode.gain.value;
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.applyGain();
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyGain();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setDuckGain(duckGain: number): void {
    this.duckGain = Math.max(0, Math.min(1, duckGain));
    this.applyGain();
  }

  public rampDuckGain(targetDuck: number, durationMs: number): void {
    const clamped = Math.max(0, Math.min(1, targetDuck));
    const ctx = this.gainNode.context;
    const now = ctx.currentTime;

    this.duckGain = clamped;

    if (durationMs <= 0) {
      this.applyGain();
      return;
    }

    const target = this.getEffectiveGain();
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(target, now + durationMs / 1000);
  }

  public getDuckGain(): number {
    return this.duckGain;
  }

  private applyGain(): void {
    const ctx = this.gainNode.context;
    const target = this.getEffectiveGain();
    this.gainNode.gain.setValueAtTime(target, ctx.currentTime);
  }

  public fadeTo(targetGain: number, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const ctx = this.gainNode.context;
      const now = ctx.currentTime;
      const clampedTarget = Math.max(0, Math.min(1, targetGain));

      if (durationMs <= 0) {
        this.gainNode.gain.setValueAtTime(clampedTarget, now);
        resolve();
        return;
      }

      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
      this.gainNode.gain.linearRampToValueAtTime(clampedTarget, now + durationMs / 1000);

      window.setTimeout(resolve, durationMs);
    });
  }

  public fadeIn(durationMs: number): Promise<void> {
    const effective = this.getEffectiveGain();
    this.gainNode.gain.setValueAtTime(0, this.gainNode.context.currentTime);
    return this.fadeTo(effective, durationMs);
  }

  public fadeOut(durationMs: number): Promise<void> {
    return this.fadeTo(0, durationMs);
  }

  public disconnect(): void {
    try {
      this.gainNode.disconnect();
    } catch {
      // already disconnected
    }
  }
}
