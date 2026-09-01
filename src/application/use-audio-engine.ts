import { useRef, useCallback } from 'react';
import { AudioEngine } from '@/infrastructure/audio/audio-engine';

export function useAudioEngine() {
  const audioEngineRef = useRef<AudioEngine | null>(null);

  const getEngine = useCallback(() => {
    if (!audioEngineRef.current) {
      audioEngineRef.current = AudioEngine.getInstance();
    }
    return audioEngineRef.current;
  }, []);

  const playSnapSound = useCallback(() => {
    try {
      const engine = getEngine();
      engine.playSfx((ctx, dest) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(dest);

        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      });
    } catch {
      // Audio context error fallback
    }
  }, [getEngine]);

  return {
    playSnapSound,
  };
}
