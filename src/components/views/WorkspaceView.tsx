'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import { useAuthStore } from '@/application/use-auth-store';
import { useMusicStore } from '@/application/use-music-store';
import { useAudioEngine } from '@/application/use-audio-engine';
import {
  useRealtimeRoom,
  RealtimePieceMovePayload,
  LivePieceDragPayload,
  LivePieceReleasePayload,
  BoardSyncPayload,
} from '@/application/use-realtime-room';
import { useWebRtcCall } from '@/application/use-webrtc-call';
import { ThreePuzzleEngine } from '@/infrastructure/three-puzzle-engine';
import { FloatingToolbar } from '@/components/layout/FloatingToolbar';
import { FloatingDock } from '@/components/layout/FloatingDock';
import { Mic, MicOff, Video as VideoIcon, VideoOff, Maximize2, Minimize2, Users } from 'lucide-react';
import Image from 'next/image';

const VC_AVATAR_COLORS = ['#1a73e8', '#d93025', '#188038', '#f9ab00', '#9334e6', '#e37400', '#0d9488', '#7c3aed'];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return VC_AVATAR_COLORS[Math.abs(hash) % VC_AVATAR_COLORS.length];
}

interface VcParticipantTileProps {
  name: string;
  label: string;
  avatarUrl: string;
  isMicOn: boolean;
  isCamOn: boolean;
  isYou?: boolean;
  isSpeaking?: boolean;
  showVideo: boolean;
  stream: MediaStream | null;
  onToggleMic?: () => void;
  onToggleCam?: () => void;
  setVideoRef?: (el: HTMLVideoElement | null) => void;
}

