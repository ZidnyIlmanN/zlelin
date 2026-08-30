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
      // Delay to allow the DOM to render before triggering the animation
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
    }, 350); // Match the CSS transition duration
  }, [setMusicModalOpen]);

  const handleSelectTrack = (trackId: MusicTrackId) => {
    setMusicTrack(trackId);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ease-out ${
          isAnimating ? 'bg-black/40' : 'bg-black/0'
        }`}
        onClick={handleClose}
      />

      {/* Modal Panel */}
      <div
        className={`relative w-full max-w-md mx-4 mb-4 rounded-3xl overflow-hidden shadow-2xl transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isAnimating
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-full opacity-0 scale-95'
        }`}
        style={{ transitionDuration: '350ms' }}
      >
        {/* Gradient Header */}
        <div className="bg-gradient-to-br from-amber-800 via-amber-900 to-stone-900 px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <Music className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Pilih Lagu</h2>
                <p className="text-xs text-amber-200/70">Synchronized music session</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white/80" />
            </button>
          </div>
        </div>

        {/* Track List */}
        <div className="bg-gradient-to-b from-stone-50 to-white px-4 py-4 space-y-2">
          {MUSIC_TRACKS.map((track, index) => {
            const isActive = selectedMusicTrack === track.id;
            return (
              <button
                key={track.id}
                onClick={() => handleSelectTrack(track.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-amber-900 text-white shadow-lg shadow-amber-900/20 scale-[1.02]'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/60 hover:border-stone-300 hover:scale-[1.01]'
                }`}
                style={{
                  transitionDelay: isAnimating ? `${index * 50}ms` : '0ms',
                  animation: isAnimating ? `musicItemSlideIn 0.4s ease-out ${index * 60}ms both` : 'none'
                }}
              >
                {/* Disc Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-white/20' : 'bg-stone-100 group-hover:bg-stone-200'
                }`}>
                  <Disc className={`w-5 h-5 ${
                    isActive ? 'text-amber-200 animate-spin' : 'text-stone-400'
                  }`} style={{ animationDuration: '8s' }} />
                </div>

                {/* Track Info */}
                <div className="flex-1 text-left">
                  <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-stone-700'}`}>
                    {track.title}
                  </p>
                  <p className={`text-xs mt-0.5 ${isActive ? 'text-amber-200/70' : 'text-stone-400'}`}>
                    {track.subtitle}
                  </p>
                </div>

                {/* Active Check */}
                {isActive && (
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-amber-200" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Play/Pause Footer */}
        <div className="bg-white border-t border-stone-100 px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-stone-400 font-medium">
            {isPlayingMusic ? '♪ Sedang memutar' : '♪ Dijeda'}
          </span>
          <button
            onClick={toggleMusic}
            className={`px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
              isPlayingMusic
                ? 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                : 'bg-amber-900 text-white hover:bg-amber-800 shadow-md'
            }`}
          >
            {isPlayingMusic ? 'Pause' : 'Play'}
          </button>
        </div>
      </div>
    </div>
  );
}
