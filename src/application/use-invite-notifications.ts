import { useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/infrastructure/supabase/client';
import { useAuthStore } from './use-auth-store';
import { useWorkspaceStore } from './use-workspace-store';
import { RoomInvite } from '@/domain/room';

export function useInviteNotifications() {
  const { user } = useAuthStore();
  const {
    roomConfig,
    selectedPuzzle,
    currentTheme,
    selectedMusicTrack,
    setIncomingInvite,
    addToast,
  } = useWorkspaceStore();

  // Send an invitation to a specific friend
  const sendRoomInvite = useCallback(
    async (friendId: string, friendName: string) => {
      if (!user) {
        addToast('Please sign in to invite friends.');
        return { error: 'Not authenticated' };
      }

      const invitePayload: RoomInvite = {
        id: `invite-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sender: {
          id: user.id,
          name: user.fullName || user.username || 'Friend',
          username: user.username,
          avatar: user.avatarUrl,
        },
        room: {
          id: roomConfig.id,
          title: roomConfig.title,
          puzzle: selectedPuzzle,
          pieceCount: roomConfig.pieceCount,
          theme: currentTheme,
          musicTrack: selectedMusicTrack,
        },
        timestamp: Date.now(),
      };

      if (!isSupabaseConfigured) {
        addToast(`Demo: Invitation sent to ${friendName}!`);
        return { success: true };
      }

      try {
        const inviteChannel = supabase.channel(`invites:${friendId}`);
        await inviteChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await inviteChannel.send({
              type: 'broadcast',
              event: 'room-invite',
              payload: invitePayload,
            });
            setTimeout(() => {
              inviteChannel.unsubscribe();
            }, 1500);
          }
        });

        addToast(`Invitation sent to ${friendName}!`);
        return { success: true };
      } catch (err: any) {
        console.error('Failed to send invite:', err);
        addToast(`Failed to send invitation to ${friendName}.`);
        return { error: err.message };
      }
    },
    [user, roomConfig, selectedPuzzle, currentTheme, selectedMusicTrack, addToast]
  );

  // Listen for incoming invitations on user's personal channel
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;

    const channel = supabase.channel(`invites:${user.id}`);

    channel
      .on('broadcast', { event: 'room-invite' }, ({ payload }: { payload: RoomInvite }) => {
        console.log('Received room invite:', payload);
        setIncomingInvite(payload);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, setIncomingInvite]);

  return {
    sendRoomInvite,
  };
}
