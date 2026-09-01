'use client';

import React, { useState, useRef } from 'react';
import { useMusicStore } from '@/application/use-music-store';
import { useAudioSettingsStore } from '@/application/use-audio-settings-store';
import { useAuthStore } from '@/application/use-auth-store';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import {
  MusicCategory,
  MusicTrack,
  JIGSAW_MUSIC_CATEGORIES,
  JIGSAW_MUSIC_CATALOG,
} from '@/domain/music';
import {
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
  Trash2,
  Plus,
  ShieldCheck,
  Users,
  Loader2,
  MoveUp,
  MoveDown,
  Headphones,
  Heart,
  MoreVertical,
  Star,
  Youtube,
  Music2,
  ChevronRight,
  Shuffle,
  Repeat,
  ListPlus,
} from 'lucide-react';
import Image from 'next/image';

/* Reference-matched design tokens */
const C = {
  bg: '#121212',
  surface: '#1e1e1e',
  surfaceHover: '#282828',
  activeRow: '#2a2f2a',
  accent: '#7eb564',
  accentHover: '#8fc470',
  text: '#ffffff',
  textMuted: '#a0a0a0',
  textDim: '#6b6b6b',
  border: 'rgba(255,255,255,0.08)',
  footer: '#181818',
} as const;

const TRENDING_TAGS = [
  'Lofi Girl',
  'Nujabes Lofi',
  'Bruno Mars',
  'Taylor Swift',
  'Jazz Cafe Piano',
  'Cozy Acoustic',
];

type TabId = 'library' | 'youtube' | 'upload' | 'queue' | 'settings';

