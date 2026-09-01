type StateChangeCallback = (state: AudioContextState) => void;

export class AudioContextManager {
  private static instance: AudioContextManager | null = null;
  private ctx: AudioContext | null = null;
  private listeners = new Set<StateChangeCallback>();
  private resumeBound = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.bindResumeHandlers();
    }
  }

  public static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    return AudioContextManager.instance;
  }

  public getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return null;

      this.ctx = new AudioCtxClass();
      this.ctx.addEventListener('statechange', () => {
        if (this.ctx) {
          this.listeners.forEach((cb) => cb(this.ctx!.state));
        }
      });
    }

    return this.ctx;
  }

  public getState(): AudioContextState | 'unavailable' {
    return this.ctx?.state ?? 'unavailable';
  }

  public onStateChange(callback: StateChangeCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public async resume(): Promise<boolean> {
    const ctx = this.getContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }

    return ctx.state === 'running';
  }

  private bindResumeHandlers() {
    if (this.resumeBound || typeof window === 'undefined') return;
    this.resumeBound = true;

    const tryResume = () => {
      void this.resume();
    };

    window.addEventListener('pointerdown', tryResume, { passive: true });
    window.addEventListener('keydown', tryResume, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.resume();
      }
    });
  }

  public destroy(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.listeners.clear();
    AudioContextManager.instance = null;
  }
}
