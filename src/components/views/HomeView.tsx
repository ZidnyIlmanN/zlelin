'use client';

import React, { Suspense, lazy } from 'react';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import { useAuthStore } from '@/application/use-auth-store';
import { useFriendsStore } from '@/application/use-friends-store';
import { User, Users, Puzzle, Settings, BookOpen, LayoutDashboard } from 'lucide-react';
import Image from 'next/image';
import { JigsawPieceSvg } from '@/components/ui/JigsawPieceSvg';

// Lazy load the 3D scene for optimal performance
const HeroScene = lazy(() =>
  import('@/components/hero3d/HeroScene').then((mod) => ({
    default: mod.HeroScene,
  }))
);

export function HomeView() {
  const { switchView, addToast } = useWorkspaceStore();
  const { user, setProfileModalOpen, setAuthModalOpen } = useAuthStore();
  const { setFriendsModalOpen, friends } = useFriendsStore();

  const handlePlaySolo = () => {
    switchView('game');
    addToast('Started Solo Session');
  };

  const handleProfileClick = () => {
    if (user) {
      setProfileModalOpen(true);
    } else {
      setAuthModalOpen(true, 'login');
    }
  };

  return (
    <section
      className="w-full min-h-screen text-white flex flex-col justify-between p-4 sm:p-8 select-none relative"
      style={{
        background: 'radial-gradient(circle at 50% 30%, #16221E 0%, #0C1210 60%, #070B0A 100%)',
      }}
    >
      {/* Ambient background watermark puzzle shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <JigsawPieceSvg
          tabs={[1, -1, -1, 1]}
          size={96}
          className="absolute top-24 left-12 text-white opacity-[0.035]"
        />
        <JigsawPieceSvg
          tabs={[-1, 1, 1, -1]}
          size={110}
          className="absolute top-72 right-16 text-white opacity-[0.035] rotate-[18deg]"
        />
        <JigsawPieceSvg
          tabs={[1, 1, -1, -1]}
          size={120}
          className="absolute bottom-28 left-20 text-white opacity-[0.03] -rotate-12"
        />
      </div>

      {/* 1. Header: ZLELIN Brand Title & Navigation Links */}
      <div className="relative z-10 max-w-6xl mx-auto w-full flex items-center justify-between">
        {/* Left Brand */}
        <div className="flex items-center gap-3">
          {/* Mint Green Puzzle Icon */}
          <div className="w-10 h-10 rounded-2xl bg-[#A3C6A5] flex items-center justify-center shadow-md">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#1C301E">
              <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-widest text-white font-sans">
              ZLELIN
            </h2>
            <p className="text-xs text-neutral-400 font-normal tracking-wide">
              pieces. people. moments.
            </p>
          </div>
        </div>

        {/* Right Quick Nav items */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => switchView('library')}
            className="px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition text-xs font-semibold flex items-center gap-1.5 border border-white/10"
          >
            <BookOpen className="w-3.5 h-3.5 text-sage-400" />
            <span>Library</span>
          </button>
          <button
            onClick={() => switchView('lobby')}
            className="px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition text-xs font-semibold flex items-center gap-1.5 border border-white/10"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-sage-400" />
            <span>Lobby</span>
          </button>
          <button
            onClick={() => setFriendsModalOpen(true)}
            className="px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition text-xs font-semibold flex items-center gap-1.5 border border-white/10"
          >
            <Users className="w-3.5 h-3.5 text-sage-400" />
            <span>Friends ({friends.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Center: 3D Hero Scene with Stylized Tabletop (Seamless full-width canvas) */}
      <div className="relative z-10 w-full max-w-6xl mx-auto h-[340px] sm:h-[420px] md:h-[480px] my-2">
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-neutral-500 text-xs tracking-widest uppercase animate-pulse">
                Rendering Scene…
              </div>
            </div>
          }
        >
          <HeroScene />
        </Suspense>
      </div>

      {/* 3. Headline */}
      <div className="relative z-10 text-center my-3">
        <h1 className="text-2xl sm:text-4xl font-serif text-white tracking-tight font-medium leading-[1.2]">
          Put the pieces together,
          <br />
          <span className="italic font-normal text-[#86AD89]">together.</span>
        </h1>
      </div>

      {/* 4. Three Primary Action Cards (Play Solo, Play Together, Browse Puzzle) */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto w-full mt-2">
        
        {/* Card 1: Play Solo */}
        <div
          onClick={handlePlaySolo}
          className="group cursor-pointer rounded-[2rem] p-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl active:scale-[0.98]"
          style={{ backgroundColor: '#C2D6C0' }}
        >
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center bg-[#364E38]/15 group-hover:bg-[#364E38]/25 transition-colors">
            <User className="w-6 h-6 text-[#364E38] fill-[#364E38]" />
          </div>
          <h3 className="font-bold text-[#1E2D20] text-base mb-1">
            Play Solo
          </h3>
          <p className="text-xs text-[#3D523F] font-normal leading-relaxed">
            Mulai game sendiri<br />dan nikmati waktu mu.
          </p>
        </div>

        {/* Card 2: Play Together */}
        <div
          onClick={() => switchView('lobby')}
          className="group cursor-pointer rounded-[2rem] p-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl active:scale-[0.98]"
          style={{ backgroundColor: '#F3E1CD' }}
        >
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center bg-[#735133]/15 group-hover:bg-[#735133]/25 transition-colors">
            <Users className="w-6 h-6 text-[#735133] fill-[#735133]" />
          </div>
          <h3 className="font-bold text-[#2B1D12] text-base mb-1">
            Play Together
          </h3>
          <p className="text-xs text-[#523E2E] font-normal leading-relaxed">
            Invite teman dan<br />main bareng.
          </p>
        </div>

        {/* Card 3: Browse Puzzle */}
        <div
          onClick={() => switchView('library')}
          className="group cursor-pointer rounded-[2rem] p-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl active:scale-[0.98]"
          style={{ backgroundColor: '#D2C8E4' }}
        >
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center bg-[#584179]/15 group-hover:bg-[#584179]/25 transition-colors">
            <Puzzle className="w-6 h-6 text-[#584179] fill-[#584179]" />
          </div>
          <h3 className="font-bold text-[#231736] text-base mb-1">
            Browse Puzzle
          </h3>
          <p className="text-xs text-[#44335C] font-normal leading-relaxed">
            Pilih puzzle favorit<br />mu dulu.
          </p>
        </div>

      </div>

      {/* 5. Bottom Navigation Bar */}
      <div className="relative z-10 max-w-6xl mx-auto w-full mt-6 pt-4 pb-2 flex items-center justify-between border-t border-white/5 text-xs text-white/90">
        {/* Profile on Left */}
        <div
          onClick={handleProfileClick}
          className="flex items-center gap-2.5 cursor-pointer group hover:text-white transition"
        >
          <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-white/10 group-hover:ring-sage-400 transition">
            <Image
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt={user?.fullName || 'User Profile'}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
          <span className="font-medium text-sm text-neutral-300 group-hover:text-white transition">
            {user?.fullName || user?.username || 'Profile'}
          </span>
        </div>

        {/* Settings on Right */}
        <div
          onClick={() => {
            if (user) {
              setProfileModalOpen(true);
            } else {
              addToast('Settings: Connect audio & video devices in room');
            }
          }}
          className="flex items-center gap-1.5 cursor-pointer group text-neutral-300 hover:text-white transition"
        >
          <span className="font-medium text-sm">Settings</span>
          <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300 text-neutral-400 group-hover:text-white" />
        </div>
      </div>

    </section>
  );
}
