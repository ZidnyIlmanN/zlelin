'use client';

import React, { useState, useRef } from 'react';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import { useMusicStore } from '@/application/use-music-store';
import { useAuthStore } from '@/application/use-auth-store';
import { sendRoomChatMessage } from '@/application/use-realtime-room';
import { Disc, Play, Pause, SkipForward, Send, MessageSquare, Maximize2, Volume, Volume1, Volume2, VolumeX } from 'lucide-react';
import Image from 'next/image';

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
    seek,
    setCenterModalOpen,
  } = useMusicStore();
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

  const handleTogglePlay = () => {
    if (!canControl) {
      addToast(`Only host (${roomConfig.hostName}) can control music in this room.`);
      return;
    }
    togglePlay(true);
  };

  const handlePlayNext = () => {
    if (!canControl) {
      addToast(`Only host (${roomConfig.hostName}) can control music in this room.`);
      return;
    }
    playNext(true);
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

  return (
    <div className={`absolute bottom-6 z-40 glass-panel px-5 py-3 rounded-[2rem] shadow-float flex items-center gap-5 border border-white/70 max-w-3xl w-full mx-4 backdrop-blur-xl transition-all duration-300 ${className || 'left-1/2 -translate-x-1/2'}`}>
      {/* Collaborative Music Mini Player */}
      <div className="flex items-center gap-3 border-r border-cream-200/80 pr-5 flex-1 min-w-0 relative">
        <button
          onClick={() => setCenterModalOpen(true)}
          className="relative w-11 h-11 rounded-2xl overflow-hidden shadow-sm shrink-0 group ring-1 ring-amber-900/10"
          title="Open Collaborative Music Hub"
        >
          <Image
            src={currentTrack.thumbnail}
            alt={currentTrack.title}
            fill
            unoptimized
            className={`object-cover ${musicState.isPlaying ? 'animate-spin' : ''}`}
            style={{ animationDuration: '8s' }}
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            <Maximize2 className="w-3.5 h-3.5 text-white" />
          </div>
        </button>

        <div className="overflow-hidden min-w-0 flex-1 cursor-pointer" onClick={() => setCenterModalOpen(true)}>
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="overflow-hidden min-w-0 flex-1 relative text-mask-fade">
              {currentTrack.title.length > 22 ? (
                <div className="animate-marquee-scroll">
                  <span className="text-xs font-bold text-warmbrown-600 pr-8 inline-block">
                    {currentTrack.title}
                  </span>
                  <span className="text-xs font-bold text-warmbrown-600 pr-8 inline-block">
                    {currentTrack.title}
                  </span>
                </div>
              ) : (
                <p className="text-xs font-bold text-warmbrown-600 truncate" title={currentTrack.title}>
                  {currentTrack.title}
                </p>
              )}
            </div>
            <span className="px-1.5 py-0.2 rounded-full bg-cream-200 text-warmbrown-600 text-[8px] font-bold uppercase shrink-0">
              {currentTrack.source}
            </span>
          </div>
          <p className="text-[10px] text-neutral-500 truncate">{currentTrack.artist}</p>

          {/* Mini Progress Bar */}
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 h-1 bg-cream-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-900 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, (currentTime / (duration || 180)) * 100))}%`,
                }}
              />
            </div>
            <span className="text-[9px] text-neutral-400 font-mono shrink-0">{formatTime(currentTime)}</span>
          </div>
        </div>

        {/* Mini Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleTogglePlay}
            className="w-8 h-8 rounded-full bg-amber-900 text-white flex items-center justify-center text-xs hover:bg-amber-800 transition shadow-sm"
            title={
              !canControl
                ? `Only host (${roomConfig.hostName}) can control music`
                : musicState.isPlaying
                ? 'Pause'
                : 'Play'
            }
          >
            {musicState.isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={handlePlayNext}
            className="w-7 h-7 rounded-full bg-cream-200 text-warmbrown-600 flex items-center justify-center text-xs hover:bg-cream-300 transition"
            title={!canControl ? `Only host (${roomConfig.hostName}) can control music` : 'Next Track'}
          >
            <SkipForward className="w-3 h-3 fill-current" />
          </button>

          {/* Speaker Button with Volume Popover on Hover */}
          <div
            className="relative flex items-center justify-center py-1"
            onMouseEnter={handleVolumeMouseEnter}
            onMouseLeave={handleVolumeMouseLeave}
          >
            {/* Hover Volume Popup Card with Seamless Hit Area Bridge */}
            <div
              className={`absolute bottom-full pb-2.5 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 ${
                isVolumeHovered
                  ? 'opacity-100 translate-y-0 visible pointer-events-auto'
                  : 'opacity-0 translate-y-2 invisible pointer-events-none'
              }`}
              onMouseEnter={handleVolumeMouseEnter}
              onMouseLeave={handleVolumeMouseLeave}
            >
              <div className="p-2.5 px-3 rounded-2xl bg-white/95 backdrop-blur-xl border border-cream-300 shadow-float flex items-center gap-2.5 w-44">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                  className="text-neutral-500 hover:text-amber-900 transition shrink-0"
                  title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-coral-500" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-4 h-4 text-amber-900" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-amber-900" />
                  )}
                </button>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                  }}
                  className="flex-1 accent-amber-900 h-1.5 rounded-lg cursor-pointer bg-cream-200"
                />

                <span className="text-[10px] font-mono font-bold text-warmbrown-600 w-7 text-right shrink-0">
                  {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                </span>
              </div>
            </div>

            {/* Speaker Button */}
            <button
              onClick={toggleMute}
              onContextMenu={(e) => {
                e.preventDefault();
                setCenterModalOpen(true);
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition ${
                musicState.isPlaying && !isMuted
                  ? 'bg-amber-100/90 text-amber-900 hover:bg-amber-200'
                  : 'bg-cream-200 text-neutral-400 hover:bg-cream-300'
              }`}
              title={isMuted ? 'Unmute Audio (Hover for volume)' : 'Mute Audio (Hover for volume)'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-coral-500" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-3.5 h-3.5 text-amber-900" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-amber-900" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Spatial Chat Input & Modal Toggle */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a friendly message..."
          className="w-full min-w-0 bg-white/80 px-4 py-2 rounded-2xl text-xs text-warmbrown-600 border border-cream-300 focus:outline-none focus:ring-1 focus:ring-sage-500"
        />
        <button
          onClick={handleSend}
          disabled={!inputVal.trim()}
          className="w-8 h-8 rounded-full bg-sage-500 text-white flex items-center justify-center text-xs shrink-0 hover:bg-sage-600 disabled:opacity-40 disabled:hover:bg-sage-500 transition"
          title="Send message"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setChatModalOpen(true)}
          className="relative w-8 h-8 rounded-full bg-cream-200 text-warmbrown-600 flex items-center justify-center text-xs shrink-0 hover:bg-cream-300 transition"
          title="Open full room chat"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {chatHistory.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-coral-500 text-white text-[9px] font-bold flex items-center justify-center">
              {chatHistory.length > 9 ? '9+' : chatHistory.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

