'use client';

import React, { useState, useRef } from 'react';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import { useMusicStore } from '@/application/use-music-store';
import { useAudioSettingsStore } from '@/application/use-audio-settings-store';
import { useAuthStore } from '@/application/use-auth-store';
import { sendRoomChatMessage } from '@/application/use-realtime-room';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ArrowUp,
  MessageCircle,
  Volume1,
  Volume2,
  VolumeX,
  Smile,
} from 'lucide-react';
import Image from 'next/image';

function DockYouTubeBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#2a2a2a] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
      <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" aria-hidden>
        <path
          fill="#ff0000"
          d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8z"
        />
        <path fill="#fff" d="M9.75 15.02l6.22-3.52-6.22-3.52v7.04z" />
      </svg>
      YouTube
    </span>
  );
}

function DockSourceBadge({ source }: { source: string }) {
  if (source === 'youtube') return <DockYouTubeBadge />;
  return (
    <span className="inline-flex shrink-0 items-center rounded-md bg-[#2a2a2a] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
      {source}
    </span>
  );
}

export function FloatingDock({ className = '' }: { className?: string }) {
  const { addChatMessage, chatHistory, setChatModalOpen, roomConfig, addToast, participants } = useWorkspaceStore();
  const {
    currentTrack,
    musicState,
    currentTime,
    duration,
    volume,
    setVolume,
    isMuted,
    controlMode,
    togglePlay,
    toggleMute,
    playNext,
    playPrevious,
    seek,
    setCenterModalOpen,
  } = useMusicStore();
  const { voiceVolume, sfxVolume, setVoiceVolume, setSfxVolume } = useAudioSettingsStore();
  const { user } = useAuthStore();

  const [inputVal, setInputVal] = useState('');
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  const volumeLeaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleVolumeMouseEnter = () => {
    if (volumeLeaveTimerRef.current) {
      clearTimeout(volumeLeaveTimerRef.current);
      volumeLeaveTimerRef.current = null;
    }
    setIsVolumeHovered(true);
  };

  const handleVolumeMouseLeave = () => {
    if (volumeLeaveTimerRef.current) {
      clearTimeout(volumeLeaveTimerRef.current);
    }
    volumeLeaveTimerRef.current = setTimeout(() => {
      setIsVolumeHovered(false);
    }, 450);
  };

  const isHost =
    !user ||
    user.fullName === roomConfig.hostName ||
    user.username === roomConfig.hostName ||
    participants.find((p) => p.id === user?.id)?.isHost ||
    participants.length <= 1;

  const canControl = controlMode === 'everyone' || isHost;

  const guardControl = () => {
    if (!canControl) {
      addToast(`Only host (${roomConfig.hostName}) can control music in this room.`);
      return false;
    }
    return true;
  };

  const handleTogglePlay = () => {
    if (!guardControl()) return;
    togglePlay(true);
  };

  const handlePlayNext = () => {
    if (!guardControl()) return;
    playNext(true);
  };

  const handlePlayPrevious = () => {
    if (!guardControl()) return;
    playPrevious(true);
  };

  const handleSeek = (value: number) => {
    if (!guardControl()) return;
    seek(value, true);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSend = () => {
    const text = inputVal.trim();
    if (text) {
      const sender = user?.fullName || user?.username || 'You';
      addChatMessage(sender, text);
      sendRoomChatMessage(text);
      setInputVal('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const progressPercent = Math.min(100, Math.max(0, (currentTime / (duration || 180)) * 100));

  return (
    <div
      className={`absolute bottom-5 z-40 mx-4 flex w-[calc(100%-2rem)] max-w-5xl items-center gap-3 rounded-full border border-[#1e3a2f]/70 bg-[#121212]/92 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-300 sm:gap-4 sm:px-5 ${className || 'left-1/2 -translate-x-1/2'}`}
    >
      {/* Music info + progress */}
      <div className="flex min-w-0 flex-[1.4] items-center gap-3">
        <button
          onClick={() => setCenterModalOpen(true)}
          className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-lg shadow-md ring-1 ring-white/10"
          title="Open Music Center"
        >
          <Image src={currentTrack.thumbnail} alt={currentTrack.title} fill unoptimized className="object-cover" />
          <div className="absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#a3e635] text-black shadow-sm">
            {musicState.isPlaying ? (
              <Pause className="h-2.5 w-2.5 fill-current" />
            ) : (
              <Play className="ml-px h-2.5 w-2.5 fill-current" />
            )}
          </div>
        </button>

        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setCenterModalOpen(true)}>
          <div className="flex min-w-0 items-center gap-2">
            <div className="relative min-w-0 flex-1 overflow-hidden text-mask-fade">
              {currentTrack.title.length > 20 ? (
                <div className="animate-marquee-scroll">
                  <span className="inline-block pr-8 text-xs font-bold uppercase tracking-wide text-white sm:text-sm">
                    {currentTrack.title}
                  </span>
                  <span className="inline-block pr-8 text-xs font-bold uppercase tracking-wide text-white sm:text-sm">
                    {currentTrack.title}
                  </span>
                </div>
              ) : (
                <p className="truncate text-xs font-bold uppercase tracking-wide text-white sm:text-sm" title={currentTrack.title}>
                  {currentTrack.title}
                </p>
              )}
            </div>
            <DockSourceBadge source={currentTrack.source} />
          </div>
          <p className="truncate text-[11px] text-white/45">{currentTrack.artist}</p>

          <div className="mt-1.5 flex items-center gap-2">
            <span className="shrink-0 font-mono text-[10px] text-white/40">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 180}
              step={0.5}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="dock-progress-slider min-w-0 flex-1"
              style={{ '--progress': `${progressPercent}%` } as React.CSSProperties}
              title="Seek"
            />
            <span className="shrink-0 font-mono text-[10px] text-white/40">{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Playback controls */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          onClick={handlePlayPrevious}
          className="flex h-8 w-8 items-center justify-center text-white/60 transition hover:text-white"
          title={!canControl ? `Only host (${roomConfig.hostName}) can control music` : 'Previous track'}
        >
          <SkipBack className="h-4 w-4 fill-current" />
        </button>

        <button
          onClick={handleTogglePlay}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#a3e635] text-black transition hover:bg-[#b8f04a] sm:h-12 sm:w-12"
          title={
            !canControl
              ? `Only host (${roomConfig.hostName}) can control music`
              : musicState.isPlaying
                ? 'Pause'
                : 'Play'
          }
        >
          {musicState.isPlaying ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          )}
        </button>

        <button
          onClick={handlePlayNext}
          className="flex h-8 w-8 items-center justify-center text-white/60 transition hover:text-white"
          title={!canControl ? `Only host (${roomConfig.hostName}) can control music` : 'Next track'}
        >
          <SkipForward className="h-4 w-4 fill-current" />
        </button>

        <div
          className="relative flex items-center justify-center"
          onMouseEnter={handleVolumeMouseEnter}
          onMouseLeave={handleVolumeMouseLeave}
        >
          <div
            className={`absolute bottom-full left-1/2 z-50 mb-2.5 -translate-x-1/2 transition-all duration-200 ${
              isVolumeHovered
                ? 'pointer-events-auto visible translate-y-0 opacity-100'
                : 'pointer-events-none invisible translate-y-2 opacity-0'
            }`}
            onMouseEnter={handleVolumeMouseEnter}
            onMouseLeave={handleVolumeMouseLeave}
          >
            <div className="w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a]/95 p-3 shadow-[0_12px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <div className="flex flex-col gap-2.5">
                <div className="grid grid-cols-[24px_16px_minmax(0,1fr)] items-center gap-x-2">
                  <span className="text-[9px] font-semibold text-white/50">MUS</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                    className="flex h-4 w-4 items-center justify-center text-white/50 transition hover:text-[#a3e635]"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-3.5 w-3.5 text-red-400" />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <div className="min-w-0 overflow-hidden">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="dock-progress-slider dock-volume-slider h-1 w-full cursor-pointer"
                      style={{ '--progress': `${(isMuted ? 0 : volume) * 100}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-[24px_16px_minmax(0,1fr)] items-center gap-x-2">
                  <span className="text-[9px] font-semibold text-white/50">VOX</span>
                  <span />
                  <div className="min-w-0 overflow-hidden">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={voiceVolume}
                      onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                      className="dock-progress-slider dock-volume-slider h-1 w-full cursor-pointer"
                      style={{ '--progress': `${voiceVolume * 100}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-[24px_16px_minmax(0,1fr)] items-center gap-x-2">
                  <span className="text-[9px] font-semibold text-white/50">SFX</span>
                  <span />
                  <div className="min-w-0 overflow-hidden">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={sfxVolume}
                      onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                      className="dock-progress-slider dock-volume-slider h-1 w-full cursor-pointer"
                      style={{ '--progress': `${sfxVolume * 100}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={toggleMute}
            onContextMenu={(e) => {
              e.preventDefault();
              setCenterModalOpen(true);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2a2a2a] text-white/80 transition hover:bg-[#333] hover:text-white"
            title={isMuted ? 'Unmute (hover for volume)' : 'Mute (hover for volume)'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4 text-red-400" />
            ) : volume < 0.5 ? (
              <Volume1 className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="hidden h-10 w-px shrink-0 bg-white/10 sm:block" />

      {/* Chat input */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a friendly message..."
            className="w-full rounded-full border border-white/[0.06] bg-[#1a1a1a] py-2.5 pl-4 pr-10 text-xs text-white placeholder:text-white/30 focus:border-[#a3e635]/40 focus:outline-none focus:ring-1 focus:ring-[#a3e635]/30 sm:text-sm"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 transition hover:text-white/60"
            title="Emoji"
            tabIndex={-1}
          >
            <Smile className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={handleSend}
          disabled={!inputVal.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7eb564] text-black transition hover:bg-[#8ec872] disabled:cursor-not-allowed disabled:opacity-40"
          title="Send message"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2} />
        </button>

        <button
          onClick={() => setChatModalOpen(true)}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2a2a2a] text-white/80 transition hover:bg-[#333] hover:text-white"
          title="Open full room chat"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
          {chatHistory.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#a3e635] text-[9px] font-bold text-black">
              {chatHistory.length > 9 ? '9+' : chatHistory.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
