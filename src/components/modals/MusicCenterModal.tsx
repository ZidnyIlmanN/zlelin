'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useMusicStore } from '@/application/use-music-store';
import { useAuthStore } from '@/application/use-auth-store';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import {
  MusicCategory,
  MusicTrack,
  JIGSAW_MUSIC_CATEGORIES,
  JIGSAW_MUSIC_CATALOG,
} from '@/domain/music';
import {
  Music,
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Search,
  Upload,
  ListMusic,
  Settings,
  Disc,
  Trash2,
  Plus,
  Radio,
  Clock,
  ShieldCheck,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MoveUp,
  MoveDown,
  Headphones,
  Heart,
  MoreHorizontal,
} from 'lucide-react';
import Image from 'next/image';

export function MusicCenterModal() {
  const {
    isCenterModalOpen,
    setCenterModalOpen,
    currentTrack,
    musicState,
    queue,
    controlMode,
    volume,
    isMuted,
    currentTime,
    duration,
    activeTab,
    setActiveTab,
    youtubeQuery,
    youtubeResults,
    isSearchingYoutube,
    searchYouTube,
    uploadAudioFile,
    playTrack,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    playNext,
    playPrevious,
    clearQueue,
    setControlMode,
  } = useMusicStore();

  const { user } = useAuthStore();
  const { roomConfig, addToast, participants } = useWorkspaceStore();

  const [selectedCategory, setSelectedCategory] = useState<MusicCategory>('All');
  const [searchInput, setSearchInput] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [likedTracks, setLikedTracks] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isHost =
    !user ||
    user.fullName === roomConfig.hostName ||
    user.username === roomConfig.hostName ||
    participants.find((p) => p.id === user?.id)?.isHost ||
    participants.length <= 1;

  const canControl = controlMode === 'everyone' || isHost;

  const handleSetControlMode = (mode: 'everyone' | 'host-only') => {
    if (!isHost) {
      addToast(`Only the host (${roomConfig.hostName}) can change music permissions.`);
      return;
    }
    setControlMode(mode, true);
    addToast(`Music control mode set to: ${mode === 'everyone' ? 'Everyone' : 'Host Only'}`);
  };

  const toggleLike = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedTracks((prev) => ({
      ...prev,
      [trackId]: !prev[trackId],
    }));
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getPlayCount = (id: string, index: number) => {
    // Deterministic formatted play count for music streaming aesthetic
    const base = 450000000 + (index * 83492110) % 650000000;
    return base.toLocaleString('en-US');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      searchYouTube(searchInput.trim());
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('Audio file size exceeds the 25MB limit.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const uploadedBy = user?.fullName || user?.username || 'Player';
    const track = await uploadAudioFile(file, uploadedBy);
    setIsUploading(false);

    if (track) {
      addToast(`Added "${track.title}" to room queue!`);
      setActiveTab('queue');
    } else {
      setUploadError('Failed to process audio file.');
    }
  };

  if (!isCenterModalOpen) return null;

  const filteredJigsawTracks =
    selectedCategory === 'All'
      ? JIGSAW_MUSIC_CATALOG
      : JIGSAW_MUSIC_CATALOG.filter((t) => t.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none">
      {/* Dark Backdrop (No blur) */}
      <div
        className="absolute inset-0 bg-black/80 transition-opacity"
        onClick={() => setCenterModalOpen(false)}
      />

      {/* Main Streaming App Window Container */}
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[2.5rem] bg-[#0F1513] border border-white/5 shadow-2xl overflow-hidden z-10 text-white animate-scale-up">
        
        {/* Top Header & Main Tabs Bar */}
        <div className="flex items-center justify-between px-6 sm:px-8 pt-5 pb-3 border-b border-white/5">
          {/* Left: Section Categories / Tabs */}
          <div className="flex items-center gap-6 overflow-x-auto custom-scrollbar">
            {[
              { id: 'library', label: 'Popular' },
              { id: 'youtube', label: 'YouTube' },
              { id: 'upload', label: 'Upload' },
              { id: 'queue', label: `Queue (${queue.length})` },
              { id: 'settings', label: 'Settings' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative py-1.5 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                    isActive ? 'text-white font-bold' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Room Sync & Close */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
              <Users className="w-3.5 h-3.5 text-sage-400" />
              <span>Room {roomConfig.id}</span>
            </div>

            <button
              onClick={() => setCenterModalOpen(false)}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Host-Only Notice Banner */}
        {!canControl && activeTab !== 'settings' && (
          <div className="mx-6 sm:mx-8 mt-3 px-4 py-2 rounded-2xl bg-white/[0.03] flex items-center justify-between text-xs text-neutral-300 font-medium">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Room music is in <strong>Host-Only</strong> mode. Only <strong>{roomConfig.hostName}</strong> can control tracks.
              </span>
            </div>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-neutral-300 font-semibold shrink-0">
              Listen Only
            </span>
          </div>
        )}

        {/* Tab Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar">
          
          {/* TAB 1: JIGSAW LIBRARY (Flat List view matching reference design) */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              
              {/* Category Filter Links (Clean text pills) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {JIGSAW_MUSIC_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-neutral-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Section Header: The list + count */}
              <div className="flex items-center gap-2 pt-2">
                <h3 className="text-base font-bold text-white font-serif">The list</h3>
                <span className="text-xs text-neutral-500 font-normal">
                  {filteredJigsawTracks.length} songs
                </span>
              </div>

              {/* Flat Track List (Borderless, matching reference image) */}
              <div className="space-y-0.5">
                {filteredJigsawTracks.map((track, idx) => {
                  const isCurrent = currentTrack.id === track.id;
                  const isPlayingThis = isCurrent && musicState.isPlaying;
                  const isLiked = Boolean(likedTracks[track.id]);

                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        if (canControl) playTrack(track, true);
                      }}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-white/[0.06]'
                          : 'hover:bg-white/[0.035]'
                      }`}
                    >
                      {/* Left: Rank/Play Icon + Thumbnail + Title/Artist */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-4">
                        {/* Track Number / Equalizer Animation */}
                        <div className="w-6 text-center shrink-0 flex items-center justify-center">
                          {isPlayingThis ? (
                            <div className="flex items-end gap-0.5 h-3.5">
                              <span className="w-1 bg-[#788A75] rounded-full animate-pulse h-3" />
                              <span className="w-1 bg-[#788A75] rounded-full animate-pulse h-2" style={{ animationDelay: '150ms' }} />
                              <span className="w-1 bg-[#788A75] rounded-full animate-pulse h-3.5" style={{ animationDelay: '300ms' }} />
                            </div>
                          ) : (
                            <span className="text-xs font-mono text-neutral-500 group-hover:hidden">
                              #{idx + 1}
                            </span>
                          )}
                          {!isPlayingThis && (
                            <Play className="w-3.5 h-3.5 text-white fill-current hidden group-hover:block" />
                          )}
                        </div>

                        {/* Thumbnail */}
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-neutral-900 shadow-sm">
                          <Image src={track.thumbnail} alt={track.title} fill className="object-cover" />
                        </div>

                        {/* Song Title & Artist */}
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs sm:text-sm font-medium truncate ${
                              isCurrent ? 'text-sage-300 font-bold' : 'text-white'
                            }`}
                          >
                            {track.title}
                          </p>
                          <p className="text-[11px] text-neutral-400 truncate sm:hidden">
                            {track.artist}
                          </p>
                        </div>
                      </div>

                      {/* Middle: Artist / Category (Desktop) */}
                      <div className="hidden sm:block w-44 text-left overflow-hidden pr-4">
                        <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                      </div>

                      {/* Middle Right: Play count with headphone icon */}
                      <div className="hidden md:flex items-center gap-1.5 w-32 text-neutral-400 text-xs font-mono">
                        <Headphones className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <span className="truncate">{getPlayCount(track.id, idx)}</span>
                      </div>

                      {/* Right: Duration, Like & Add to Queue */}
                      <div className="flex items-center gap-3.5 shrink-0 pl-2">
                        {/* Duration */}
                        <div className="flex items-center gap-1 text-xs text-neutral-400 font-mono">
                          <Clock className="w-3 h-3 text-neutral-500 hidden sm:block" />
                          <span>{formatTime(track.duration)}</span>
                        </div>

                        {/* Like Heart Button */}
                        <button
                          onClick={(e) => toggleLike(track.id, e)}
                          className="text-neutral-500 hover:text-white transition p-1"
                          title="Like track"
                        >
                          <Heart
                            className={`w-4 h-4 transition ${
                              isLiked
                                ? 'fill-[#788A75] text-[#788A75]'
                                : 'text-neutral-500 hover:text-neutral-300'
                            }`}
                          />
                        </button>

                        {/* Add to Queue Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canControl) {
                              addToQueue(track, true);
                              addToast(`Added "${track.title}" to queue`);
                            }
                          }}
                          disabled={!canControl}
                          className="text-neutral-500 hover:text-white transition p-1"
                          title="Add to queue"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: YOUTUBE SEARCH */}
          {activeTab === 'youtube' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search any artist, track, or lofi genre on YouTube..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.04] focus:bg-white/[0.07] text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchingYoutube}
                    className="px-5 py-2.5 rounded-2xl bg-[#788A75] hover:bg-[#687A65] text-white font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                  >
                    {isSearchingYoutube ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Search
                  </button>
                </div>

                {/* Trending Tags */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 custom-scrollbar">
                  <span className="text-[10px] font-semibold text-neutral-500 shrink-0 mr-1">Trending:</span>
                  {[
                    'Lofi Girl',
                    'Nujabes Lofi',
                    'Bruno Mars',
                    'Taylor Swift',
                    'Jazz Cafe Piano',
                    'Cozy Acoustic',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setSearchInput(tag);
                        searchYouTube(tag);
                      }}
                      className="px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.07] text-neutral-300 text-[10px] font-medium transition shrink-0"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </form>

              {/* YouTube Results List (Flat row view) */}
              <div className="space-y-0.5 pt-2">
                {youtubeResults.map((track, idx) => {
                  const isCurrent = currentTrack.id === track.id;
                  const isPlayingThis = isCurrent && musicState.isPlaying;

                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        if (canControl) playTrack(track, true);
                      }}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-white/[0.06]'
                          : 'hover:bg-white/[0.035]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-4">
                        <div className="w-6 text-center shrink-0 flex items-center justify-center">
                          {isPlayingThis ? (
                            <div className="flex items-end gap-0.5 h-3.5">
                              <span className="w-1 bg-[#788A75] rounded-full animate-pulse h-3" />
                              <span className="w-1 bg-[#788A75] rounded-full animate-pulse h-2" style={{ animationDelay: '150ms' }} />
                              <span className="w-1 bg-[#788A75] rounded-full animate-pulse h-3.5" style={{ animationDelay: '300ms' }} />
                            </div>
                          ) : (
                            <span className="text-xs font-mono text-neutral-500 group-hover:hidden">
                              #{idx + 1}
                            </span>
                          )}
                          {!isPlayingThis && (
                            <Play className="w-3.5 h-3.5 text-white fill-current hidden group-hover:block" />
                          )}
                        </div>

                        <div className="relative w-12 h-9 rounded-lg overflow-hidden shrink-0 bg-neutral-900 shadow-sm">
                          <Image src={track.thumbnail} alt={track.title} fill unoptimized className="object-cover" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`text-xs sm:text-sm font-medium truncate ${isCurrent ? 'text-sage-300 font-bold' : 'text-white'}`}>
                            {track.title}
                          </p>
                          <p className="text-[11px] text-neutral-400 truncate">{track.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 pl-2">
                        <span className="text-[10px] text-rose-400 font-medium hidden sm:block">YouTube</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canControl) {
                              addToQueue(track, true);
                              addToast(`Added "${track.title}" to queue`);
                            }
                          }}
                          disabled={!canControl}
                          className="text-neutral-500 hover:text-white transition p-1"
                          title="Add to queue"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: UPLOAD AUDIO */}
          {activeTab === 'upload' && (
            <div className="max-w-md mx-auto space-y-4 text-center py-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 rounded-3xl bg-white/[0.02] hover:bg-white/[0.04] border border-dashed border-white/10 hover:border-white/20 cursor-pointer transition flex flex-col items-center justify-center group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/5 text-neutral-300 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6 text-sage-400" />
                </div>
                <h3 className="text-sm font-bold text-white">Upload Custom Audio File</h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                  Click to upload your custom MP3, WAV, OGG, or M4A audio file.
                </p>
                <span className="mt-3 px-3 py-1 rounded-full bg-white/5 text-neutral-400 text-[10px] font-medium">
                  Max file size: 25MB
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.m4a"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {isUploading && (
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-neutral-300">
                  <Loader2 className="w-4 h-4 animate-spin text-sage-400" /> Processing audio file...
                </div>
              )}

              {uploadError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-300 text-xs font-medium border border-rose-500/20">
                  {uploadError}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: QUEUE */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              {/* Flat Queue List */}
              <div className="flex items-center justify-between pb-1 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white font-serif">Playback Queue</h3>
                  <span className="text-xs text-neutral-500">({queue.length} tracks)</span>
                </div>
                {queue.length > 0 && (
                  <button
                    onClick={() => clearQueue(true)}
                    disabled={!canControl}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" /> Clear Queue
                  </button>
                )}
              </div>

              {queue.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white/[0.02] text-center">
                  <p className="text-xs text-neutral-400">The queue is currently empty.</p>
                  <button
                    onClick={() => setActiveTab('library')}
                    className="mt-2 text-xs font-semibold text-sage-400 hover:text-sage-300"
                  >
                    + Browse Popular Tracks
                  </button>
                </div>
              ) : (
                <div className="space-y-0.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {queue.map((track, idx) => (
                    <div
                      key={`${track.id}-${idx}`}
                      className="group flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                        <span className="text-xs font-mono text-neutral-500 w-5 text-center">{idx + 1}</span>
                        <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-neutral-900">
                          <Image src={track.thumbnail} alt={track.title} fill unoptimized className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{track.title}</p>
                          <p className="text-[10px] text-neutral-400 truncate">{track.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {idx > 0 && (
                          <button
                            onClick={() => reorderQueue(idx, idx - 1, true)}
                            disabled={!canControl}
                            className="p-1 rounded-lg text-neutral-400 hover:text-white transition"
                            title="Move Up"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {idx < queue.length - 1 && (
                          <button
                            onClick={() => reorderQueue(idx, idx + 1, true)}
                            disabled={!canControl}
                            className="p-1 rounded-lg text-neutral-400 hover:text-white transition"
                            title="Move Down"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => playTrack(track, true)}
                          disabled={!canControl}
                          className="p-1 rounded-lg text-neutral-400 hover:text-white transition"
                          title="Play Now"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => removeFromQueue(track.id, true)}
                          disabled={!canControl}
                          className="p-1 rounded-lg hover:bg-rose-500/10 text-neutral-400 hover:text-rose-400 transition"
                          title="Remove"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-lg mx-auto space-y-4">
              {/* Permission Mode Control */}
              <div className="p-4 rounded-2xl bg-white/[0.025] space-y-3">
                <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Room Music Permissions
                </h3>
                <p className="text-xs text-neutral-400">
                  Control who is allowed to change tracks, skip, pause, or modify the shared queue.
                </p>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    onClick={() => handleSetControlMode('everyone')}
                    disabled={!isHost}
                    className={`p-3 rounded-2xl text-left transition flex flex-col justify-between ${
                      controlMode === 'everyone'
                        ? 'bg-white/10 border border-white/15'
                        : 'bg-white/[0.02] hover:bg-white/[0.05]'
                    } ${!isHost ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Users className="w-4 h-4 text-sage-400" />
                      {controlMode === 'everyone' && <CheckCircle2 className="w-4 h-4 text-sage-400" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Everyone</p>
                      <span className="text-[10px] text-neutral-400">All players can control</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSetControlMode('host-only')}
                    disabled={!isHost}
                    className={`p-3 rounded-2xl text-left transition flex flex-col justify-between ${
                      controlMode === 'host-only'
                        ? 'bg-white/10 border border-white/15'
                        : 'bg-white/[0.02] hover:bg-white/[0.05]'
                    } ${!isHost ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      {controlMode === 'host-only' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Host Only</p>
                      <span className="text-[10px] text-neutral-400">Only host can change</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Volume Slider */}
              <div className="p-4 rounded-2xl bg-white/[0.025] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Local Volume</h3>
                  <span className="text-xs font-mono font-medium text-neutral-400">{Math.round(volume * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={toggleMute} className="text-neutral-400 hover:text-white">
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="flex-1 accent-sage-400 h-1 rounded-lg cursor-pointer bg-white/10"
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Integrated Bottom Persistent Now Playing Bar */}
        <div className="px-6 sm:px-8 py-3.5 bg-white/[0.02] border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Left: Track Details */}
          <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-neutral-900 shadow-sm">
              <Image src={currentTrack.thumbnail} alt={currentTrack.title} fill unoptimized className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
              <p className="text-[10px] text-neutral-400 truncate">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Center: Playback Controls & Progress Scrubber */}
          <div className="flex items-center gap-3 w-full sm:w-80 justify-center">
            <button
              onClick={() => playPrevious(true)}
              disabled={!canControl}
              className="text-neutral-400 hover:text-white transition disabled:opacity-50"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>
            <button
              onClick={() => togglePlay(true)}
              disabled={!canControl}
              className="w-8 h-8 rounded-full bg-white text-[#0F1513] hover:bg-neutral-200 flex items-center justify-center transition shadow-sm disabled:opacity-50"
            >
              {musicState.isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button
              onClick={() => playNext(true)}
              disabled={!canControl}
              className="text-neutral-400 hover:text-white transition disabled:opacity-50"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            {/* Time progress scrubber */}
            <div className="hidden sm:flex items-center gap-2 flex-1 pl-2">
              <span className="text-[10px] text-neutral-400 font-mono">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 180}
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value), true)}
                disabled={!canControl}
                className="flex-1 accent-white h-1 rounded-lg cursor-pointer bg-white/10"
              />
              <span className="text-[10px] text-neutral-400 font-mono">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: Quick Volume */}
          <div className="hidden sm:flex items-center gap-2">
            <button onClick={toggleMute} className="text-neutral-400 hover:text-white">
              {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 accent-white h-1 rounded-lg cursor-pointer bg-white/10"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
