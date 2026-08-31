'use client';

import React, { useState } from 'react';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import { useAuthStore } from '@/application/use-auth-store';
import { useFriendsStore } from '@/application/use-friends-store';
import { useRealtimeRoom } from '@/application/use-realtime-room';
import { useInviteNotifications } from '@/application/use-invite-notifications';
import { THEME_OPTIONS, TableTheme, MUSIC_TRACKS, MusicTrackId } from '@/domain/theme';
import { Play, Copy, QrCode, Mic, MicOff, Video, VideoOff, UserPlus, Send, LogIn, Check, Users } from 'lucide-react';
import { UserProfile } from '@/domain/auth';
import Image from 'next/image';

export function LobbyView() {
  const {
    selectedPuzzle,
    roomConfig,
    participants,
    currentTheme,
    setTheme,
    selectedMusicTrack,
    setMusicTrack,
    switchView,
    updateRoomConfig,
    joinRoomById,
    addToast,
  } = useWorkspaceStore();

  const { user } = useAuthStore();
  const { friends, onlineFriendIds, setFriendsModalOpen } = useFriendsStore();
  const { broadcastGameStart, broadcastRoomConfig } = useRealtimeRoom(roomConfig.id);
  const { sendRoomInvite } = useInviteNotifications();

  const [inputRoomId, setInputRoomId] = useState('');
  const [invitedIds, setInvitedIds] = useState<Record<string, boolean>>({});

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

  const roomLink = typeof window !== 'undefined'
    ? `${window.location.origin}/?room=${roomConfig.id}`
    : `https://zlelin.app/?room=${roomConfig.id}`;

  const copyInviteLink = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(roomLink);
      addToast('Room link copied to clipboard!');
    }
  };

  const handleStartGame = async () => {
    await broadcastGameStart();
  };

  const handlePieceCountChange = (count: number) => {
    updateRoomConfig({ pieceCount: count });
    broadcastRoomConfig({ pieceCount: count });
  };

  const handleThemeChange = (theme: TableTheme) => {
    setTheme(theme);
    updateRoomConfig({ theme });
    broadcastRoomConfig({ theme }, undefined, theme);
  };

  const handleMusicChange = (track: MusicTrackId) => {
    setMusicTrack(track);
    updateRoomConfig({ musicTrack: track });
    broadcastRoomConfig({ musicTrack: track });
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputRoomId.trim()) {
      joinRoomById(inputRoomId);
      setInputRoomId('');
    }
  };

  const handleInviteFriend = async (friendId: string, friendName: string) => {
    setInvitedIds((prev) => ({ ...prev, [friendId]: true }));
    await sendRoomInvite(friendId, friendName);
    setTimeout(() => {
      setInvitedIds((prev) => ({ ...prev, [friendId]: false }));
    }, 4000);
  };

  // Connected users in this room (current user + peers from presence)
  const isHost = !user || user.fullName === roomConfig.hostName || user.username === roomConfig.hostName;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-white select-none">

      {/* Lobby Container */}
      <div className="bg-[#0F1513] p-6 sm:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
        
        {/* Top Title Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-white/5 gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-serif text-white font-medium">
                {roomConfig.title}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold">
                Active
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Host: <span className="font-semibold text-neutral-200">{roomConfig.hostName}</span> · Room Code: <span className="font-mono text-neutral-300 font-bold tracking-wider">{roomConfig.id}</span>
            </p>
          </div>

          <button
            onClick={handleStartGame}
            className="px-6 py-3 rounded-2xl bg-[#788A75] hover:bg-[#687A65] text-white font-semibold text-sm transition shadow-sm flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Session Now
          </button>
        </div>

        {/* 2 Column Setup Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
          
          {/* Left Column: Invite & Room Members */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Invite Link Box */}
            <div className="bg-white/[0.03] p-5 rounded-2xl">
              <label className="text-[11px] font-semibold text-neutral-400 tracking-wider uppercase block mb-2">
                Share Room Invitation
              </label>
              
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  readOnly
                  value={roomLink}
                  className="flex-1 bg-white/[0.04] px-3 py-2 rounded-xl text-xs text-neutral-300 focus:outline-none font-mono truncate"
                />
                <button
                  onClick={copyInviteLink}
                  className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-medium transition flex items-center gap-1 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>

              {/* Join By Room Code Input */}
              <form onSubmit={handleJoinByCode} className="flex items-center gap-2 pt-3 border-t border-white/5">
                <input
                  type="text"
                  placeholder="Enter Room Code (e.g. ZLE-8842)"
                  value={inputRoomId}
                  onChange={(e) => setInputRoomId(e.target.value)}
                  className="flex-1 bg-white/[0.04] px-3 py-2 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none uppercase font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-[#788A75] hover:bg-[#687A65] text-white rounded-xl text-xs font-medium transition shrink-0"
                >
                  Join
                </button>
              </form>
            </div>

            {/* Connected in Room (Real Presence) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-semibold text-neutral-400 tracking-wider uppercase">
                  Players in Room ({Math.max(1, participants.length)})
                </h3>
              </div>

              <div className="space-y-2">
                {/* Current User */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 rounded-full overflow-hidden ring-1 ring-white/15">
                      <Image
                        src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                        alt={user?.fullName || 'You'}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        {user?.fullName || user?.username || 'You'} (You)
                      </p>
                      <span className="text-[10px] text-sage-400 font-medium">
                        {isHost ? 'Host · Ready' : 'Participant · Ready'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-[10px] font-medium text-neutral-300">Online</span>
                  </div>
                </div>

                {/* Other Connected Room Participants */}
                {participants
                  .filter((p) => p.id !== user?.id)
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03]">
                      <div className="flex items-center gap-3">
                        <div className="relative w-9 h-9 rounded-full overflow-hidden">
                          <Image src={p.avatar} alt={p.name} fill className="object-cover" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{p.name}</p>
                          <span className="text-[10px] text-sage-400 font-medium">
                            {p.isHost ? 'Host' : 'Connected'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span className="text-[10px] font-medium text-neutral-300">In Room</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Quick Friend Invite Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-semibold text-neutral-400 tracking-wider uppercase">
                  Invite Friends ({friends.length})
                </h3>
                <button
                  onClick={() => setFriendsModalOpen(true)}
                  className="text-xs text-sage-400 font-medium cursor-pointer hover:text-sage-300 flex items-center gap-1 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Manage
                </button>
              </div>

              {friends.length === 0 ? (
                <div className="p-4 rounded-2xl bg-white/[0.02] text-center">
                  <p className="text-xs text-neutral-500">No friends added yet.</p>
                  <button
                    onClick={() => setFriendsModalOpen(true)}
                    className="mt-2 text-xs text-sage-400 font-semibold hover:text-sage-300 transition"
                  >
                    + Find & Add Friends
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {[...friends]
                    .sort((a, b) => {
                      const aInRoom = isFriendInRoom(a);
                      const bInRoom = isFriendInRoom(b);
                      if (aInRoom && !bInRoom) return -1;
                      if (!aInRoom && bInRoom) return 1;

                      const aOnline = isFriendOnline(a);
                      const bOnline = isFriendOnline(b);
                      if (aOnline && !bOnline) return -1;
                      if (!aOnline && bOnline) return 1;

                      return a.fullName.localeCompare(b.fullName);
                    })
                    .map((friend) => {
                      const inRoom = isFriendInRoom(friend);
                      const online = isFriendOnline(friend);

                      return (
                        <div key={friend.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] transition">
                          <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8 rounded-full">
                              <div className="w-8 h-8 rounded-full overflow-hidden relative">
                                <Image src={friend.avatarUrl} alt={friend.fullName} fill className="object-cover" />
                              </div>
                              {/* Online Indicator */}
                              <span
                                className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-[#0F1513] ${
                                  online ? 'bg-emerald-500' : 'bg-neutral-600'
                                }`}
                              />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{friend.fullName}</p>
                              <div className="flex items-center gap-1">
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
                            <div className="px-2.5 py-1 rounded-xl bg-white/5 text-sage-400 text-[11px] font-semibold flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>In Room</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleInviteFriend(friend.id, friend.fullName)}
                              disabled={invitedIds[friend.id]}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                                invitedIds[friend.id]
                                  ? 'bg-white/10 text-neutral-300'
                                  : online
                                  ? 'bg-[#788A75] text-white hover:bg-[#687A65]'
                                  : 'bg-white/5 text-neutral-400 hover:bg-white/10'
                              }`}
                            >
                              {invitedIds[friend.id] ? (
                                <>
                                  <Check className="w-3 h-3 text-sage-300" /> Sent
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

          {/* Right Column: Room & Puzzle Configuration */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Selected Puzzle Preview */}
            <div className="p-4 rounded-2xl bg-white/[0.03] flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden shadow-sm shrink-0">
                <Image src={selectedPuzzle.url} alt={selectedPuzzle.title} fill className="object-cover" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-semibold text-sage-400 uppercase tracking-wider">
                  Selected Puzzle
                </span>
                <h4 className="text-base font-serif font-bold text-white">
                  {selectedPuzzle.title}
                </h4>
                <p className="text-xs text-neutral-400">High Resolution · AI Enhanced</p>
              </div>
              <button
                onClick={() => switchView('library')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-neutral-300 hover:text-white transition"
              >
                Change
              </button>
            </div>

            {/* Configuration Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Piece Count / Difficulty */}
              <div className="bg-white/[0.03] p-4 rounded-2xl">
                <label className="text-[11px] font-semibold text-neutral-400 block mb-2">Piece Count</label>
                <select
                  value={roomConfig.pieceCount}
                  onChange={(e) => handlePieceCountChange(Number(e.target.value))}
                  className="w-full bg-white/[0.05] px-3 py-2 rounded-xl text-xs text-white focus:outline-none font-medium appearance-none cursor-pointer"
                >
                  <option value={12}>12 Pieces (Super Chill)</option>
                  <option value={24}>24 Pieces (Balanced)</option>
                  <option value={48}>48 Pieces (Medium Challenge)</option>
                </select>
              </div>

              {/* Piece Rotation */}
              <div className="bg-white/[0.03] p-4 rounded-2xl">
                <label className="text-[11px] font-semibold text-neutral-400 block mb-2">Piece Rotation</label>
                <select
                  value={roomConfig.allowRotation ? 'true' : 'false'}
                  onChange={(e) => updateRoomConfig({ allowRotation: e.target.value === 'true' })}
                  className="w-full bg-white/[0.05] px-3 py-2 rounded-xl text-xs text-white focus:outline-none font-medium appearance-none cursor-pointer"
                >
                  <option value="false">Disabled (Easy drag & snap)</option>
                  <option value="true">Enabled (Double-click or R to turn)</option>
                </select>
              </div>

              {/* Spatial Ambience Theme */}
              <div className="bg-white/[0.03] p-4 rounded-2xl">
                <label className="text-[11px] font-semibold text-neutral-400 block mb-2">Table Surface Theme</label>
                <select
                  value={currentTheme}
                  onChange={(e) => handleThemeChange(e.target.value as TableTheme)}
                  className="w-full bg-white/[0.05] px-3 py-2 rounded-xl text-xs text-white focus:outline-none font-medium appearance-none cursor-pointer"
                >
                  {THEME_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.description})
                    </option>
                  ))}
                </select>
              </div>

              {/* Synchronized Music Selection */}
              <div className="bg-white/[0.03] p-4 rounded-2xl">
                <label className="text-[11px] font-semibold text-neutral-400 block mb-2">Background Music</label>
                <select
                  value={selectedMusicTrack}
                  onChange={(e) => handleMusicChange(e.target.value as MusicTrackId)}
                  className="w-full bg-white/[0.05] px-3 py-2 rounded-xl text-xs text-white focus:outline-none font-medium appearance-none cursor-pointer"
                >
                  {MUSIC_TRACKS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
