import { create } from 'zustand';
import { UserProfile } from '@/domain/auth';
import { Friendship } from '@/domain/friend';
import { supabase, isSupabaseConfigured } from '@/infrastructure/supabase/client';
import { useAuthStore } from './use-auth-store';

interface FriendsStoreState {
  friends: UserProfile[];
  pendingRequests: Friendship[];
  onlineFriendIds: string[];
  searchQuery: string;
  searchResults: UserProfile[];
  isSearching: boolean;
  isFriendsModalOpen: boolean;
  isInitialized: boolean;
  
  // Actions
  setFriendsModalOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  fetchFriends: () => Promise<void>;
  initFriendsListener: () => void;
  initPresenceChannel: () => void;
  searchUsers: (query: string) => Promise<void>;
  sendFriendRequest: (targetUserId: string) => Promise<{ error?: string }>;
  acceptFriendRequest: (friendshipId: string) => Promise<void>;
  rejectFriendRequest: (friendshipId: string) => Promise<void>;
}

let realtimeChannel: any = null;
let presenceChannel: any = null;

export const useFriendsStore = create<FriendsStoreState>((set, get) => ({
  friends: [],
  pendingRequests: [],
  onlineFriendIds: [],
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  isFriendsModalOpen: false,
  isInitialized: false,

  setFriendsModalOpen: (open) => {
    set({ isFriendsModalOpen: open });
    if (open) {
      get().fetchFriends();
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    if (query.trim()) {
      get().searchUsers(query);
    } else {
      set({ searchResults: [] });
    }
  },

  initPresenceChannel: () => {
    const currentUser = useAuthStore.getState().user;
    if (!isSupabaseConfigured || !currentUser || presenceChannel) return;

    try {
      presenceChannel = supabase.channel('presence:online', {
        config: {
          presence: { key: currentUser.id },
        },
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = presenceChannel.presenceState();
          const allOnlineIds = new Set<string>();

          Object.values(presenceState).forEach((presences: any) => {
            presences.forEach((p: any) => {
              if (p.userId) {
                allOnlineIds.add(p.userId);
              }
            });
          });

          // Cross-reference with friends list
          const friendIds = get().friends.map((f) => f.id);
          const onlineFriends = friendIds.filter((id) => allOnlineIds.has(id));
          set({ onlineFriendIds: onlineFriends });
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              userId: currentUser.id,
              userName: currentUser.fullName || currentUser.username || 'User',
              onlineAt: new Date().toISOString(),
            });
          }
        });
    } catch (err) {
      console.warn('[Friends Store] Presence channel error:', err);
    }
  },

  initFriendsListener: () => {
    get().fetchFriends();
    get().initPresenceChannel();

    if (!isSupabaseConfigured || realtimeChannel) return;

    try {
      realtimeChannel = supabase
        .channel('public:friendships_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'friendships' },
          () => {
            get().fetchFriends();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[Friends Store] Realtime listener error:', err);
    }
  },

  fetchFriends: async () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;

    if (!isSupabaseConfigured) {
      set({
        friends: [
          {
            id: 'friend-1',
            email: 'clara@zlelin.app',
            username: 'clara',
            fullName: 'Clara Oswald',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            status: 'online',
          },
        ],
        isInitialized: true,
      });
      return;
    }

    try {
      // Fetch accepted friendships
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          user:profiles!friendships_user_id_fkey(*),
          friend:profiles!friendships_friend_id_fkey(*)
        `)
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`);

      if (error) {
        console.warn('[Friends Store] Fetch error:', error.message);
        return;
      }

      if (friendships) {
        const accepted: UserProfile[] = [];
        const pending: Friendship[] = [];

        friendships.forEach((f: Record<string, any>) => {
          if (f.status === 'accepted') {
            const friendData = (f.user_id === currentUser.id ? f.friend : f.user) as Record<string, any> | null;
            if (friendData && !Array.isArray(friendData) && friendData.id) {
              accepted.push({
                id: friendData.id,
                email: '',
                username: friendData.username || '',
                fullName: friendData.full_name || '',
                avatarUrl: friendData.avatar_url || '',
                status: friendData.status || 'online',
              });
            }
          } else if (f.status === 'pending' && f.friend_id === currentUser.id) {
            const userProfile = f.user as Record<string, any> | null;
            pending.push({
              id: f.id,
              userId: f.user_id,
              friendId: f.friend_id,
              status: f.status,
              createdAt: f.created_at,
              friendProfile: userProfile ? {
                id: userProfile.id,
                email: '',
                username: userProfile.username || '',
                fullName: userProfile.full_name || '',
                avatarUrl: userProfile.avatar_url || '',
                status: userProfile.status || 'online',
              } : undefined,
            });
          }
        });

        set({ friends: accepted, pendingRequests: pending, isInitialized: true });

        // Recalculate online friends from presence state
        if (presenceChannel) {
          try {
            const presenceState = presenceChannel.presenceState();
            const allOnlineIds = new Set<string>();
            Object.values(presenceState).forEach((presences: any) => {
              presences.forEach((p: any) => {
                if (p.userId) allOnlineIds.add(p.userId);
              });
            });
            const onlineFriends = accepted.map((f) => f.id).filter((id) => allOnlineIds.has(id));
            set({ onlineFriendIds: onlineFriends });
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      console.warn('[Friends Store] Fetch exception:', err);
    }
  },

  searchUsers: async (query) => {
    if (!query.trim()) return;
    set({ isSearching: true });

    if (!isSupabaseConfigured) {
      set({
        searchResults: [
          {
            id: 'search-1',
            email: 'sam.smith@zlelin.app',
            username: 'samsmith',
            fullName: 'Sam Smith',
            avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
            status: 'online',
          },
        ],
        isSearching: false,
      });
      return;
    }

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${query}%`)
        .limit(5);

      if (data) {
        set({
          searchResults: data.map((d) => ({
            id: d.id,
            email: '',
            username: d.username,
            fullName: d.full_name,
            avatarUrl: d.avatar_url,
            status: d.status || 'online',
          })),
          isSearching: false,
        });
      } else {
        set({ searchResults: [], isSearching: false });
      }
    } catch {
      set({ isSearching: false });
    }
  },

  sendFriendRequest: async (targetUserId) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser || !isSupabaseConfigured) {
      return { error: 'You must be logged in to send friend requests.' };
    }

    if (currentUser.id === targetUserId) {
      return { error: 'You cannot send a friend request to yourself.' };
    }

    try {
      const { error } = await supabase.from('friendships').insert({
        user_id: currentUser.id,
        friend_id: targetUserId,
        status: 'pending',
      });

      if (error) {
        if (error.code === '23505') {
          return { error: 'Friend request already sent or exists.' };
        }
        return { error: error.message };
      }

      await get().fetchFriends();
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to send friend request.' };
    }
  },

  acceptFriendRequest: async (friendshipId) => {
    if (!isSupabaseConfigured) return;
    try {
      await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);
      await get().fetchFriends();
    } catch {
      // Ignored
    }
  },

  rejectFriendRequest: async (friendshipId) => {
    if (!isSupabaseConfigured) return;
    try {
      await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);
      await get().fetchFriends();
    } catch {
      // Ignored
    }
  },
}));
