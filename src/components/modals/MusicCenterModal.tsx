'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
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
  Sparkles,
  Disc,
  Trash2,
  Plus,
  Radio,
  Clock,
  User,
  ShieldCheck,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  MoveUp,
  MoveDown,
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
    pause,
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
    addToast(mode === 'everyone' ? 'Room Music: Everyone can now control music' : 'Room Music: Set to Host-Only mode');
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Debounced search for YouTube
  useEffect(() => {
    if (activeTab === 'youtube' && !searchInput) {
      searchYouTube('lofi chill beats');
    }
  }, [activeTab, searchYouTube, searchInput]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      searchYouTube(searchInput.trim());
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/aac'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
      setUploadError('Please select a valid audio file (.mp3, .wav, .ogg, .m4a)');
      setIsUploading(false);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('Audio file size exceeds 25MB limit.');
      setIsUploading(false);
      return;
    }

    const track = await uploadAudioFile(file, user?.fullName || user?.username || 'You');
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-warmbrown-900/60 backdrop-blur-md transition-opacity"
        onClick={() => setCenterModalOpen(false)}
      />

      {/* Main Glassmorphic Music Hub Container */}
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[2.5rem] bg-cream-50/95 border border-white/80 shadow-2xl overflow-hidden backdrop-blur-xl z-10">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-cream-200/80 bg-white/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-900 text-amber-200 flex items-center justify-center shadow-sm">
              <Disc className={`w-6 h-6 ${musicState.isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-serif font-bold text-warmbrown-600">Collaborative Music Hub</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-sage-100 text-sage-700 text-[10px] font-bold uppercase tracking-wider">
                  Spotify Jam Mode
                </span>
              </div>
              <p className="text-xs text-neutral-500">Synchronized listening experience with friends in room {roomConfig.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Permission Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cream-100 text-warmbrown-600 text-xs font-semibold border border-cream-200">
              {controlMode === 'host-only' ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Host Only</span>
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5 text-sage-600" />
                  <span>Everyone Can Control</span>
                </>
              )}
            </div>

            <button
              onClick={() => setCenterModalOpen(false)}
              className="w-9 h-9 rounded-full bg-cream-200 hover:bg-cream-300 flex items-center justify-center text-warmbrown-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-8 pt-4 pb-2 border-b border-cream-200/60 overflow-x-auto">
          {[
            { id: 'library', label: 'Jigsaw Library', icon: Music },
            { id: 'youtube', label: 'YouTube Search', icon: Radio },
            { id: 'upload', label: 'Upload Audio', icon: Upload },
            { id: 'queue', label: `Shared Queue (${queue.length})`, icon: ListMusic },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-900 text-white shadow-md'
                    : 'bg-white/80 hover:bg-cream-100 text-neutral-600 border border-cream-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Host-Only Notice Banner for non-hosts */}
        {!canControl && activeTab !== 'settings' && (
          <div className="mx-6 sm:mx-8 mt-3 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between text-xs text-amber-900 font-medium animate-fade-in shadow-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0" />
              <span>
                Room music is currently in <strong>Host-Only</strong> mode. Only <strong>{roomConfig.hostName}</strong> can control tracks.
              </span>
            </div>
            <span className="text-[10px] bg-amber-200/80 px-2 py-0.5 rounded-full font-bold uppercase text-amber-900 shrink-0">
              Listen Only
            </span>
          </div>
        )}

        {/* Tab Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          
          {/* TAB 1: JIGSAW LIBRARY */}
          {activeTab === 'library' && (
            <div className="space-y-6">
              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {JIGSAW_MUSIC_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-warmbrown-600 text-white shadow-sm'
                        : 'bg-white hover:bg-cream-100 text-neutral-600 border border-cream-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Track Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredJigsawTracks.map((track) => {
                  const isCurrent = currentTrack.id === track.id;
                  return (
                    <div
                      key={track.id}
                      className={`group relative p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-amber-900/10 border-amber-800/40 shadow-sm'
                          : 'bg-white border-cream-200 hover:border-cream-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden shadow-inner shrink-0">
                          <Image src={track.thumbnail} alt={track.title} fill className="object-cover" />
                          <button
                            onClick={() => playTrack(track, true)}
                            disabled={!canControl}
                            className={`absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition ${
                              isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            {isCurrent && musicState.isPlaying ? (
                              <Pause className="w-5 h-5 text-amber-200 fill-current" />
                            ) : (
                              <Play className="w-5 h-5 text-white fill-current" />
                            )}
                          </button>
                        </div>
                        <div className="overflow-hidden flex-1">
                          <h4 className="text-xs font-bold text-warmbrown-600 truncate font-serif">{track.title}</h4>
                          <p className="text-[11px] text-neutral-500 truncate">{track.artist}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-cream-100 text-warmbrown-500 text-[9px] font-bold uppercase">
                            {track.category} · {formatTime(track.duration)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-cream-100">
                        <button
                          onClick={() => {
                            addToQueue(track, true);
                            addToast(`Added "${track.title}" to queue`);
                          }}
                          disabled={!canControl}
                          className="px-2.5 py-1 rounded-xl bg-cream-100 hover:bg-cream-200 text-warmbrown-600 text-[11px] font-semibold flex items-center gap-1 transition disabled:opacity-50"
                        >
                          <Plus className="w-3 h-3" /> Queue
                        </button>
                        <button
                          onClick={() => playTrack(track, true)}
                          disabled={!canControl}
                          className="px-3 py-1 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-[11px] font-semibold flex items-center gap-1 transition shadow-sm disabled:opacity-50"
                        >
                          <Play className="w-3 h-3 fill-current" /> Play
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
            <div className="space-y-6">
              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search any artist, song, or genre (e.g. Bruno Mars, Taylor Swift, Lofi)..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-cream-300 focus:outline-none focus:ring-2 focus:ring-amber-800/20 text-xs text-warmbrown-600 shadow-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchingYoutube}
                    className="px-6 py-3 rounded-2xl bg-amber-900 text-white font-semibold text-xs hover:bg-amber-800 transition shadow-sm flex items-center gap-2 disabled:opacity-50 shrink-0"
                  >
                    {isSearchingYoutube ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Search
                  </button>
                </div>

                {/* Quick Search Suggestions */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
                  <span className="text-[11px] font-bold text-neutral-400 shrink-0 mr-1">Trending:</span>
                  {[
                    'Bruno Mars',
                    'Lofi Girl',
                    'Taylor Swift',
                    'Coldplay',
                    'Jazz Cafe Piano',
                    'Die With A Smile',
                    'Nujabes Lofi',
                    'Cozy Acoustic',
                    'Synthwave Chill',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setSearchInput(tag);
                        searchYouTube(tag);
                      }}
                      className="px-3 py-1 rounded-full bg-white hover:bg-amber-100 text-warmbrown-600 border border-cream-200 text-[10px] font-semibold transition shrink-0 shadow-2xs hover:border-amber-300"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </form>

              {/* Notice */}
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-900 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
                <span>Plays official YouTube embedded audio stream synchronously with room peers. No audio extraction or downloads.</span>
              </div>

              {/* Results Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {youtubeResults.map((track) => {
                  const isCurrent = currentTrack.id === track.id;
                  return (
                    <div
                      key={track.id}
                      className={`group p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-amber-900/10 border-amber-800/40 shadow-sm'
                          : 'bg-white border-cream-200 hover:border-cream-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-16 h-12 rounded-xl overflow-hidden shadow-inner shrink-0 bg-neutral-900">
                          <Image
                            src={track.thumbnail}
                            alt={track.title}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                          <button
                            onClick={() => playTrack(track, true)}
                            disabled={!canControl}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition"
                          >
                            <Play className="w-4 h-4 text-white fill-current" />
                          </button>
                        </div>
                        <div className="overflow-hidden flex-1">
                          <h4 className="text-xs font-bold text-warmbrown-600 truncate">{track.title}</h4>
                          <p className="text-[11px] text-neutral-500 truncate">{track.artist}</p>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-bold uppercase">
                            YouTube
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-cream-100">
                        <button
                          onClick={() => {
                            addToQueue(track, true);
                            addToast(`Added "${track.title}" to queue`);
                          }}
                          disabled={!canControl}
                          className="px-2.5 py-1 rounded-xl bg-cream-100 hover:bg-cream-200 text-warmbrown-600 text-[11px] font-semibold flex items-center gap-1 transition disabled:opacity-50"
                        >
                          <Plus className="w-3 h-3" /> Queue
                        </button>
                        <button
                          onClick={() => playTrack(track, true)}
                          disabled={!canControl}
                          className="px-3 py-1 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-[11px] font-semibold flex items-center gap-1 transition shadow-sm disabled:opacity-50"
                        >
                          <Play className="w-3 h-3 fill-current" /> Play
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
            <div className="max-w-xl mx-auto space-y-6 text-center">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 rounded-3xl border-2 border-dashed border-cream-300 hover:border-amber-800/50 bg-white hover:bg-amber-50/20 cursor-pointer transition flex flex-col items-center justify-center group"
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-warmbrown-600">Upload Room Music File</h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                  Drag and drop or click to upload your custom MP3, WAV, OGG, or M4A audio file.
                </p>
                <span className="mt-3 px-3 py-1 rounded-full bg-cream-100 text-warmbrown-600 text-[10px] font-semibold">
                  Max file size: 25MB · Private Room Access
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
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-900">
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing & extracting metadata...
                </div>
              )}

              {uploadError && (
                <div className="p-3 rounded-2xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
                  {uploadError}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: QUEUE */}
          {activeTab === 'queue' && (
            <div className="space-y-6">
              {/* Now Playing Card */}
              <div className="p-5 rounded-3xl bg-amber-900 text-white shadow-xl flex flex-col sm:flex-row items-center gap-5">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-md shrink-0 ring-2 ring-white/20">
                  <Image
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 text-center sm:text-left overflow-hidden">
                  <span className="text-[10px] font-bold text-amber-200/80 uppercase tracking-widest">
                    Now Playing ({currentTrack.source})
                  </span>
                  <h3 className="text-lg font-bold font-serif truncate mt-0.5">{currentTrack.title}</h3>
                  <p className="text-xs text-amber-200/70 truncate">{currentTrack.artist}</p>

                  {/* Scrub Slider */}
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-[10px] text-amber-200/60 font-mono">{formatTime(currentTime)}</span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 180}
                      value={currentTime}
                      onChange={(e) => seek(parseFloat(e.target.value), true)}
                      disabled={!canControl}
                      className="flex-1 accent-amber-300 h-1.5 rounded-lg cursor-pointer bg-white/20"
                    />
                    <span className="text-[10px] text-amber-200/60 font-mono">{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => playPrevious(true)}
                    disabled={!canControl}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
                  >
                    <SkipBack className="w-4 h-4 fill-current" />
                  </button>
                  <button
                    onClick={() => togglePlay(true)}
                    disabled={!canControl}
                    className="p-3 rounded-2xl bg-white text-amber-900 hover:bg-amber-100 transition shadow-md disabled:opacity-50"
                  >
                    {musicState.isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                  </button>
                  <button
                    onClick={() => playNext(true)}
                    disabled={!canControl}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
                  >
                    <SkipForward className="w-4 h-4 fill-current" />
                  </button>
                </div>
              </div>

              {/* Up Next List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-warmbrown-600 uppercase tracking-wider">
                    Up Next in Queue ({queue.length})
                  </h3>
                  {queue.length > 0 && (
                    <button
                      onClick={() => clearQueue(true)}
                      disabled={!canControl}
                      className="text-xs text-red-500 hover:underline flex items-center gap-1 font-semibold disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Queue
                    </button>
                  )}
                </div>

                {queue.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-white border border-cream-200 text-center">
                    <p className="text-xs text-neutral-500">The queue is currently empty.</p>
                    <button
                      onClick={() => setActiveTab('library')}
                      className="mt-2 text-xs font-bold text-amber-900 hover:underline"
                    >
                      + Browse Library
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {queue.map((track, idx) => (
                      <div
                        key={`${track.id}-${idx}`}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white border border-cream-200 shadow-sm"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="text-xs font-mono font-bold text-neutral-400 w-4">{idx + 1}</span>
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-inner shrink-0">
                            <Image
                              src={track.thumbnail}
                              alt={track.title}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-warmbrown-600 truncate">{track.title}</p>
                            <span className="text-[10px] text-neutral-400 truncate block">
                              {track.artist} · {track.source}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {idx > 0 && (
                            <button
                              onClick={() => reorderQueue(idx, idx - 1, true)}
                              disabled={!canControl}
                              className="p-1.5 rounded-lg hover:bg-cream-100 text-neutral-400 hover:text-warmbrown-600 transition"
                              title="Move Up"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {idx < queue.length - 1 && (
                            <button
                              onClick={() => reorderQueue(idx, idx + 1, true)}
                              disabled={!canControl}
                              className="p-1.5 rounded-lg hover:bg-cream-100 text-neutral-400 hover:text-warmbrown-600 transition"
                              title="Move Down"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => playTrack(track, true)}
                            disabled={!canControl}
                            className="p-1.5 rounded-lg bg-cream-100 hover:bg-amber-900 hover:text-white text-warmbrown-600 transition"
                            title="Play Now"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            onClick={() => removeFromQueue(track.id, true)}
                            disabled={!canControl}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500 transition"
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
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-xl mx-auto space-y-6">
              {/* Permission Mode Control */}
              <div className="p-5 rounded-3xl bg-white border border-cream-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-warmbrown-600 uppercase tracking-wider">
                  Room Music Permissions
                </h3>
                <p className="text-xs text-neutral-500">
                  Control who is allowed to change tracks, skip, pause, or modify the collaborative queue.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => handleSetControlMode('everyone')}
                    disabled={!isHost}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                      controlMode === 'everyone'
                        ? 'border-sage-500 bg-sage-50/60 ring-2 ring-sage-500/20'
                        : 'border-cream-200 bg-cream-50 hover:bg-cream-100'
                    } ${!isHost ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Users className="w-4 h-4 text-sage-600" />
                      {controlMode === 'everyone' && <CheckCircle2 className="w-4 h-4 text-sage-600" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-warmbrown-600">Everyone</p>
                      <span className="text-[10px] text-neutral-500">All players can control</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSetControlMode('host-only')}
                    disabled={!isHost}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                      controlMode === 'host-only'
                        ? 'border-amber-800 bg-amber-50/60 ring-2 ring-amber-800/20'
                        : 'border-cream-200 bg-cream-50 hover:bg-cream-100'
                    } ${!isHost ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <ShieldCheck className="w-4 h-4 text-amber-800" />
                      {controlMode === 'host-only' && <CheckCircle2 className="w-4 h-4 text-amber-800" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-warmbrown-600">Host Only</p>
                      <span className="text-[10px] text-neutral-500">Only host can change</span>
                    </div>
                  </button>
                </div>
                {!isHost && (
                  <p className="text-[10px] text-amber-700 italic pt-1">
                    * Only the room host ({roomConfig.hostName}) can change music control permissions.
                  </p>
                )}
              </div>

              {/* Volume & Sync Preference */}
              <div className="p-5 rounded-3xl bg-white border border-cream-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-warmbrown-600 uppercase tracking-wider">Local Volume</h3>
                  <span className="text-xs font-mono font-bold text-neutral-500">{Math.round(volume * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={toggleMute} className="text-neutral-500 hover:text-warmbrown-600">
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="flex-1 accent-amber-900 h-1.5 rounded-lg cursor-pointer bg-cream-200"
                  />
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