function VcParticipantTile({
  name,
  label,
  avatarUrl,
  isMicOn,
  isCamOn,
  isYou,
  isSpeaking,
  showVideo,
  stream,
  onToggleMic,
  onToggleCam,
  setVideoRef,
}: VcParticipantTileProps) {
  const accentColor = getAvatarColor(name);
  const isActive = isSpeaking || isMicOn;

  return (
    <div
      onClick={onToggleMic}
      className={`group relative aspect-video w-full overflow-hidden rounded-xl bg-[#292a2d] transition-all duration-200 ${
        onToggleMic ? 'cursor-pointer' : ''
      } ${
        isActive
          ? 'ring-2 ring-[#7eb564] shadow-[0_0_0_1px_rgba(126,181,100,0.35),0_8px_24px_rgba(0,0,0,0.35)]'
          : 'ring-1 ring-white/[0.06] hover:ring-white/15'
      }`}
      title={onToggleMic ? `Click to ${isMicOn ? 'mute' : 'unmute'} microphone` : undefined}
    >
      {showVideo ? (
        <video
          ref={(el) => {
            setVideoRef?.(el);
            if (el && stream && el.srcObject !== stream) {
              el.srcObject = stream;
              el.play().catch(() => {});
            }
          }}
          autoPlay
          playsInline
          muted={isYou}
          onLoadedMetadata={(e) => {
            (e.target as HTMLVideoElement).play().catch(() => {});
          }}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#292a2d]">
          <div
            className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center overflow-hidden rounded-full text-xl font-semibold text-white shadow-lg ring-2 ring-white/10"
            style={{ backgroundColor: accentColor }}
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt={name} fill unoptimized className="object-cover" />
            ) : (
              getInitials(name)
            )}
          </div>
        </div>
      )}

      {isYou && (
        <div className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm">
          You
        </div>
      )}

      {onToggleCam && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCam();
          }}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition hover:bg-black/75 group-hover:opacity-100"
          title={isCamOn ? 'Turn camera off' : 'Turn camera on'}
        >
          {isCamOn ? <VideoIcon className="h-3.5 w-3.5 text-emerald-300" /> : <VideoOff className="h-3.5 w-3.5 text-white/80" />}
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-2.5 pb-2 pt-8">
        <span className="max-w-[calc(100%-2rem)] truncate rounded-md bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
          {label}
        </span>
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
            isMicOn ? 'bg-[#7eb564] text-white' : 'bg-[#ea4335] text-white'
          }`}
        >
          {isMicOn ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
        </div>
      </div>
    </div>
  );
}

export function WorkspaceView() {
  const {
    currentTheme,
    selectedPuzzle,
    roomConfig,
    participants,
    chatFeed,
    isMicOn,
    toggleMic,
    isCamOn,
    toggleCam,
    isVcExpanded,
    setVcExpanded,
    addChatMessage,
    triggerVictory,
    addToast,
    showReferenceOverlay,
  } = useWorkspaceStore();

  const { user } = useAuthStore();
  const { playSnapSound } = useAudioEngine();

  // Supabase Realtime Channel Broadcast & WebRTC Call Hooks
  const {
    broadcastPieceMove,
    broadcastLiveDrag,
    broadcastLiveRelease,
    broadcastBoardSync,
    requestBoardSync,
    broadcastScatter,
    broadcastVictory,
  } = useRealtimeRoom(roomConfig.id);

  const { localStream, remoteStreams } = useWebRtcCall(roomConfig.id);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ThreePuzzleEngine | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Store latest callbacks in refs to avoid recreating the engine
  const callbacksRef = useRef({
    playSnapSound,
    addChatMessage,
    broadcastPieceMove,
    broadcastLiveDrag,
    broadcastLiveRelease,
    broadcastBoardSync,
    broadcastScatter,
    broadcastVictory,
    triggerVictory,
    addToast,
    userName: user?.fullName || user?.username || 'Player',
  });

  useEffect(() => {
    callbacksRef.current = {
      playSnapSound,
      addChatMessage,
      broadcastPieceMove,
      broadcastLiveDrag,
      broadcastLiveRelease,
      broadcastBoardSync,
      broadcastScatter,
      broadcastVictory,
      triggerVictory,
      addToast,
      userName: user?.fullName || user?.username || 'Player',
    };
  }, [
    playSnapSound,
    addChatMessage,
    broadcastPieceMove,
    broadcastLiveDrag,
    broadcastLiveRelease,
    broadcastBoardSync,
    broadcastScatter,
    broadcastVictory,
    triggerVictory,
    addToast,
    user,
  ]);

  // Bind Local Media Stream to HTML Video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isCamOn]);

  // Initialize Interactive 3D Puzzle Engine with Deterministic Room Seed
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const currentUserName = user?.fullName || user?.username || 'Player';
    const roomSeed = `${roomConfig.id}-${selectedPuzzle.id}`;

    // Create or reuse ThreePuzzleEngine
    let engine = engineRef.current;
    if (!engine || engine.roomSeed !== roomSeed) {
      if (engine) engine.destroy();
      engine = new ThreePuzzleEngine(
        container,
        selectedPuzzle.url,
        roomConfig.pieceCount,
        roomSeed,
        currentUserName,
        currentTheme
      );
      engineRef.current = engine;
    } else {
      engine.resize(container.clientWidth, container.clientHeight);
    }

    engine.currentUserName = currentUserName;

    // 1. Live dragging callback (continuous during mouse move)
    engine.onLiveDragCallback = (pieces, heldBy) => {
      callbacksRef.current.broadcastLiveDrag(pieces, heldBy);
    };

    // 2. Live release callback (when mouse released)
    engine.onLiveReleaseCallback = (pieces) => {
      callbacksRef.current.broadcastLiveRelease(pieces);
    };

    // 3. Piece snap callback
    engine.onSnapCallback = (piece) => {
      callbacksRef.current.playSnapSound();
      callbacksRef.current.addChatMessage(
        callbacksRef.current.userName,
        `snapped piece #${piece.id + 1}!`
      );
      callbacksRef.current.broadcastPieceMove(piece.id, piece.x, piece.y, true);
      if (engineRef.current) {
        callbacksRef.current.broadcastBoardSync(engineRef.current.exportBoardState());
      }
    };

    // 4. Piece detach callback
    engine.onDetachCallback = () => {
      callbacksRef.current.playSnapSound();
      if (engineRef.current) {
        callbacksRef.current.broadcastBoardSync(engineRef.current.exportBoardState());
      }
    };

    // 5. Victory callback
    engine.onVictoryCallback = () => {
      callbacksRef.current.triggerVictory();
      callbacksRef.current.broadcastVictory();
    };

    // Resize handler (preserves 3D piece positions, only updates camera aspect & renderer bounds)
    const handleResize = () => {
      if (engineRef.current && containerRef.current) {
        engineRef.current.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }
    };
    window.addEventListener('resize', handleResize);

    // Remote Live Drag Handler (smooth movement + heldBy pill badge)
    const handleRemoteLiveDrag = (e: Event) => {
      const customEvent = e as CustomEvent<LivePieceDragPayload>;
      const { pieces, heldBy } = customEvent.detail;
      if (engineRef.current) {
        engineRef.current.applyRemoteDrag(pieces, heldBy);
      }
    };
    window.addEventListener('remote-piece-live-drag', handleRemoteLiveDrag);

    // Remote Live Release Handler
    const handleRemoteLiveRelease = (e: Event) => {
      const customEvent = e as CustomEvent<LivePieceReleasePayload>;
      const { pieces, heldBy } = customEvent.detail;
      if (engineRef.current) {
        engineRef.current.applyRemoteRelease(pieces, heldBy);
      }
    };
    window.addEventListener('remote-piece-live-release', handleRemoteLiveRelease);

    // Remote Single Piece Move Handler (Snap fallback)
    const handleRemotePieceMove = (e: Event) => {
      const customEvent = e as CustomEvent<RealtimePieceMovePayload>;
      const { pieceId, x, y, isSnapped, heldBy } = customEvent.detail;
      if (engineRef.current) {
        const piece = engineRef.current.pieces.find((p) => p.id === pieceId);
        if (piece) {
          piece.x = x;
          piece.y = y;
          piece.isSnapped = isSnapped;
          piece.heldBy = heldBy;
          const mesh = engineRef.current.pieceMeshes.get(pieceId);
          if (mesh) mesh.position.set(x, y, 0.002);
          if (isSnapped) callbacksRef.current.playSnapSound();
        }
      }
    };
    window.addEventListener('remote-piece-move', handleRemotePieceMove);

    // Remote Full Board Sync Handler
    const handleRemoteBoardSync = (e: Event) => {
      const customEvent = e as CustomEvent<BoardSyncPayload>;
      const { pieces } = customEvent.detail;
      if (engineRef.current) {
        engineRef.current.applyBoardSync(pieces);
      }
    };
    window.addEventListener('remote-board-sync', handleRemoteBoardSync);

    // Send Board Sync To Requesting Peer
    const handleSendBoardSync = () => {
      if (engineRef.current && engineRef.current.pieces.length > 0) {
        callbacksRef.current.broadcastBoardSync(engineRef.current.exportBoardState());
      }
    };
    window.addEventListener('send-board-sync-to-peer', handleSendBoardSync);

    // Remote Scatter Handler
    const handleRemoteScatter = (e: Event) => {
      const customEvent = e as CustomEvent<{ pieces?: { id: number; x: number; y: number }[] }>;
      if (engineRef.current) {
        if (customEvent.detail?.pieces && customEvent.detail.pieces.length > 0) {
          engineRef.current.applyRemoteScatter(customEvent.detail.pieces);
        } else {
          engineRef.current.scatterUnsnapped();
        }
        callbacksRef.current.addToast('Pieces scattered by peer');
      }
    };
    window.addEventListener('remote-scatter-pieces', handleRemoteScatter);

    // Request board state from peers upon entering workspace
    requestBoardSync();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('remote-piece-live-drag', handleRemoteLiveDrag);
      window.removeEventListener('remote-piece-live-release', handleRemoteLiveRelease);
      window.removeEventListener('remote-piece-move', handleRemotePieceMove);
      window.removeEventListener('remote-board-sync', handleRemoteBoardSync);
      window.removeEventListener('send-board-sync-to-peer', handleSendBoardSync);
      window.removeEventListener('remote-scatter-pieces', handleRemoteScatter);
    };
  }, [
    selectedPuzzle.id,
    selectedPuzzle.url,
    roomConfig.id,
    roomConfig.pieceCount,
    requestBoardSync,
    user,
  ]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.toggleReference(showReferenceOverlay);
    }
  }, [showReferenceOverlay]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateTheme(currentTheme);
    }
  }, [currentTheme]);

  // Trigger canvas resize & recenter when VC sidebar is toggled (Split screen)
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 60);
    return () => clearTimeout(timer);
  }, [isVcExpanded]);

  const handleScatter = () => {
    const scattered = engineRef.current?.scatterUnsnapped();
    if (scattered && scattered.length > 0) {
      broadcastScatter(scattered);
      if (engineRef.current) {
        broadcastBoardSync(engineRef.current.exportBoardState());
      }
    }
    addToast('Unconnected pieces scattered');
  };

  const otherParticipants = participants.filter((p) => p.id !== user?.id);

  return (
    <div className={`fixed inset-0 z-30 flex flex-col theme-${currentTheme}`}>
      {/* TOP FLOATING WORKSPACE SPATIAL VIDEO CALL BAR (Default Mode) */}
      {!isVcExpanded ? (
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-40 glass-panel p-2 rounded-[2rem] shadow-float flex items-center gap-3 border border-white/80 backdrop-blur-xl transition-all duration-300">
          {/* Row of Large Video Call Cards */}
          <div className="flex items-center gap-2.5">
            {/* Card 1: Current User ("You") */}
            <div
              onClick={toggleMic}
              className={`relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden shadow-md cursor-pointer transition-all duration-200 group bg-neutral-900 ${isMicOn
                  ? 'ring-2 ring-sage-400 border border-sage-500/50 shadow-sage-500/20'
                  : 'border border-white/20 hover:border-white/40'
                }`}
              title={`Click to ${isMicOn ? 'Mute' : 'Unmute'} microphone`}
            >
              {isCamOn && localStream && localStream.getVideoTracks().length > 0 ? (
                <video
                  ref={(el) => {
                    localVideoRef.current = el;
                    if (el && el.srcObject !== localStream) {
                      el.srcObject = localStream;
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image
                  src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
                  alt="You"
                  fill
                  unoptimized
                  className="object-cover"
                />
              )}

              {/* Bottom Info Overlay: Name on Left, Mic on Right */}
              <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between pointer-events-none">
                <span className="text-xs font-bold text-white drop-shadow-md truncate max-w-[50px]">
                  You
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMic();
                  }}
                  className={`w-5 h-5 rounded-full flex items-center justify-center shadow-sm shrink-0 pointer-events-auto transition ${isMicOn ? 'bg-emerald-600 text-white' : 'bg-black/60 text-white/80'
                    }`}
                  title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {isMicOn ? <Mic className="w-2.5 h-2.5" /> : <MicOff className="w-2.5 h-2.5" />}
                </button>
              </div>

              {/* Quick Camera Toggle Hover Badge */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCam();
                }}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-[10px]"
                title={isCamOn ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                {isCamOn ? <VideoIcon className="w-3 h-3 text-emerald-400" /> : <VideoOff className="w-3 h-3 text-white/70" />}
              </button>
            </div>

            {/* Connected Room Participants (Presence + Live Video) */}
            {otherParticipants.map((p) => {
              const remoteStream =
                remoteStreams.find((s) => s.peerId === p.id)?.stream ||
                (remoteStreams.length === 1 && otherParticipants.length === 1 ? remoteStreams[0].stream : null);
              const hasLiveVideoTrack = remoteStream && remoteStream.getVideoTracks().some((t) => t.readyState === 'live');
              const showVideo = (p.isCamOn || Boolean(hasLiveVideoTrack)) && remoteStream && remoteStream.getVideoTracks().length > 0;

              return (
                <div
                  key={p.id}
                  className={`relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden shadow-md bg-neutral-900 transition-all ${p.isMicOn ? 'ring-2 ring-sage-400/80 border border-sage-500/40 shadow-sage-500/20' : 'border border-white/20'
                    }`}
                >
                  {showVideo ? (
                    <video
                      ref={(el) => {
                        if (el && el.srcObject !== remoteStream) {
                          el.srcObject = remoteStream;
                          el.play().catch(() => { });
                        }
                      }}
                      autoPlay
                      playsInline
                      onLoadedMetadata={(e) => {
                        (e.target as HTMLVideoElement).play().catch(() => { });
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image
                      src={p.avatar}
                      alt={p.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  )}

                  {/* Bottom Info Overlay: Name on Left, Mic on Right */}
                  <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between pointer-events-none">
                    <span className="text-xs font-bold text-white drop-shadow-md truncate max-w-[52px]">
                      {p.name.split(' ')[0].toLowerCase()}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shadow-sm shrink-0 ${p.isMicOn ? 'bg-emerald-600 text-white' : 'bg-black/60 text-white/80'
                        }`}
                    >
                      {p.isMicOn ? <Mic className="w-2.5 h-2.5" /> : <MicOff className="w-2.5 h-2.5" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Media Controls & Zoom Toggle */}
          <div className="flex items-center gap-1.5 pl-1 pr-1 border-l border-cream-300/80">
            <button
              onClick={toggleMic}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs transition shadow-sm ${isMicOn ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-cream-200 text-warmbrown-600 hover:bg-cream-300'
                }`}
              title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-coral-500" />}
            </button>
            <button
              onClick={toggleCam}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs transition shadow-sm ${isCamOn ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-cream-200 text-warmbrown-600 hover:bg-cream-300'
                }`}
              title={isCamOn ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {isCamOn ? <VideoIcon className="w-4 h-4" /> : <VideoOff className="w-4 h-4 text-neutral-400" />}
            </button>
            <button
              onClick={() => setVcExpanded(true)}
              className="w-9 h-9 rounded-xl bg-cream-200 text-warmbrown-600 hover:bg-cream-300 hover:text-sage-700 flex items-center justify-center text-xs transition shadow-sm"
              title="Zoom Video Call (Move to Right Sidebar)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* RIGHT EXPANDED FULL-HEIGHT VIDEO CALL SIDEBAR (Split Screen Style) */
        <div className="fixed top-0 right-0 bottom-0 z-40 flex w-72 sm:w-80 md:w-88 lg:w-96 animate-slide-in-right flex-col overflow-hidden border-l border-white/[0.06] bg-[#202124] shadow-[-12px_0_40px_rgba(0,0,0,0.45)]">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 pb-3.5 pt-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="vc-live-dot h-2 w-2 rounded-full bg-[#7eb564]" />
                <h4 className="text-sm font-semibold tracking-tight text-white">In call</h4>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/45">
                <Users className="h-3 w-3" />
                <span>{participants.length} participant{participants.length === 1 ? '' : 's'}</span>
              </div>
            </div>

            <button
              onClick={() => setVcExpanded(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-white/80 transition hover:bg-white/[0.14] hover:text-white"
              title="Minimize to top bar"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>

          {/* Participant grid */}
          <div className="vc-sidebar-scrollbar flex-1 space-y-3 overflow-y-auto px-3 py-4">
            <VcParticipantTile
              name={user?.fullName || user?.username || 'You'}
              label={`${user?.fullName || user?.username || 'You'} (You)`}
              avatarUrl={user?.avatarUrl || ''}
              isMicOn={isMicOn}
              isCamOn={isCamOn}
              isYou
              showVideo={Boolean(isCamOn && localStream && localStream.getVideoTracks().length > 0)}
              stream={localStream}
              onToggleMic={toggleMic}
              onToggleCam={toggleCam}
              setVideoRef={(el) => {
                localVideoRef.current = el;
              }}
            />

            {otherParticipants.map((p) => {
              const remoteStream =
                remoteStreams.find((s) => s.peerId === p.id)?.stream ||
                (remoteStreams.length === 1 && otherParticipants.length === 1 ? remoteStreams[0].stream : null);
              const hasLiveVideoTrack = remoteStream && remoteStream.getVideoTracks().some((t) => t.readyState === 'live');
              const showVideo =
                (p.isCamOn || Boolean(hasLiveVideoTrack)) && remoteStream && remoteStream.getVideoTracks().length > 0;

              return (
                <VcParticipantTile
                  key={p.id}
                  name={p.name}
                  label={p.name}
                  avatarUrl={p.avatar}
                  isMicOn={p.isMicOn}
                  isCamOn={p.isCamOn}
                  isSpeaking={p.isSpeaking}
                  showVideo={Boolean(showVideo)}
                  stream={remoteStream}
                  setVideoRef={(el) => {
                    if (el && remoteStream && el.srcObject !== remoteStream) {
                      el.srcObject = remoteStream;
                      el.play().catch(() => {});
                    }
                  }}
                />
              );
            })}
          </div>

          {/* Bottom control bar — Meet / Teams style */}
          <div className="shrink-0 border-t border-white/[0.06] px-4 pb-5 pt-3">
            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={toggleMic}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                  isMicOn
                    ? 'bg-[#3c4043] text-white hover:bg-[#4a4e52]'
                    : 'bg-[#ea4335] text-white hover:bg-[#d93025]'
                }`}
                title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
              >
                {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </button>

              <button
                onClick={toggleCam}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                  isCamOn
                    ? 'bg-[#3c4043] text-white hover:bg-[#4a4e52]'
                    : 'bg-[#3c4043] text-white/70 hover:bg-[#4a4e52] hover:text-white'
                }`}
                title={isCamOn ? 'Turn camera off' : 'Turn camera on'}
              >
                {isCamOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>

              <div className="mx-0.5 h-7 w-px bg-white/10" />

              <button
                onClick={() => setVcExpanded(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3c4043] text-white/80 transition hover:bg-[#4a4e52] hover:text-white"
                title="Minimize to top bar"
              >
                <Minimize2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOOLBARS */}
      <FloatingToolbar
        onZoomIn={() => engineRef.current?.zoom(1.15)}
        onZoomOut={() => engineRef.current?.zoom(0.85)}
        onResetView={() => engineRef.current?.resetView()}
        onScatter={handleScatter}
      />

      {/* MAIN 3D PUZZLE INTERACTIVE VIEWPORT (Split screen layout when VC is expanded) */}
      <div
        ref={containerRef}
        className={`flex-1 w-full h-full relative overflow-hidden transition-all duration-300 cursor-grab active:cursor-grabbing ${isVcExpanded ? 'mr-72 sm:mr-80 md:mr-88 lg:mr-96' : ''
          }`}
      />

      {/* FLOATING CHAT / ACTIVITY MESSAGES OVERLAY */}
      <div
        className={`absolute bottom-24 z-40 flex flex-col gap-2 max-w-xs pointer-events-none transition-all duration-300 ${isVcExpanded ? 'right-[19rem] sm:right-[21rem] md:right-[23rem] lg:right-[25rem]' : 'right-6'
          }`}
      >
        {chatFeed.map((msg) => (
          <button
            key={msg.id}
            onClick={() => useWorkspaceStore.getState().setChatModalOpen(true)}
            className="glass-panel px-3 py-1.5 rounded-2xl text-xs font-medium text-warmbrown-600 shadow-cozy border border-white/80 animate-fade-in pointer-events-auto hover:bg-cream-100 hover:scale-102 transition text-left cursor-pointer"
            title="Click to view full chat history"
          >
            <span className="font-bold text-sage-600">{msg.sender}:</span> {msg.text}
          </button>
        ))}
      </div>

      {/* BOTTOM SYNCHRONIZED DOCK */}
      <FloatingDock
        className={
          isVcExpanded
            ? 'left-[calc((100%-24rem)/2)] -translate-x-1/2 max-w-2xl'
            : 'left-1/2 -translate-x-1/2'
        }
      />
    </div>
  );
}