function formatTime(secs: number) {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function getPlayCount(id: string, index: number) {
  const base = 450000000 + ((index * 83492110) % 650000000);
  return base.toLocaleString('en-US');
}

function YouTubeBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-white shrink-0"
      style={{ backgroundColor: '#2a2a2a' }}
    >
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" aria-hidden>
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

interface TrackRowProps {
  track: MusicTrack;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  isLiked?: boolean;
  canControl: boolean;
  showYouTubeBadge?: boolean;
  showPlayCount?: boolean;
  isLast?: boolean;
  onPlay: () => void;
  onAddQueue: () => void;
  onToggleLike?: (e: React.MouseEvent) => void;
}

function TrackRow({
  track,
  index,
  isCurrent,
  isPlaying,
  isLiked,
  canControl,
  showYouTubeBadge,
  showPlayCount,
  isLast,
  onPlay,
  onAddQueue,
  onToggleLike,
}: TrackRowProps) {
  const isActive = isCurrent && isPlaying;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPlay}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPlay();
        }
      }}
      className={`group flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors duration-150 rounded-xl mx-1 ${
        isCurrent ? '' : 'hover:bg-[#282828]'
      } ${!canControl ? 'opacity-75' : ''}`}
      style={{
        backgroundColor: isCurrent ? C.activeRow : undefined,
        borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
        borderRadius: isCurrent ? '12px' : undefined,
      }}
    >
      {/* Pause box + index (reference layout) */}
      <div className="flex items-center gap-2.5 shrink-0 w-[52px]">
        {isActive ? (
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
            style={{ border: `1.5px solid ${C.accent}`, backgroundColor: 'transparent' }}
          >
            <Pause className="w-3.5 h-3.5" style={{ color: C.accent }} fill={C.accent} />
          </div>
        ) : (
          <div className="w-8 h-8 flex items-center justify-center shrink-0">
            <span
              className="text-sm tabular-nums group-hover:hidden"
              style={{ color: isCurrent ? C.text : C.textDim }}
            >
              {index + 1}
            </span>
            <Play
              className="w-3.5 h-3.5 hidden group-hover:block fill-white text-white"
            />
          </div>
        )}
        {isActive && (
          <span className="text-sm tabular-nums" style={{ color: C.textMuted }}>
            {index + 1}
          </span>
        )}
      </div>

      {/* Thumbnail */}
      <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-[#1e1e1e]">
        <Image src={track.thumbnail} alt={track.title} fill unoptimized className="object-cover" />
      </div>

      {/* Title & artist */}
      <div className="min-w-0 flex-1 pr-3">
        <p
          className="text-[15px] leading-tight truncate font-semibold"
          style={{ color: C.text }}
        >
          {track.title}
        </p>
        <p className="text-[13px] truncate mt-0.5" style={{ color: C.textMuted }}>
          {track.artist}
        </p>
      </div>

      {showPlayCount && (
        <div className="hidden lg:flex items-center gap-1.5 w-28 text-xs shrink-0" style={{ color: C.textMuted }}>
          <Headphones className="w-3.5 h-3.5 opacity-60" />
          <span className="truncate tabular-nums">{getPlayCount(track.id, index)}</span>
        </div>
      )}

      {showPlayCount && (
        <div className="hidden md:flex items-center text-xs font-mono w-12 shrink-0" style={{ color: C.textMuted }}>
          <span>{formatTime(track.duration)}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {showYouTubeBadge && <YouTubeBadge />}

        {onToggleLike && (
          <button
            type="button"
            onClick={onToggleLike}
            className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: C.textMuted }}
            title="Like"
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#7eb564] text-[#7eb564]' : ''}`} />
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddQueue();
          }}
          disabled={!canControl}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 disabled:opacity-30"
          style={{
            backgroundColor: isCurrent ? C.accent : '#2a2a2a',
            color: isCurrent ? '#121212' : C.textMuted,
          }}
          title="Add to queue"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-full transition-colors"
          style={{ color: C.textMuted }}
          title="More"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

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

  const {
    musicVolume,
    voiceVolume,
    sfxVolume,
    musicMuted,
    voiceMuted,
    sfxMuted,
    voiceDuckingEnabled,
    duckingAmountDb,
    setVoiceVolume,
    setSfxVolume,
    toggleVoiceMute,
    toggleSfxMute,
    setVoiceDuckingEnabled,
    setDuckingAmountDb,
  } = useAudioSettingsStore();

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

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'library', label: 'Popular', icon: <Star className="w-[18px] h-[18px]" strokeWidth={1.75} /> },
    { id: 'youtube', label: 'YouTube', icon: <Youtube className="w-[18px] h-[18px]" strokeWidth={1.75} /> },
    { id: 'upload', label: 'Upload', icon: <Upload className="w-[18px] h-[18px]" strokeWidth={1.75} /> },
    { id: 'queue', label: 'Queue', icon: <ListPlus className="w-[18px] h-[18px]" strokeWidth={1.75} />, count: queue.length },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-[18px] h-[18px]" strokeWidth={1.75} /> },
  ];

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
    setLikedTracks((prev) => ({ ...prev, [trackId]: !prev[trackId] }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) searchYouTube(searchInput.trim());
  };

  const handleTrendingClick = (tag: string) => {
    setSearchInput(tag);
    searchYouTube(tag);
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

  const handlePlayTrack = (track: MusicTrack) => {
    if (!canControl) {
      addToast(`Only host (${roomConfig.hostName}) can control music in this room.`);
      return;
    }
    playTrack(track, true);
  };

  const handleAddQueue = (track: MusicTrack) => {
    if (!canControl) return;
    addToQueue(track, true);
    addToast(`Added "${track.title}" to queue`);
  };

  if (!isCenterModalOpen) return null;

  const filteredJigsawTracks =
    selectedCategory === 'All'
      ? JIGSAW_MUSIC_CATALOG
      : JIGSAW_MUSIC_CATALOG.filter((t) => t.category === selectedCategory);

  const isCurrentLiked = Boolean(likedTracks[currentTrack.id]);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in select-none">
      <div className="absolute inset-0 bg-black/80" onClick={() => setCenterModalOpen(false)} aria-hidden />

      <div
        className="relative w-full max-w-[960px] h-[min(92vh,820px)] flex flex-col rounded-3xl overflow-hidden z-10 animate-scale-up shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
        style={{ backgroundColor: C.bg, color: C.text }}
        role="dialog"
        aria-label="Music workspace"
      >
        {/* ── Header ── */}
        <header
          className="shrink-0 flex items-center justify-between px-5 sm:px-6 pt-5 pb-0"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <nav className="flex items-center gap-0 sm:gap-1 overflow-x-auto music-modal-scrollbar flex-1 min-w-0 pb-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="relative flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-150"
                  style={{ color: isActive ? C.text : C.textMuted }}
                >
                  <span style={{ color: isActive ? C.accent : C.textMuted }}>{tab.icon}</span>
                  <span>
                    {tab.label}
                    {tab.count !== undefined && (
                      <span style={{ color: C.textMuted }}> ({tab.count})</span>
                    )}
                  </span>
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-3 right-3 sm:left-4 sm:right-4 h-[2px] rounded-full"
                      style={{ backgroundColor: C.accent }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0 pb-3">
            <div className="hidden sm:flex items-center gap-2 text-sm" style={{ color: C.textMuted }}>
              <Users className="w-4 h-4" strokeWidth={1.75} />
              <span>
                Room <span style={{ color: C.text }}>{roomConfig.id}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCenterModalOpen(false)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-150"
              style={{ backgroundColor: C.surface, color: C.textMuted }}
              title="Close"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </header>

        {!canControl && activeTab !== 'settings' && (
          <div
            className="shrink-0 mx-5 sm:mx-6 mt-3 px-4 py-2 rounded-lg flex items-center justify-between gap-3 text-xs"
            style={{ backgroundColor: C.surface, color: C.textMuted }}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Host-only mode — Only <strong style={{ color: C.text }}>{roomConfig.hostName}</strong> can control tracks.
              </span>
            </div>
          </div>
        )}

        {/* ── Main ── */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {activeTab === 'youtube' && (
            <div className="shrink-0 px-5 sm:px-6 pt-4 pb-3">
              <form onSubmit={handleSearchSubmit} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search
                      className="w-[18px] h-[18px] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: C.textMuted }}
                      strokeWidth={2}
                    />
                    <input
                      type="text"
                      placeholder="Search any artist, track, or lofi genre on YouTube..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-full pl-11 pr-10 py-3 rounded-full text-[15px] focus:outline-none transition-colors duration-150"
                      style={{
                        backgroundColor: C.surface,
                        color: C.text,
                        border: `1px solid ${C.border}`,
                      }}
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => setSearchInput('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ color: C.textMuted, backgroundColor: '#2a2a2a' }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchingYoutube}
                    className="px-5 py-3 rounded-full font-semibold text-sm flex items-center gap-2 transition-colors duration-150 disabled:opacity-50 shrink-0"
                    style={{ backgroundColor: C.accent, color: '#121212' }}
                  >
                    {isSearchingYoutube ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" strokeWidth={2.5} />
                    )}
                    Search
                  </button>
                </div>

                <div
                  className="flex items-center gap-2 overflow-x-auto music-modal-scrollbar rounded-2xl px-3 py-2.5"
                  style={{ backgroundColor: C.surface }}
                >
                  <span className="text-xs font-medium shrink-0" style={{ color: C.textMuted }}>
                    Trending
                  </span>
                  {TRENDING_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTrendingClick(tag)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150 shrink-0"
                      style={{ backgroundColor: '#2a2a2a', color: C.textMuted }}
                    >
                      {tag}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 ml-auto"
                    style={{ backgroundColor: '#2a2a2a', color: C.textMuted }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto music-modal-scrollbar music-tab-content px-3 sm:px-4 py-2">
            {activeTab === 'library' && (
              <div className="space-y-4 px-2">
                <div className="flex items-center gap-2 overflow-x-auto music-modal-scrollbar">
                  {JIGSAW_MUSIC_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                      style={{
                        backgroundColor: selectedCategory === cat ? '#2a3d28' : '#2a2a2a',
                        color: selectedCategory === cat ? C.accent : C.textMuted,
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="flex items-baseline gap-2 px-1">
                  <h2 className="text-base font-semibold">The list</h2>
                  <span className="text-sm" style={{ color: C.textMuted }}>
                    {filteredJigsawTracks.length} songs
                  </span>
                </div>
                <div>
                  {filteredJigsawTracks.map((track, idx) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={idx}
                      isCurrent={currentTrack.id === track.id}
                      isPlaying={musicState.isPlaying}
                      isLiked={Boolean(likedTracks[track.id])}
                      canControl={canControl}
                      showPlayCount
                      isLast={idx === filteredJigsawTracks.length - 1}
                      onPlay={() => handlePlayTrack(track)}
                      onAddQueue={() => handleAddQueue(track)}
                      onToggleLike={(e) => toggleLike(track.id, e)}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'youtube' && (
              <div className="px-1">
                {isSearchingYoutube && (
                  <div className="flex flex-col items-center py-20 gap-3">
                    <Loader2 className="w-7 h-7 animate-spin" style={{ color: C.accent }} />
                    <p className="text-sm" style={{ color: C.textMuted }}>Searching YouTube...</p>
                  </div>
                )}
                {!isSearchingYoutube && youtubeResults.length === 0 && !searchInput && (
                  <div className="flex flex-col items-center py-20 gap-3 text-center">
                    <Music2 className="w-10 h-10" style={{ color: C.textDim }} />
                    <p className="font-medium">Discover music on YouTube</p>
                    <p className="text-sm max-w-sm" style={{ color: C.textMuted }}>
                      Search or pick a trending tag above.
                    </p>
                  </div>
                )}
                {!isSearchingYoutube && youtubeResults.length === 0 && searchInput && (
                  <div className="flex flex-col items-center py-20 gap-2 text-center">
                    <p className="font-medium">No results found</p>
                    <p className="text-sm" style={{ color: C.textMuted }}>Try a different search term.</p>
                  </div>
                )}
                {!isSearchingYoutube &&
                  youtubeResults.map((track, idx) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={idx}
                      isCurrent={currentTrack.id === track.id}
                      isPlaying={musicState.isPlaying}
                      canControl={canControl}
                      showYouTubeBadge
                      isLast={idx === youtubeResults.length - 1}
                      onPlay={() => handlePlayTrack(track)}
                      onAddQueue={() => handleAddQueue(track)}
                    />
                  ))}
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="max-w-md mx-auto py-8 px-2">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                  className="p-10 rounded-2xl cursor-pointer flex flex-col items-center text-center border border-dashed transition-colors"
                  style={{ backgroundColor: C.surface, borderColor: C.border }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: '#2a2a2a' }}
                  >
                    <Upload className="w-6 h-6" style={{ color: C.accent }} />
                  </div>
                  <h3 className="text-base font-semibold">Upload custom audio</h3>
                  <p className="text-sm mt-2" style={{ color: C.textMuted }}>
                    MP3, WAV, OGG, or M4A — max 25 MB
                  </p>
                  <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a" onChange={handleFileUpload} className="hidden" />
                </div>
                {isUploading && (
                  <div className="flex items-center justify-center gap-2 mt-4 text-sm" style={{ color: C.textMuted }}>
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: C.accent }} />
                    Processing...
                  </div>
                )}
                {uploadError && (
                  <p className="mt-4 text-sm text-center text-rose-400">{uploadError}</p>
                )}
              </div>
            )}

            {activeTab === 'queue' && (
              <div className="space-y-4 px-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-base font-semibold">Playback queue</h2>
                    <span className="text-sm" style={{ color: C.textMuted }}>({queue.length})</span>
                  </div>
                  {queue.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearQueue(true)}
                      disabled={!canControl}
                      className="text-xs text-rose-400 flex items-center gap-1 disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Clear
                    </button>
                  )}
                </div>
                {queue.length === 0 ? (
                  <div className="text-center py-16" style={{ color: C.textMuted }}>
                    <ListMusic className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>Queue is empty</p>
                    <button type="button" onClick={() => setActiveTab('library')} className="mt-2 text-sm" style={{ color: C.accent }}>
                      Browse popular tracks
                    </button>
                  </div>
                ) : (
                  queue.map((track, idx) => (
                    <div
                      key={`${track.id}-${idx}`}
                      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#282828] transition-colors"
                      style={{ borderBottom: idx < queue.length - 1 ? `1px solid ${C.border}` : undefined }}
                    >
                      <span className="w-6 text-center text-sm tabular-nums" style={{ color: C.textDim }}>{idx + 1}</span>
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                        <Image src={track.thumbnail} alt={track.title} fill unoptimized className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{track.title}</p>
                        <p className="text-xs truncate" style={{ color: C.textMuted }}>{track.artist}</p>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100">
                        {idx > 0 && (
                          <button type="button" onClick={() => reorderQueue(idx, idx - 1, true)} disabled={!canControl} className="p-2" style={{ color: C.textMuted }}>
                            <MoveUp className="w-4 h-4" />
                          </button>
                        )}
                        {idx < queue.length - 1 && (
                          <button type="button" onClick={() => reorderQueue(idx, idx + 1, true)} disabled={!canControl} className="p-2" style={{ color: C.textMuted }}>
                            <MoveDown className="w-4 h-4" />
                          </button>
                        )}
                        <button type="button" onClick={() => handlePlayTrack(track)} disabled={!canControl} className="p-2" style={{ color: C.textMuted }}>
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                        <button type="button" onClick={() => removeFromQueue(track.id, true)} disabled={!canControl} className="p-2 text-rose-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-lg mx-auto space-y-4 px-2 pb-4">
                <section className="p-5 rounded-2xl space-y-4" style={{ backgroundColor: C.surface }}>
                  <h3 className="text-sm font-semibold">Room music permissions</h3>
                  <p className="text-xs" style={{ color: C.textMuted }}>
                    Control who can change tracks, skip, pause, or modify the queue.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {(['everyone', 'host-only'] as const).map((mode) => {
                      const active = controlMode === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => handleSetControlMode(mode)}
                          disabled={!isHost}
                          className="p-4 rounded-xl text-left disabled:opacity-50"
                          style={{
                            backgroundColor: active ? '#2a3d28' : '#2a2a2a',
                            border: active ? `1px solid ${C.accent}40` : `1px solid ${C.border}`,
                          }}
                        >
                          {mode === 'everyone' ? <Users className="w-4 h-4 mb-2" style={{ color: C.accent }} /> : <ShieldCheck className="w-4 h-4 mb-2 text-amber-400" />}
                          <p className="text-sm font-semibold">{mode === 'everyone' ? 'Everyone' : 'Host only'}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>
                            {mode === 'everyone' ? 'All players can control' : 'Only host can change'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="p-5 rounded-2xl space-y-4" style={{ backgroundColor: C.surface }}>
                  <h3 className="text-sm font-semibold">Audio levels</h3>
                  {[
                    { label: 'Music', vol: musicVolume, muted: musicMuted, set: setVolume, toggle: toggleMute },
                    { label: 'Voice', vol: voiceVolume, muted: voiceMuted, set: setVoiceVolume, toggle: toggleVoiceMute },
                    { label: 'Sound effects', vol: sfxVolume, muted: sfxMuted, set: setSfxVolume, toggle: toggleSfxMute },
                  ].map((row) => (
                    <div key={row.label} className="space-y-2">
                      <div className="flex justify-between text-xs" style={{ color: C.textMuted }}>
                        <span>{row.label}</span>
                        <span className="font-mono">{Math.round(row.vol * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={row.toggle} style={{ color: C.textMuted }}>
                          {row.muted || row.vol === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <input type="range" min={0} max={1} step={0.01} value={row.muted ? 0 : row.vol} onChange={(e) => row.set(parseFloat(e.target.value))} className="flex-1 music-accent-slider" />
                      </div>
                    </div>
                  ))}
                </section>

                <section className="p-5 rounded-2xl space-y-3" style={{ backgroundColor: C.surface }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Voice ducking</h3>
                    <button
                      type="button"
                      onClick={() => setVoiceDuckingEnabled(!voiceDuckingEnabled)}
                      className="relative w-10 h-5 rounded-full transition-colors"
                      style={{ backgroundColor: voiceDuckingEnabled ? C.accent : '#3a3a3a' }}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${voiceDuckingEnabled ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: C.textMuted }}>Lower music when someone is speaking.</p>
                  {voiceDuckingEnabled && (
                    <input type="range" min={4} max={8} step={0.5} value={duckingAmountDb} onChange={(e) => setDuckingAmountDb(parseFloat(e.target.value))} className="w-full music-accent-slider" />
                  )}
                </section>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom player (reference layout) ── */}
        <footer
          className="shrink-0 px-4 sm:px-6 py-3 sm:py-4"
          style={{ backgroundColor: C.footer, borderTop: `1px solid ${C.border}` }}
        >
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_2fr_minmax(0,1fr)] gap-3 md:gap-4 items-end md:items-center">
            {/* Left */}
            <div className="flex items-center gap-3 min-w-0 order-1">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                <Image src={currentTrack.thumbnail} alt={currentTrack.title} fill unoptimized className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{currentTrack.title}</p>
                <p className="text-xs truncate" style={{ color: C.textMuted }}>{currentTrack.artist}</p>
              </div>
              <button
                type="button"
                onClick={() => setLikedTracks((p) => ({ ...p, [currentTrack.id]: !p[currentTrack.id] }))}
                className="shrink-0 hidden sm:block"
                style={{ color: isCurrentLiked ? C.accent : C.textMuted }}
              >
                <Heart className={`w-4 h-4 ${isCurrentLiked ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Center */}
            <div className="flex flex-col items-center gap-2 order-3 md:order-2 w-full">
              <div className="flex items-center gap-4 sm:gap-5">
                <button type="button" className="p-1 opacity-40 cursor-default" style={{ color: C.textMuted }} title="Shuffle (coming soon)">
                  <Shuffle className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => playPrevious(true)}
                  disabled={!canControl}
                  className="p-1 disabled:opacity-30 transition-colors"
                  style={{ color: C.textMuted }}
                >
                  <SkipBack className="w-5 h-5 fill-current" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!canControl) {
                      addToast(`Only host (${roomConfig.hostName}) can control music.`);
                      return;
                    }
                    togglePlay(true);
                  }}
                  disabled={!canControl}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-transform duration-150 hover:scale-105 disabled:opacity-40"
                  style={{ backgroundColor: C.text, color: C.bg }}
                >
                  {musicState.isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => playNext(true)}
                  disabled={!canControl}
                  className="p-1 disabled:opacity-30"
                  style={{ color: C.textMuted }}
                >
                  <SkipForward className="w-5 h-5 fill-current" />
                </button>
                <button type="button" className="p-1 opacity-40 cursor-default" style={{ color: C.textMuted }} title="Repeat (coming soon)">
                  <Repeat className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </button>
              </div>

              <div className="flex items-center gap-2 w-full max-w-lg">
                <span className="text-[11px] font-mono tabular-nums w-9 text-right shrink-0" style={{ color: C.textMuted }}>
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 180}
                  value={currentTime}
                  onChange={(e) => seek(parseFloat(e.target.value), true)}
                  disabled={!canControl}
                  className="flex-1 music-progress-slider disabled:opacity-50"
                  style={{ '--progress': `${progressPercent}%` } as React.CSSProperties}
                />
                <span className="text-[11px] font-mono tabular-nums w-9 shrink-0" style={{ color: C.textMuted }}>
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Right volume */}
            <div className="flex items-center justify-end gap-2 order-2 md:order-3">
              <button type="button" onClick={toggleMute} style={{ color: C.textMuted }}>
                {isMuted || volume === 0 ? <VolumeX className="w-[18px] h-[18px]" /> : <Volume2 className="w-[18px] h-[18px]" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 sm:w-28 music-accent-slider"
              />
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
