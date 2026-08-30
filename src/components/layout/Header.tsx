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
            <div className="w-10 h-10 rounded-2xl bg-sage-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200">
              <Shapes className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-warmbrown-500 font-serif">
              Zlelin
            </span>
          </div>

          {/* Center Navigation Links: Shown on initial / non-workspace views (Home, Library, Lobby) */}
          {!isWorkspace ? (
            <nav className="hidden md:flex items-center gap-1 glass-panel px-3 py-1.5 rounded-full shadow-cozy border border-white/60">
              <button
                onClick={() => switchView('home')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  currentView === 'home'
                    ? 'text-sage-700 bg-cream-200/90 shadow-sm'
                    : 'text-neutral-600 hover:text-warmbrown-600'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => switchView('library')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  currentView === 'library'
                    ? 'text-sage-700 bg-cream-200/90 shadow-sm'
                    : 'text-neutral-600 hover:text-warmbrown-600'
                }`}
              >
                Puzzle Library
              </button>
              <button
                onClick={() => switchView('lobby')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  currentView === 'lobby'
                    ? 'text-sage-700 bg-cream-200/90 shadow-sm'
                    : 'text-neutral-600 hover:text-warmbrown-600'
                }`}
              >
                Lobby
              </button>
              <button
                onClick={() => switchView('game')}
                className="px-4 py-1.5 rounded-full text-xs font-semibold text-neutral-600 hover:text-warmbrown-600 transition-all"
              >
                Workspace
              </button>
            </nav>
          ) : (
            // Workspace view: center remains clear for the top Video Call bar
            <div className="flex-1" />
          )}

          {/* Right Action Tools (Shifted left when VC sidebar is expanded in Workspace) */}
          <div className={`flex items-center gap-2.5 transition-all duration-300 ${isWorkspace && isVcExpanded ? 'mr-72 sm:mr-80 md:mr-88 lg:mr-96' : ''}`}>
            {/* Manage Friends Button (Hidden on Workspace) */}
            {!isWorkspace && (
              <button
                onClick={() => setFriendsModalOpen(true)}
                className="h-10 px-3 rounded-2xl glass-panel flex items-center gap-2 text-warmbrown-600 hover:bg-cream-100 transition shadow-sm text-xs font-semibold border border-white/60"
                title="Manage Friends"
              >
                <Users className="w-4 h-4 text-sage-600" />
                <span className="hidden sm:inline font-medium">Friends ({friends.length})</span>
              </button>
            )}

            {/* User Profile Button (Hidden on Workspace) */}
            {!isWorkspace && (
              <>
                {user ? (
                  <div
                    onClick={() => setProfileModalOpen(true)}
                    className="flex items-center gap-2 glass-panel pl-2 pr-3 py-1 rounded-2xl cursor-pointer hover:bg-cream-100 transition group relative border border-white/60 shadow-xs"
                    title="Edit Profile Settings (Click to change photo, name, username)"
                  >
                    <div className="relative w-8 h-8 rounded-xl overflow-hidden ring-2 ring-sage-500/30">
                      <Image
                        src={user.avatarUrl}
                        alt={user.fullName}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <span className="text-xs font-semibold text-warmbrown-600 hidden sm:inline max-w-[110px] truncate">
                      {user.fullName || user.username}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => setAuthModalOpen(true, 'login')}
                    className="px-4 py-2 rounded-2xl bg-sage-500 text-white font-semibold text-xs hover:bg-sage-600 transition shadow-sm flex items-center gap-1.5"
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
                className={`w-10 h-10 rounded-2xl glass-panel flex items-center justify-center text-warmbrown-600 hover:bg-cream-100 transition shadow-sm border border-white/60 ${
                  isMenuOpen ? 'bg-cream-200 text-sage-700 ring-2 ring-sage-500/20' : ''
                }`}
                title="Toggle Menu"
              >
                {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Solid Opaque Hamburger Dropdown Menu (Positioned on Top-Right of Workspace area) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 animate-fade-in">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-warmbrown-900/40 backdrop-blur-xs"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Solid Opaque Menu Card on Top-Right (Shifts away from VC sidebar) */}
          <div className={`absolute top-16 z-50 w-72 rounded-3xl bg-white border border-cream-300 shadow-2xl p-4 animate-scale-up space-y-3 transition-all duration-300 ${
            isWorkspace && isVcExpanded
              ? 'right-[19rem] sm:right-[21rem] md:right-[23rem] lg:right-[25rem]'
              : 'right-6'
          }`}>
            
            {/* Header / Room Info */}
            <div className="flex items-center justify-between pb-2.5 border-b border-cream-100">
              <div>
                <h3 className="text-sm font-bold font-serif text-warmbrown-600">Zlelin Menu</h3>
                <p className="text-[11px] text-neutral-500">Room: {roomConfig.id}</p>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-7 h-7 rounded-full bg-cream-100 hover:bg-cream-200 flex items-center justify-center text-warmbrown-600 text-xs transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Primary Navigation Items */}
            <div className="space-y-1.5">
              {[
                { id: 'home', label: 'Home Page', icon: Home, desc: 'Welcome & Featured Puzzles' },
                { id: 'library', label: 'Puzzle Library', icon: BookOpen, desc: 'Browse art & AI Generator' },
                { id: 'lobby', label: 'Multiplayer Lobby', icon: LayoutDashboard, desc: 'Room code & invitations' },
                { id: 'game', label: 'Workspace Table', icon: Puzzle, desc: 'Active jigsaw canvas' },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id as any)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-2xl transition text-left ${
                      isActive
                        ? 'bg-sage-500 text-white shadow-sm'
                        : 'bg-cream-50/80 hover:bg-cream-100 text-warmbrown-600 border border-cream-200'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-white/20 text-white' : 'bg-cream-200 text-sage-600'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold truncate">{item.label}</p>
                      <p className={`text-[10px] truncate ${isActive ? 'text-white/80' : 'text-neutral-400'}`}>
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Profile Settings Shortcut in Menu */}
            {user && (
              <div className="pt-2 border-t border-cream-100">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setProfileModalOpen(true);
                  }}
                  className="w-full p-2.5 rounded-2xl bg-cream-50 hover:bg-cream-100 text-warmbrown-600 border border-cream-200 flex items-center gap-2.5 text-xs font-semibold transition"
                >
                  <Settings className="w-4 h-4 text-sage-600" />
                  <span>Profile Settings</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
