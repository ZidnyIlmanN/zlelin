import { useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/infrastructure/supabase/client';
import { useAuthStore } from './use-auth-store';
import { useWorkspaceStore } from './use-workspace-store';
import { useMusicStore } from './use-music-store';
import { RealtimeChannel } from '@supabase/supabase-js';
import { PuzzleItem } from '@/domain/puzzle';
import { Participant, RoomConfig } from '@/domain/room';
import { TableTheme } from '@/domain/theme';
import { MusicState, MusicTrack, MusicControlMode } from '@/domain/music';

export interface RealtimePieceMovePayload {
  pieceId: number;
  x: number;
  y: number;
  isSnapped: boolean;
  heldBy: string;
}

export interface LivePieceDragPayload {
  pieces: { pieceId: number; x: number; y: number }[];
  heldBy: string;
  heldByColor?: string;
}

export interface LivePieceReleasePayload {
  pieces: { pieceId: number; x: number; y: number; isSnapped: boolean }[];
  heldBy: string;
}

export interface BoardSyncPayload {
  pieces: {
    id: number;
    x: number;
    y: number;
    isSnapped: boolean;
    connections: number[];
  }[];
}

export interface GameStartPayload {
  puzzle: PuzzleItem;
  pieceCount: number;
  theme: TableTheme;
  hostName: string;
}

export interface RoomConfigUpdatePayload {
  config: Partial<RoomConfig>;
  puzzle?: PuzzleItem;
  theme?: TableTheme;
}

export function useRealtimeRoom(roomId: string) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const recentJoinedUsersRef = useRef<Map<string, number>>(new Map());
  const { user } = useAuthStore();
  const {
    isMicOn,
    isCamOn,
    roomConfig,
    selectedPuzzle,
    currentTheme,
    setParticipants,
    switchView,
    updateRoomConfig,
    selectPuzzle,
    setTheme,
    addChatMessage,
    addToast,
    triggerVictory,
  } = useWorkspaceStore();

  // 1. Broadcast live continuous dragging (while moving piece)
  const broadcastLiveDrag = useCallback((pieces: { pieceId: number; x: number; y: number }[], heldBy: string) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'piece-live-drag',
      payload: {
        pieces,
        heldBy,
      },
    });
  }, []);

  // 2. Broadcast live piece release (when mouse is released)
  const broadcastLiveRelease = useCallback((pieces: { pieceId: number; x: number; y: number; isSnapped: boolean }[]) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'piece-live-release',
      payload: {
        pieces,
        heldBy: user?.fullName || user?.username || 'Player',
      },
    });
  }, [user]);

  // 3. Broadcast full board sync state
  const broadcastBoardSync = useCallback((pieces: { id: number; x: number; y: number; isSnapped: boolean; connections: number[] }[]) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'board-sync',
      payload: { pieces },
    });
  }, []);

  // 4. Request board state from host / active peers on join
  const requestBoardSync = useCallback(() => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'request-board-sync',
      payload: { from: user?.id },
    });
  }, [user]);

  // 5. Broadcast single piece movement / snap
  const broadcastPieceMove = useCallback((pieceId: number, x: number, y: number, isSnapped: boolean) => {
    if (!channelRef.current || !user) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'piece-move',
      payload: {
        pieceId,
        x,
        y,
        isSnapped,
        heldBy: user.fullName || user.username || 'You',
      },
    });
  }, [user]);

  // 6. Broadcast game start (when Host clicks "Start Session Now")
  const broadcastGameStart = useCallback(async () => {
    const payload: GameStartPayload = {
      puzzle: selectedPuzzle,
      pieceCount: roomConfig.pieceCount,
      theme: currentTheme,
      hostName: user?.fullName || user?.username || 'Host',
    };

    if (channelRef.current) {
      try {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'game-start',
          payload,
        });
      } catch (err) {
        console.error('Failed to broadcast game-start:', err);
      }
    }

    switchView('game');
    addToast('Session started!');
  }, [user, selectedPuzzle, roomConfig.pieceCount, currentTheme, switchView, addToast]);

  // 7. Broadcast room configuration update (puzzle, piece count, theme changes)
  const broadcastRoomConfig = useCallback((config: Partial<RoomConfig>, puzzle?: PuzzleItem, theme?: TableTheme) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'room-config-update',
      payload: {
        config,
        puzzle,
        theme,
      },
    });
  }, []);

  // 8. Broadcast chat message
  const broadcastChatMessage = useCallback((text: string) => {
    if (!channelRef.current || !user) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'chat-message',
      payload: {
        sender: user.fullName || user.username || 'Friend',
        text,
      },
    });
  }, [user]);

  // 9. Broadcast scatter pieces
  const broadcastScatter = useCallback((scatteredPieces?: { id: number; x: number; y: number }[]) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'scatter-pieces',
      payload: { pieces: scatteredPieces },
    });
  }, []);

  // 10. Broadcast game victory
  const broadcastVictory = useCallback(() => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'game-victory',
      payload: {},
    });
  }, []);

  // 11. Broadcast music state update (playback, track change, queue update, permissions)
  const broadcastMusicState = useCallback((state: MusicState, queue: MusicTrack[], controlMode: MusicControlMode) => {
    if (!channelRef.current || !user) return;
    const now = Date.now();
    const stampedState: MusicState = {
      ...state,
      serverTimestamp: state.serverTimestamp ?? state.updatedAt ?? now,
      updatedAt: state.updatedAt ?? state.serverTimestamp ?? now,
    };
    channelRef.current.send({
      type: 'broadcast',
      event: 'music:state-update',
      payload: {
        state: stampedState,
        queue,
        controlMode,
        senderId: user.id,
        senderName: user.fullName || user.username || 'Friend',
      },
    });
  }, [user]);

  // 12. Request current music state from peers (used on join)
  const requestMusicState = useCallback(() => {
    if (!channelRef.current || !user) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'music:state-request',
      payload: { fromId: user.id },
    });
  }, [user]);

  useEffect(() => {
    if (!isSupabaseConfigured || !user || !roomId) return;

    // Connect music store broadcast dispatcher
    useMusicStore.getState().setBroadcastDispatcher(broadcastMusicState);

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        presence: { key: user.id },
      },
    });

    channel
      // Presence Sync: update participants list with all real connected users
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const connectedUsers: Participant[] = [];

        Object.values(presenceState).forEach((presences: any) => {
          presences.forEach((p: any) => {
            connectedUsers.push({
              id: p.id,
              name: p.name || 'Friend',
              avatar: p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
              isHost: p.id === roomConfig.id.split('-')[0] || p.isHost || false,
              isMicOn: p.isMicOn ?? true,
              isCamOn: p.isCamOn ?? false,
            });
          });
        });

        if (connectedUsers.length > 0) {
          setParticipants(connectedUsers);
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const now = Date.now();
        newPresences.forEach((np: any) => {
          if (np.id !== user.id) {
            const lastJoinedTime = recentJoinedUsersRef.current.get(np.id) || 0;
            // Only toast if not announced in the last 15 seconds (prevents spam on tab switch / window blur)
            if (now - lastJoinedTime > 15000) {
              recentJoinedUsersRef.current.set(np.id, now);
              addToast(`${np.name || 'A friend'} joined the room!`);
            }

            // Sync music state to newly joined peer
            const musicStore = useMusicStore.getState();
            channel.send({
              type: 'broadcast',
              event: 'music:state-response',
              payload: {
                state: musicStore.musicState,
                queue: musicStore.queue,
                controlMode: musicStore.controlMode,
              },
            });

            // Trigger board sync so new peer gets current board layout
            window.dispatchEvent(new CustomEvent('send-board-sync-to-peer'));
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const now = Date.now();
        leftPresences.forEach((lp: any) => {
          if (lp.id !== user.id) {
            const lastJoinedTime = recentJoinedUsersRef.current.get(lp.id) || 0;
            // Only toast if peer was connected and not a quick flicker (<3s)
            if (now - lastJoinedTime > 8000) {
              addToast(`${lp.name || 'A friend'} left the room.`);
              recentJoinedUsersRef.current.delete(lp.id);
            }
          }
        });
      })
      // Broadcast Game Start Event (synchronously transition all peers to workspace canvas)
      .on('broadcast', { event: 'game-start' }, ({ payload }: { payload: GameStartPayload }) => {
        const store = useWorkspaceStore.getState();
        const isAlreadyInGame = store.currentView === 'game';

        if (payload.puzzle) {
          store.selectPuzzle(payload.puzzle);
        }
        if (payload.pieceCount) {
          store.updateRoomConfig({ pieceCount: payload.pieceCount });
        }
        if (payload.theme) {
          store.setTheme(payload.theme);
        }

        if (!isAlreadyInGame) {
          store.switchView('game');
          store.addToast(`${payload.hostName || 'Host'} started the session!`);
        }
      })
      // Broadcast Room Config Update Event
      .on('broadcast', { event: 'room-config-update' }, ({ payload }: { payload: RoomConfigUpdatePayload }) => {
        if (payload.config) updateRoomConfig(payload.config);
        if (payload.puzzle) selectPuzzle(payload.puzzle);
        if (payload.theme) setTheme(payload.theme);
      })
      // Broadcast Live Piece Drag Event (real-time movement with heldBy indicator)
      .on('broadcast', { event: 'piece-live-drag' }, ({ payload }: { payload: LivePieceDragPayload }) => {
        window.dispatchEvent(new CustomEvent('remote-piece-live-drag', { detail: payload }));
      })
      // Broadcast Live Piece Release Event
      .on('broadcast', { event: 'piece-live-release' }, ({ payload }: { payload: LivePieceReleasePayload }) => {
        window.dispatchEvent(new CustomEvent('remote-piece-live-release', { detail: payload }));
      })
      // Broadcast Full Board Sync Event
      .on('broadcast', { event: 'board-sync' }, ({ payload }: { payload: BoardSyncPayload }) => {
        window.dispatchEvent(new CustomEvent('remote-board-sync', { detail: payload }));
      })
      // Broadcast Request Board Sync
      .on('broadcast', { event: 'request-board-sync' }, () => {
        window.dispatchEvent(new CustomEvent('send-board-sync-to-peer'));
      })
      // Broadcast Piece Move Event
      .on('broadcast', { event: 'piece-move' }, ({ payload }: { payload: RealtimePieceMovePayload }) => {
        window.dispatchEvent(new CustomEvent('remote-piece-move', { detail: payload }));
      })
      // Broadcast Scatter Event
      .on('broadcast', { event: 'scatter-pieces' }, ({ payload }: { payload?: { pieces?: { id: number; x: number; y: number }[] } }) => {
        window.dispatchEvent(new CustomEvent('remote-scatter-pieces', { detail: payload }));
      })
      // Broadcast Victory Event
      .on('broadcast', { event: 'game-victory' }, () => {
        triggerVictory();
      })
      // Broadcast Chat Event
      .on('broadcast', { event: 'chat-message' }, ({ payload }: { payload: { sender: string; text: string } }) => {
        addChatMessage(payload.sender, payload.text);
      })
      // Broadcast Music State Update Event
      .on('broadcast', { event: 'music:state-update' }, ({ payload }: { payload: { state: MusicState; queue: MusicTrack[]; controlMode: MusicControlMode; senderName: string } }) => {
        useMusicStore.getState().applyRemoteMusicState(payload.state, payload.queue, payload.controlMode);
      })
      // Broadcast Music State Request Event (from newly joined peer)
      .on('broadcast', { event: 'music:state-request' }, () => {
        const musicStore = useMusicStore.getState();
        channel.send({
          type: 'broadcast',
          event: 'music:state-response',
          payload: {
            state: musicStore.musicState,
            queue: musicStore.queue,
            controlMode: musicStore.controlMode,
          },
        });
      })
      // Broadcast Music State Response Event
      .on('broadcast', { event: 'music:state-response' }, ({ payload }: { payload: { state: MusicState; queue: MusicTrack[]; controlMode: MusicControlMode } }) => {
        useMusicStore.getState().applyRemoteMusicState(payload.state, payload.queue, payload.controlMode);
      })
      // Broadcast Peer Media Update Event (immediate camera / mic state reflection)
      .on('broadcast', { event: 'peer-media-update' }, ({ payload }: { payload: { id: string; isMicOn: boolean; isCamOn: boolean } }) => {
        const store = useWorkspaceStore.getState();
        const updated = store.participants.map((p) =>
          p.id === payload.id ? { ...p, isMicOn: payload.isMicOn, isCamOn: payload.isCamOn } : p
        );
        store.setParticipants(updated);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: user.id,
            name: user.fullName || user.username || 'You',
            avatar: user.avatarUrl,
            isHost: user.fullName === roomConfig.hostName,
            isMicOn: useWorkspaceStore.getState().isMicOn,
            isCamOn: useWorkspaceStore.getState().isCamOn,
          });

          channel.send({
            type: 'broadcast',
            event: 'music:state-request',
            payload: { fromId: user.id },
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // Reconnection recovery: request music state when channel reconnects
          setTimeout(() => {
            if (channelRef.current) {
              channelRef.current.send({
                type: 'broadcast',
                event: 'music:state-request',
                payload: { fromId: user.id },
              });
            }
          }, 2000);
        }
      });

    channelRef.current = channel;

    // Listen for custom send-chat-message event from FloatingDock or ChatModal
    const handleSendChat = (e: Event) => {
      const customEvent = e as CustomEvent<{ text: string }>;
      if (customEvent.detail?.text) {
        broadcastChatMessage(customEvent.detail.text);
      }
    };
    window.addEventListener('send-chat-message', handleSendChat);

    return () => {
      window.removeEventListener('send-chat-message', handleSendChat);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [
    roomId,
    user?.id,
    user?.fullName,
    user?.username,
    user?.avatarUrl,
    roomConfig.hostName,
    roomConfig.id,
    broadcastChatMessage,
    broadcastMusicState,
    setParticipants,
    switchView,
    updateRoomConfig,
    selectPuzzle,
    setTheme,
    addChatMessage,
    addToast,
    triggerVictory,
  ]);

  // Synchronize dynamic Mic/Cam status updates to peers without reconnecting channel
  useEffect(() => {
    if (!channelRef.current || !user) return;

    channelRef.current.track({
      id: user.id,
      name: user.fullName || user.username || 'You',
      avatar: user.avatarUrl,
      isHost: user.fullName === roomConfig.hostName,
      isMicOn,
      isCamOn,
    });

    channelRef.current.send({
      type: 'broadcast',
      event: 'peer-media-update',
      payload: {
        id: user.id,
        isMicOn,
        isCamOn,
      },
    });
  }, [isMicOn, isCamOn, user, roomConfig.hostName]);

  return {
    broadcastPieceMove,
    broadcastLiveDrag,
    broadcastLiveRelease,
    broadcastBoardSync,
    requestBoardSync,
    broadcastGameStart,
    broadcastRoomConfig,
    broadcastChatMessage,
    broadcastScatter,
    broadcastVictory,
    broadcastMusicState,
    requestMusicState,
  };
}

/**
 * Dispatch real-time chat message to all connected peers in the active room.
 */
export function sendRoomChatMessage(text: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('send-chat-message', { detail: { text } }));
  }
}
