import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AudioEngine } from '@/infrastructure/audio/audio-engine';

interface AudioSettingsState {
  musicVolume: number;
  voiceVolume: number;
  sfxVolume: number;
  musicMuted: boolean;
  voiceMuted: boolean;
  sfxMuted: boolean;
  voiceDuckingEnabled: boolean;
  duckingAmountDb: number;

  setMusicVolume: (volume: number) => void;
  setVoiceVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  toggleMusicMute: () => void;
  toggleVoiceMute: () => void;
  toggleSfxMute: () => void;
  setVoiceDuckingEnabled: (enabled: boolean) => void;
  setDuckingAmountDb: (db: number) => void;
}

function applyBusSettings(
  musicVolume: number,
  voiceVolume: number,
  sfxVolume: number,
  musicMuted: boolean,
  voiceMuted: boolean,
  sfxMuted: boolean,
  voiceDuckingEnabled: boolean,
  duckingAmountDb: number
) {
  if (typeof window === 'undefined') return;

  try {
    const engine = AudioEngine.getInstance();
    engine.getBus('music').setVolume(musicVolume);
    engine.getBus('music').setMuted(musicMuted);
    engine.getBus('voice').setVolume(voiceVolume);
    engine.getBus('voice').setMuted(voiceMuted);
    engine.getBus('sfx').setVolume(sfxVolume);
    engine.getBus('sfx').setMuted(sfxMuted);
    engine.setVoiceDuckingEnabled(voiceDuckingEnabled);
    engine.setVoiceDuckingConfig({ amountDb: duckingAmountDb });
  } catch {
    // AudioEngine not yet initialized
  }
}

export const useAudioSettingsStore = create<AudioSettingsState>()(
  persist(
    (set, get) => ({
      musicVolume: 0.7,
      voiceVolume: 0.8,
      sfxVolume: 0.6,
      musicMuted: false,
      voiceMuted: false,
      sfxMuted: false,
      voiceDuckingEnabled: true,
      duckingAmountDb: 6,

      setMusicVolume: (volume) => {
        const clamped = Math.max(0, Math.min(1, volume));
        set({ musicVolume: clamped, musicMuted: clamped === 0 });
        const s = get();
        applyBusSettings(
          clamped,
          s.voiceVolume,
          s.sfxVolume,
          clamped === 0,
          s.voiceMuted,
          s.sfxMuted,
          s.voiceDuckingEnabled,
          s.duckingAmountDb
        );
      },

      setVoiceVolume: (volume) => {
        const clamped = Math.max(0, Math.min(1, volume));
        set({ voiceVolume: clamped, voiceMuted: clamped === 0 });
        const s = get();
        applyBusSettings(
          s.musicVolume,
          clamped,
          s.sfxVolume,
          s.musicMuted,
          clamped === 0,
          s.sfxMuted,
          s.voiceDuckingEnabled,
          s.duckingAmountDb
        );
      },

      setSfxVolume: (volume) => {
        const clamped = Math.max(0, Math.min(1, volume));
        set({ sfxVolume: clamped, sfxMuted: clamped === 0 });
        const s = get();
        applyBusSettings(
          s.musicVolume,
          s.voiceVolume,
          clamped,
          s.musicMuted,
          s.voiceMuted,
          clamped === 0,
          s.voiceDuckingEnabled,
          s.duckingAmountDb
        );
      },

      toggleMusicMute: () => {
        const next = !get().musicMuted;
        set({ musicMuted: next });
        const s = get();
        applyBusSettings(
          s.musicVolume,
          s.voiceVolume,
          s.sfxVolume,
          next,
          s.voiceMuted,
          s.sfxMuted,
          s.voiceDuckingEnabled,
          s.duckingAmountDb
        );
      },

      toggleVoiceMute: () => {
        const next = !get().voiceMuted;
        set({ voiceMuted: next });
        const s = get();
        applyBusSettings(
          s.musicVolume,
          s.voiceVolume,
          s.sfxVolume,
          s.musicMuted,
          next,
          s.sfxMuted,
          s.voiceDuckingEnabled,
          s.duckingAmountDb
        );
      },

      toggleSfxMute: () => {
        const next = !get().sfxMuted;
        set({ sfxMuted: next });
        const s = get();
        applyBusSettings(
          s.musicVolume,
          s.voiceVolume,
          s.sfxVolume,
          s.musicMuted,
          s.voiceMuted,
          next,
          s.voiceDuckingEnabled,
          s.duckingAmountDb
        );
      },

      setVoiceDuckingEnabled: (enabled) => {
        set({ voiceDuckingEnabled: enabled });
        const s = get();
        applyBusSettings(
          s.musicVolume,
          s.voiceVolume,
          s.sfxVolume,
          s.musicMuted,
          s.voiceMuted,
          s.sfxMuted,
          enabled,
          s.duckingAmountDb
        );
      },

      setDuckingAmountDb: (db) => {
        const clamped = Math.max(4, Math.min(8, db));
        set({ duckingAmountDb: clamped });
        const s = get();
        applyBusSettings(
          s.musicVolume,
          s.voiceVolume,
          s.sfxVolume,
          s.musicMuted,
          s.voiceMuted,
          s.sfxMuted,
          s.voiceDuckingEnabled,
          clamped
        );
      },
    }),
    {
      name: 'zlelin-audio-settings',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyBusSettings(
            state.musicVolume,
            state.voiceVolume,
            state.sfxVolume,
            state.musicMuted,
            state.voiceMuted,
            state.sfxMuted,
            state.voiceDuckingEnabled,
            state.duckingAmountDb
          );
        }
      },
    }
  )
);

export function initializeAudioSettings(): void {
  const s = useAudioSettingsStore.getState();
  applyBusSettings(
    s.musicVolume,
    s.voiceVolume,
    s.sfxVolume,
    s.musicMuted,
    s.voiceMuted,
    s.sfxMuted,
    s.voiceDuckingEnabled,
    s.duckingAmountDb
  );
}
