'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import { MUSIC_TRACKS, MusicTrackId } from '@/domain/theme';
import { Music, X, Check, Disc } from 'lucide-react';

export function MusicModal() {
  const {
    isMusicModalOpen,
    setMusicModalOpen,
    selectedMusicTrack,
    setMusicTrack,
    isPlayingMusic,
    toggleMusic,
  } = useWorkspaceStore();

  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Open animation
  useEffect(() => {
    if (isMusicModalOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    }
  }, [isMusicModalOpen]);

  // Close with animation
  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      setMusicModalOpen(false);
    }, 250);
  }, [setMusicModalOpen]);

  const handleSelectTrack = (trackId: MusicTrackId) => {
    setMusicTrack(trackId);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 select-none">
      {/* Dark Backdrop (No blur) */}
      <div
        className={`absolute inset-0 bg-black/80 transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Modal Panel */}
      <div
        className={`relative w-full max-w-md rounded-[2.5rem] bg-[#0F1513] border border-white/5 shadow-2xl overflow-hidden text-white transition-all duration-300 ease-out ${
          isAnimating
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-4 opacity-0 scale-95'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#788A75] text-white flex items-center justify-center shadow-sm">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-white">Music Selector</h2>
              <p className="text-xs text-neutral-400">Background Ambience</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Track List */}
        <div className="px-5 py-4 space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
          {MUSIC_TRACKS.map((track) => {
            const isActive = selectedMusicTrack === track.id;
            return (
              <button
                key={track.id}
                onClick={() => handleSelectTrack(track.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl transition-all duration-200 text-left ${
                  isActive
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'bg-white/[0.02] hover:bg-white/[0.05] text-neutral-300'
                }`}
              >
                {/* Disc Icon */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-[#788A75] text-white' : 'bg-white/5 text-neutral-400'
                  }`}
                >
                  <Disc
                    className={`w-4 h-4 ${isActive ? 'animate-spin' : ''}`}
                    style={{ animationDuration: '8s' }}
                  />
                </div>

                {/* Track Info */}
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">{track.title}</p>
                  <p className="text-[11px] text-neutral-400 truncate">{track.subtitle}</p>
                </div>

                {/* Active Check */}
                {isActive && (
                  <div className="w-5 h-5 rounded-full bg-[#788A75] flex items-center justify-center text-white shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Play/Pause Footer */}
        <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-neutral-400 font-medium">
            {isPlayingMusic ? '♪ Now Playing' : '♪ Paused'}
          </span>
          <button
            onClick={toggleMusic}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
              isPlayingMusic
                ? 'bg-white/10 text-white hover:bg-white/15'
                : 'bg-[#788A75] hover:bg-[#687A65] text-white'
            }`}
          >
            {isPlayingMusic ? 'Pause' : 'Play'}
          </button>
        </div>
      </div>
    </div>
  );
}
