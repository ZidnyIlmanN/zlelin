'use client';

import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import { useAuthStore } from '@/application/use-auth-store';
import { useFriendsStore } from '@/application/use-friends-store';
import {
  Shapes,
  Users,
  LogIn,
  Menu,
  X,
  Home,
  BookOpen,
  LayoutDashboard,
  Puzzle,
  Settings,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';

export function Header() {
  const { currentView, switchView, roomConfig, isVcExpanded } = useWorkspaceStore();
  const { user, setAuthModalOpen, setProfileModalOpen, initializeAuth } = useAuthStore();
  const { setFriendsModalOpen, friends, initFriendsListener } = useFriendsStore();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Automatically fetch & listen to friends in real time as soon as user is authenticated
  useEffect(() => {
    if (user?.id) {
      initFriendsListener();
    }
  }, [user?.id, initFriendsListener]);

  const handleNavClick = (view: 'home' | 'library' | 'lobby' | 'game') => {
    switchView(view);
    setIsMenuOpen(false);
  };

  const isWorkspace = currentView === 'game';

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 px-6 py-3.5 transition-all duration-300 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          
          {/* Left: Logo Only */}
          <div
            onClick={() => switchView('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#788A75] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200">
              <Shapes className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-serif">
              Zlelin
            </span>
          </div>

          {/* Center Navigation Links: Shown on initial / non-workspace views (Home, Library, Lobby) */}
          {!isWorkspace ? (
            <nav className="hidden md:flex items-center gap-1 bg-[#141E1A]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
              <button
                onClick={() => switchView('home')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  currentView === 'home'
                    ? 'text-white bg-white/10 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => switchView('library')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  currentView === 'library'
                    ? 'text-white bg-white/10 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Puzzle Library
              </button>
              <button
                onClick={() => switchView('lobby')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  currentView === 'lobby'
                    ? 'text-white bg-white/10 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Lobby
              </button>
              <button
                onClick={() => switchView('game')}
                className="px-4 py-1.5 rounded-full text-xs font-semibold text-neutral-400 hover:text-white transition-all"
              >
                Workspace
              </button>
            </nav>
          ) : (
            // Workspace view: center remains clear for the top Video Call bar
            <div className="flex-1" />
          )}

          {/* Right Action Tools */}
          <div className={`flex items-center gap-2.5 transition-all duration-300 ${isWorkspace && isVcExpanded ? 'mr-72 sm:mr-80 md:mr-88 lg:mr-96' : ''}`}>
            {/* Manage Friends Button */}
            {!isWorkspace && (
              <button
                onClick={() => setFriendsModalOpen(true)}
                className="h-10 px-3.5 rounded-2xl bg-[#141E1A]/80 backdrop-blur-md flex items-center gap-2 text-white hover:bg-white/10 transition shadow-sm text-xs font-semibold border border-white/10"
                title="Manage Friends"
              >
                <Users className="w-4 h-4 text-sage-400" />
                <span className="hidden sm:inline font-medium">Friends ({friends.length})</span>
              </button>
            )}

            {/* User Profile Button */}
            {!isWorkspace && (
              <>
                {user ? (
                  <div
                    onClick={() => setProfileModalOpen(true)}
                    className="flex items-center gap-2 bg-[#141E1A]/80 backdrop-blur-md pl-2 pr-3 py-1 rounded-2xl cursor-pointer hover:bg-white/10 transition group relative border border-white/10 shadow-xs text-white"
                    title="Edit Profile Settings"
                  >
                    <div className="relative w-8 h-8 rounded-xl overflow-hidden ring-1 ring-white/20">
                      <Image
                        src={user.avatarUrl}
                        alt={user.fullName}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <span className="text-xs font-semibold text-white hidden sm:inline max-w-[110px] truncate">
                      {user.fullName || user.username}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => setAuthModalOpen(true, 'login')}
                    className="px-4 py-2 rounded-2xl bg-[#788A75] text-white font-semibold text-xs hover:bg-[#687A65] transition shadow-sm flex items-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Sign In
                  </button>
                )}
              </>
            )}

            {/* Hamburger Menu Toggle Button on Right (Visible in Workspace view) */}
            {isWorkspace && (
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-full transition-all duration-200 border ${
                  isMenuOpen
                    ? 'bg-[#2a2520] border-white/15 text-white'
                    : 'bg-[#1f1b18]/90 border-white/10 text-neutral-300 hover:bg-[#2a2520] hover:text-white hover:border-white/15'
                }`}
                title="Toggle Menu"
              >
                {isMenuOpen ? (
                  <X className="w-4 h-4 shrink-0" strokeWidth={2} />
                ) : (
                  <Menu className="w-4 h-4 shrink-0" strokeWidth={2} />
                )}
                <span className="text-sm font-medium tracking-wide">Menu</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Workspace Hamburger Menu Panel */}
      {isMenuOpen && isWorkspace && (
        <div className="fixed inset-0 z-50 animate-fade-in">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden
          />

          <div
            className={`absolute top-[4.25rem] z-50 w-[min(100vw-2rem,20rem)] rounded-2xl overflow-hidden animate-scale-up shadow-[0_24px_64px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06)] transition-all duration-300 ${
              isVcExpanded
                ? 'right-[19rem] sm:right-[21rem] md:right-[23rem] lg:right-[25rem]'
                : 'right-6'
            }`}
            style={{ backgroundColor: '#161616' }}
            role="dialog"
            aria-label="Workspace menu"
          >
            {/* Room context header */}
            <div
              className="px-4 pt-4 pb-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'rgba(126,181,100,0.15)' }}
                    >
                      <Sparkles className="w-3.5 h-3.5" style={{ color: '#7eb564' }} />
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
                      Workspace
                    </p>
                  </div>
                  <h3 className="text-[15px] font-semibold text-white truncate">{roomConfig.title || 'Puzzle Session'}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Room <span className="text-neutral-400 font-mono">{roomConfig.id}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-150 hover:bg-white/8"
                  style={{ color: '#a0a0a0' }}
                  title="Close menu"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>

              {user && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setProfileModalOpen(true);
                  }}
                  className="mt-3 w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors duration-150 hover:bg-white/[0.04] text-left"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 ring-1 ring-white/10">
                    <Image src={user.avatarUrl} alt={user.fullName} fill unoptimized className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{user.fullName || user.username}</p>
                    <p className="text-[11px] text-neutral-500 truncate">@{user.username}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-600 shrink-0" />
                </button>
              )}
            </div>

            {/* Navigation */}
            <div className="p-2">
              <p className="px-3 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
                Navigate
              </p>
              <div className="space-y-0.5">
                {[
                  { id: 'home', label: 'Home', icon: Home, desc: 'Featured puzzles & welcome' },
                  { id: 'library', label: 'Puzzle Library', icon: BookOpen, desc: 'Browse art & AI generator' },
                  { id: 'lobby', label: 'Multiplayer Lobby', icon: LayoutDashboard, desc: 'Rooms & invitations' },
                  { id: 'game', label: 'Workspace Table', icon: Puzzle, desc: 'Active jigsaw canvas' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id as 'home' | 'library' | 'lobby' | 'game')}
                      className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left"
                      style={{
                        backgroundColor: isActive ? 'rgba(126,181,100,0.12)' : 'transparent',
                        border: isActive ? '1px solid rgba(126,181,100,0.2)' : '1px solid transparent',
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150"
                        style={{
                          backgroundColor: isActive ? 'rgba(126,181,100,0.18)' : 'rgba(255,255,255,0.05)',
                          color: isActive ? '#7eb564' : '#a0a0a0',
                        }}
                      >
                        <Icon className="w-4 h-4" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-medium truncate transition-colors"
                          style={{ color: isActive ? '#ffffff' : '#e8e8e8' }}
                        >
                          {item.label}
                        </p>
                        <p className="text-[11px] truncate mt-0.5" style={{ color: '#6b6b6b' }}>
                          {item.desc}
                        </p>
                      </div>
                      <ChevronRight
                        className="w-4 h-4 shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150"
                        style={{ color: isActive ? '#7eb564' : '#6b6b6b' }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer actions */}
            <div
              className="p-2 pt-1"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setProfileModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 hover:bg-white/[0.04] text-left"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#a0a0a0' }}
                  >
                    <Settings className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-200">Profile Settings</p>
                    <p className="text-[11px] text-neutral-600 mt-0.5">Account & preferences</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-600 shrink-0" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setAuthModalOpen(true, 'login');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-150"
                  style={{ backgroundColor: '#7eb564', color: '#121212' }}
                >
                  <LogIn className="w-4 h-4" />
                  Sign in to Zlelin
                </button>
              )}

              <p className="px-3 pt-3 pb-2 text-[10px] text-center text-neutral-600">
                Zlelin · Collaborative puzzle workspace
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
