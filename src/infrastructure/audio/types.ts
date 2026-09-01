export type AudioBusId = 'music' | 'voice' | 'sfx';

export interface FadeOptions {
  durationMs?: number;
  targetGain?: number;
}

export interface SyncPlaybackState {
  isPlaying: boolean;
  position: number;
  serverTimestamp: number;
  updatedAt?: number;
}

export type DriftAction = 'ignore' | 'nudge' | 'seek';

export interface DriftCorrection {
  action: DriftAction;
  expectedPosition: number;
  drift: number;
}

export interface VoiceDuckingConfig {
  enabled: boolean;
  amountDb: number;
  attackMs: number;
  releaseMs: number;
  rmsThreshold: number;
}

export const DEFAULT_DUCKING_CONFIG: VoiceDuckingConfig = {
  enabled: true,
  amountDb: 6,
  attackMs: 80,
  releaseMs: 400,
  rmsThreshold: 0.02,
};

export const SYNC_THRESHOLDS = {
  ignoreDriftSec: 0.35,
  seekDriftSec: 1.0,
  checkIntervalMs: 1500,
} as const;
