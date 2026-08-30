'use client';

import React, { useEffect, useState } from 'react';
import { useFriendsStore } from '@/application/use-friends-store';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import { useInviteNotifications } from '@/application/use-invite-notifications';
import { X, Search, UserPlus, Check, UserX, Send, Users } from 'lucide-react';
import { UserProfile } from '@/domain/auth';
import Image from 'next/image';

export function FriendsModal() {
  const {
    isFriendsModalOpen,
    setFriendsModalOpen,
    friends,
    onlineFriendIds,
    pendingRequests,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    fetchFriends,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
  } = useFriendsStore();

  const { addToast, participants } = useWorkspaceStore();
  const { sendRoomInvite } = useInviteNotifications();
  const [invitedIds, setInvitedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isFriendsModalOpen) {
      fetchFriends();
    }
  }, [isFriendsModalOpen, fetchFriends]);

  if (!isFriendsModalOpen) return null;

  const isFriendInRoom = (friend: UserProfile) => {
    return participants.some(
      (p) =>
        p.id === friend.id ||
        (friend.fullName && p.name.toLowerCase() === friend.fullName.toLowerCase()) ||
        (friend.username && p.name.toLowerCase() === friend.username.toLowerCase())
    );
  };

  const isFriendOnline = (friend: UserProfile) => {
    if (isFriendInRoom(friend)) return true;
    return onlineFriendIds.includes(friend.id);
  };

  const handleAddFriend = async (userId: string, username: string) => {
    const res = await sendFriendRequest(userId);
    if (res.error) {
      addToast(res.error);
    } else {
      addToast(`Friend request sent to @${username}!`);
    }
  };

  const handleInviteToRoom = async (friendId: string, friendName: string) => {
    setInvitedIds((prev) => ({ ...prev, [friendId]: true }));
    await sendRoomInvite(friendId, friendName);
    setTimeout(() => {
      setInvitedIds((prev) => ({ ...prev, [friendId]: false }));
    }, 4000);
  };

  const sortedFriends = [...friends].sort((a, b) => {
    const aInRoom = isFriendInRoom(a);
    const bInRoom = isFriendInRoom(b);
    if (aInRoom && !bInRoom) return -1;
    if (!aInRoom && bInRoom) return 1;

    const aOnline = isFriendOnline(a);
    const bOnline = isFriendOnline(b);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;

    return a.fullName.localeCompare(b.fullName);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="glass-panel max-w-lg w-full p-8 rounded-[2.5rem] shadow-float border border-white/80 relative">
        {/* Close Button */}
        <button
          onClick={() => setFriendsModalOpen(false)}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center text-neutral-500 hover:text-warmbrown-600 text-sm transition"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-2xl font-serif text-warmbrown-600 font-bold mb-1">Friends & Connections</h3>
        <p className="text-xs text-neutral-500 mb-6">Search users by username to send friend requests & invite to cozy puzzle sessions.</p>

        {/* Search Input Box */}
        <div className="relative mb-6">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-xs text-warmbrown-600 border border-cream-300 focus:outline-none focus:ring-1 focus:ring-sage-500"
          />
        </div>

        {/* Search Results */}
        {searchQuery.trim() && (
          <div className="mb-6">
            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Search Results</h4>
            {isSearching ? (
              <p className="text-xs text-neutral-400 italic">Searching users...</p>
            ) : searchResults.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">No users found matching &quot;{searchQuery}&quot;</p>
            ) : (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-cream-200">
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden">
                        <Image src={user.avatarUrl} alt={user.fullName} fill className="object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-warmbrown-600">{user.fullName}</p>
                        <p className="text-[10px] text-neutral-400">@{user.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddFriend(user.id, user.username)}
                      className="px-3 py-1.5 bg-sage-500 text-white rounded-xl text-xs font-semibold hover:bg-sage-600 transition flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Friend Requests */}
        {pendingRequests.length > 0 && (
          <div className="mb-6">
            <h4 className="text-[10px] font-bold text-coral-400 uppercase tracking-wider mb-2">
              Pending Requests ({pendingRequests.length})
            </h4>
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-coral-400/5 border border-coral-400/20">
                  <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden">
                      <Image src={req.friendProfile?.avatarUrl || ''} alt="" fill className="object-cover" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-warmbrown-600">{req.friendProfile?.fullName}</p>
                      <p className="text-[10px] text-neutral-400">@{req.friendProfile?.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => acceptFriendRequest(req.id)}
                      className="p-1.5 bg-emerald-500 text-white rounded-lg text-xs hover:bg-emerald-600 transition"
                      title="Accept"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => rejectFriendRequest(req.id)}
                      className="p-1.5 bg-neutral-200 text-neutral-600 rounded-lg text-xs hover:bg-neutral-300 transition"
                      title="Reject"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-bold text-warmbrown-600 uppercase tracking-wider">
              My Friends ({friends.length})
            </h4>
            <span className="text-[10px] text-emerald-600 font-semibold">
              {friends.filter((f) => isFriendOnline(f)).length} Online
            </span>
          </div>

          {friends.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-cream-100/60 border border-cream-200">
              <p className="text-xs font-medium text-warmbrown-600">No friends added yet</p>
              <p className="text-[11px] text-neutral-400 mt-1">Use the search box above to find and add friends by their username.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {sortedFriends.map((friend) => {
                const inRoom = isFriendInRoom(friend);
                const online = isFriendOnline(friend);

                return (
                  <div key={friend.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-cream-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="relative w-9 h-9 rounded-full overflow-visible">
                        <div className="w-9 h-9 rounded-full overflow-hidden relative">
                          <Image src={friend.avatarUrl} alt={friend.fullName} fill className="object-cover" />
                        </div>
                        {/* Real-time Online Indicator */}
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                            online ? 'bg-emerald-500' : 'bg-neutral-300'
                          }`}
                          title={online ? 'Online' : 'Offline'}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-warmbrown-600">{friend.fullName}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-neutral-400">@{friend.username}</span>
                          <span className="text-[9px] text-neutral-300">·</span>
                          {inRoom ? (
                            <span className="text-[10px] text-sage-600 font-bold">In Room</span>
                          ) : online ? (
                            <span className="text-[10px] text-emerald-600 font-semibold">Online</span>
                          ) : (
                            <span className="text-[10px] text-neutral-400 font-normal">Offline</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {inRoom ? (
                      <div className="px-3 py-1.5 rounded-xl bg-sage-50 text-sage-700 border border-sage-200/80 text-xs font-semibold flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-sage-600" />
                        <span>In Room</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleInviteToRoom(friend.id, friend.fullName)}
                        disabled={invitedIds[friend.id]}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                          invitedIds[friend.id]
                            ? 'bg-sage-100 text-sage-700'
                            : online
                            ? 'bg-sage-500 text-white hover:bg-sage-600 shadow-sm'
                            : 'bg-cream-200 text-neutral-500 hover:bg-cream-300'
                        }`}
                        title={online ? 'Invite to Room' : 'Send Invite (Offline)'}
                      >
                        {invitedIds[friend.id] ? (
                          <>
                            <Check className="w-3 h-3 text-sage-700" /> Invited
                          </>
                        ) : (
                          <>
                            <Send className="w-3 h-3" /> Invite
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
