'use client';

import React from 'react';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import { Play, X, Sparkles, Shapes } from 'lucide-react';
import Image from 'next/image';

export function InviteNotificationModal() {
  const { incomingInvite, setIncomingInvite, acceptInvite } = useWorkspaceStore();

  if (!incomingInvite) return null;

  const handleAccept = () => {
    acceptInvite(incomingInvite);
  };

  const handleDecline = () => {
    setIncomingInvite(null);
  };

  return (
    <div className="fixed top-24 right-6 z-50 animate-bounce-short max-w-md w-full">
      <div className="glass-panel p-5 rounded-3xl shadow-float border-2 border-sage-500/40 bg-cream-50/95 backdrop-blur-xl relative">
        {/* Close / Dismiss Button */}
        <button
          onClick={handleDecline}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-cream-200 flex items-center justify-center text-neutral-400 hover:text-warmbrown-600 transition text-xs"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Sender Info */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-sage-500 shadow-sm shrink-0">
            <Image
              src={incomingInvite.sender.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt={incomingInvite.sender.name}
              fill
              className="object-cover"
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sage-100 text-sage-600 text-[10px] font-bold uppercase tracking-wider mb-0.5">
              <Sparkles className="w-2.5 h-2.5" /> Room Invitation
            </div>
            <p className="text-sm font-bold text-warmbrown-600 leading-tight">
              {incomingInvite.sender.name} invited you to play!
            </p>
          </div>
        </div>

        {/* Room & Puzzle Preview Box */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 border border-cream-200 mb-4">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden shadow-inner shrink-0">
            <Image
              src={incomingInvite.room.puzzle.url}
              alt={incomingInvite.room.puzzle.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="overflow-hidden flex-1">
            <h4 className="text-xs font-bold text-warmbrown-600 truncate font-serif">
              {incomingInvite.room.puzzle.title}
            </h4>
            <p className="text-[11px] text-neutral-500 truncate">
              {incomingInvite.room.title}
            </p>
            <span className="text-[10px] font-semibold text-sage-600">
              {incomingInvite.room.pieceCount} Pieces · Room {incomingInvite.room.id}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDecline}
            className="flex-1 py-2.5 px-4 rounded-xl bg-cream-200 text-warmbrown-600 text-xs font-semibold hover:bg-cream-300 transition"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 py-2.5 px-4 rounded-xl bg-sage-500 text-white text-xs font-semibold hover:bg-sage-600 transition shadow-md flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
}
