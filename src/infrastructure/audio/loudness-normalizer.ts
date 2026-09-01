import { MusicTrack } from '@/domain/music';

const DEFAULT_GAIN_DB = 0;

export function getLoudnessGainDb(track: MusicTrack | null | undefined): number {
  if (!track || track.loudnessGainDb === undefined) {
    return DEFAULT_GAIN_DB;
  }
  return track.loudnessGainDb;
}

export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

export function linearToDb(linear: number): number {
  if (linear <= 0) return -Infinity;
  return 20 * Math.log10(linear);
}

export function applyLoudnessGain(gainNode: GainNode, loudnessGainDb: number): void {
  const linear = dbToLinear(loudnessGainDb);
  gainNode.gain.setValueAtTime(linear, gainNode.context.currentTime);
}
