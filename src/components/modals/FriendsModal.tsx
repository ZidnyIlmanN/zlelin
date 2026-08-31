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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in select-none">
      {/* Dark Backdrop without blur */}
      <div
        className="absolute inset-0 bg-black/80 transition-opacity"
        onClick={() => setFriendsModalOpen(false)}
      />

      <div className="relative z-10 bg-[#0F1513] max-w-md w-full p-6 sm:p-7 rounded-[2.5rem] shadow-2xl border border-white/5 text-white animate-scale-up max-h-[90vh] flex flex-col">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Friends & Connections</h3>
            <p className="text-xs text-neutral-400 mt-0.5">Invite friends to play cozy puzzles together</p>
          </div>
          <button
            onClick={() => setFriendsModalOpen(false)}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto custom-scrollbar flex-1 space-y-5 pr-1">
          
          {/* Search Input Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.04] text-xs text-white placeholder-neutral-500 focus:outline-none focus:bg-white/[0.07] transition"
            />
          </div>

          {/* Search Results */}
          {searchQuery.trim() && (
            <div>
              <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Search Results</h4>
              {isSearching ? (
                <p className="text-xs text-neutral-400 italic">Searching users...</p>
              ) : searchResults.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">No users found matching &quot;{searchQuery}&quot;</p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden">
                          <Image src={user.avatarUrl} alt={user.fullName} fill className="object-cover" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{user.fullName}</p>
                          <p className="text-[10px] text-neutral-400">@{user.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddFriend(user.id, user.username)}
                        className="px-3 py-1.5 bg-[#788A75] text-white rounded-xl text-xs font-semibold hover:bg-[#687A65] transition flex items-center gap-1"
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
            <div>
              <h4 className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                Pending Requests ({pendingRequests.length})
              </h4>
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden">
                        <Image src={req.friendProfile?.avatarUrl || ''} alt="" fill className="object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{req.friendProfile?.fullName}</p>
                        <p className="text-[10px] text-neutral-400">@{req.friendProfile?.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => acceptFriendRequest(req.id)}
                        className="p-1.5 bg-emerald-700/60 hover:bg-emerald-600 text-white rounded-xl text-xs transition"
                        title="Accept"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(req.id)}
                        className="p-1.5 bg-white/10 hover:bg-white/20 text-neutral-300 rounded-xl text-xs transition"
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
              <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                My Friends ({friends.length})
              </h4>
              <span className="text-[10px] text-neutral-400 font-medium">
                {friends.filter((f) => isFriendOnline(f)).length} Online
              </span>
            </div>

            {friends.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-white/[0.02]">
                <p className="text-xs font-medium text-neutral-300">No friends added yet</p>
                <p className="text-[11px] text-neutral-500 mt-1">Search by username above to send friend requests.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {sortedFriends.map((friend) => {
                  const inRoom = isFriendInRoom(friend);
                  const online = isFriendOnline(friend);

                  return (
                    <div key={friend.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] transition">
                      <div className="flex items-center gap-3">
                        <div className="relative w-9 h-9 rounded-full">
                          <div className="w-9 h-9 rounded-full overflow-hidden relative">
                            <Image src={friend.avatarUrl} alt={friend.fullName} fill className="object-cover" />
                          </div>
                          {/* Online Indicator Dot */}
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#0F1513] ${
                              online ? 'bg-emerald-500' : 'bg-neutral-600'
                            }`}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{friend.fullName}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-neutral-400">@{friend.username}</span>
                            <span className="text-[9px] text-neutral-600">·</span>
                            {inRoom ? (
                              <span className="text-[10px] text-sage-400 font-medium">In Room</span>
                            ) : online ? (
                              <span className="text-[10px] text-neutral-300 font-medium">Online</span>
                            ) : (
                              <span className="text-[10px] text-neutral-500 font-normal">Offline</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {inRoom ? (
                        <div className="px-3 py-1.5 rounded-xl bg-white/5 text-sage-400 text-xs font-semibold flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-sage-400" />
                          <span>In Room</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleInviteToRoom(friend.id, friend.fullName)}
                          disabled={invitedIds[friend.id]}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                            invitedIds[friend.id]
                              ? 'bg-white/10 text-neutral-300'
                              : online
                              ? 'bg-[#788A75] text-white hover:bg-[#687A65]'
                              : 'bg-white/5 text-neutral-400 hover:bg-white/10'
                          }`}
                        >
                          {invitedIds[friend.id] ? (
                            <>
                              <Check className="w-3 h-3 text-sage-300" /> Invited
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
    </div>
  );
}
