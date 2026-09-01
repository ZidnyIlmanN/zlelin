import { SyncPlaybackState, DriftCorrection, SYNC_THRESHOLDS } from './types';

export function getSyncTimestamp(state: SyncPlaybackState): number {
  return state.serverTimestamp ?? state.updatedAt ?? Date.now();
}

export function computeExpectedPosition(state: SyncPlaybackState, now: number = Date.now()): number {
  if (!state.isPlaying) {
    return state.position;
  }

  const elapsed = Math.max(0, (now - getSyncTimestamp(state)) / 1000);
  return state.position + elapsed;
}

export function evaluateDrift(
  currentPosition: number,
  state: SyncPlaybackState,
  now: number = Date.now()
): DriftCorrection {
  const expectedPosition = computeExpectedPosition(state, now);
  const drift = Math.abs(currentPosition - expectedPosition);

  let action: DriftCorrection['action'] = 'ignore';

  if (drift >= SYNC_THRESHOLDS.seekDriftSec) {
    action = 'seek';
  } else if (drift >= SYNC_THRESHOLDS.ignoreDriftSec) {
    action = 'nudge';
  }

  return { action, expectedPosition, drift };
}

export function shouldRunDriftCheck(lastCheckMs: number, now: number = Date.now()): boolean {
  return now - lastCheckMs >= SYNC_THRESHOLDS.checkIntervalMs;
}
