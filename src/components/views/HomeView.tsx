'use client';

import React from 'react';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import { User, Users, Images, Coffee, MousePointer, Music } from 'lucide-react';
import Image from 'next/image';

export function HomeView() {
  const { switchView, addToast } = useWorkspaceStore();

  const handlePlaySolo = () => {
    switchView('game');
    addToast('Started Solo Session');
  };

  return (
    <section className="max-w-7xl mx-auto px-6 py-8 flex flex-col justify-between min-h-[calc(100vh-6rem)]">
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-auto">
        
        {/* Left Hero Content */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-100 text-sage-600 text-xs font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-sage-500 animate-ping"></span>
            Real-time Collaborative Spatial Tabletop
          </div>

          <h1 className="text-4xl md:text-6xl font-serif tracking-tight text-warmbrown-600 font-medium leading-[1.15]">
            Put the pieces together, <span className="italic font-normal text-sage-500">together.</span>
          </h1>

          <p className="text-base md:text-lg text-neutral-600 leading-relaxed font-normal max-w-xl">
            A peaceful digital sanctuary combining real-time jigsaw puzzles, spatial voice, synchronized music, and seamless collaboration over a cozy wooden cafe table.
          </p>

          {/* 3 Primary Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            
            {/* Play Solo */}
            <div
              onClick={handlePlaySolo}
              className="glass-panel p-5 rounded-3xl hover:-translate-y-1 hover:shadow-float transition-all duration-300 cursor-pointer border border-white/60 group"
            >
              <div className="w-10 h-10 rounded-2xl bg-cream-200 text-warmbrown-500 flex items-center justify-center mb-3 group-hover:bg-warmbrown-500 group-hover:text-white transition-colors">
                <User className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-warmbrown-600 text-base mb-1">Play Solo</h3>
              <p className="text-xs text-neutral-500 leading-normal">Relaxing solo session with ambient sounds.</p>
            </div>

            {/* Play Together */}
            <div
              onClick={() => switchView('lobby')}
              className="glass-panel p-5 rounded-3xl hover:-translate-y-1 hover:shadow-float transition-all duration-300 cursor-pointer border border-sage-500/30 bg-sage-500/5 group"
            >
              <div className="w-10 h-10 rounded-2xl bg-sage-500 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sage-600 text-base mb-1">Play Together</h3>
              <p className="text-xs text-neutral-500 leading-normal">Host a cozy room with voice & video.</p>
            </div>

            {/* Browse Puzzles */}
            <div
              onClick={() => switchView('library')}
              className="glass-panel p-5 rounded-3xl hover:-translate-y-1 hover:shadow-float transition-all duration-300 cursor-pointer border border-white/60 group"
            >
              <div className="w-10 h-10 rounded-2xl bg-lavender-100 text-lavender-400 flex items-center justify-center mb-3 group-hover:bg-lavender-400 group-hover:text-white transition-colors">
                <Images className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-warmbrown-600 text-base mb-1">Browse Library</h3>
              <p className="text-xs text-neutral-500 leading-normal">Curated gallery & custom AI upload.</p>
            </div>

          </div>
        </div>

        {/* Right Hero Illustration Canvas */}
        <div className="lg:col-span-6 relative flex justify-center">
          <div className="relative w-full max-w-lg aspect-square rounded-[2.5rem] bg-cream-200 p-6 shadow-cozy border-4 border-white/80 overflow-hidden flex flex-col justify-between theme-wood">
            
            {/* Floating Coaster & Coffee Cup */}
            <div className="absolute top-6 right-6 w-24 h-24 rounded-full bg-amber-900/10 border border-amber-900/20 flex items-center justify-center shadow-inner">
              <div className="w-14 h-14 rounded-full bg-amber-950/20 border-2 border-amber-900/30 flex items-center justify-center">
                <Coffee className="w-6 h-6 text-warmbrown-500 opacity-60" />
              </div>
            </div>

            {/* Floating Simulated Puzzle Pieces on Wooden Table */}
            <div className="relative w-full h-full flex items-center justify-center">
              
              {/* Center Canvas Board Target */}
              <div className="w-64 h-64 rounded-2xl border-2 border-dashed border-warmbrown-500/30 bg-white/40 backdrop-blur-sm p-2 flex items-center justify-center relative shadow-inner">
                <div className="relative w-full h-full rounded-xl overflow-hidden opacity-80">
                  <Image
                    src="https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600&auto=format&fit=crop&q=80"
                    alt="Puzzle preview"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-cream-100/30 backdrop-blur-[1px] rounded-xl"></div>
                <span className="absolute text-xs font-semibold text-warmbrown-600 bg-white/90 px-3 py-1 rounded-full shadow-sm">
                  Lake Como Sunset · 24 Pieces
                </span>
              </div>

              {/* Floating Piece 1 with Cursor */}
              <div className="absolute top-12 left-6 bg-white p-2 rounded-xl shadow-lg rotate-12 flex items-center gap-2 border border-cream-300">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-emerald-700/80">
                  <Image
                    src="https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=100&auto=format&fit=crop&q=80"
                    alt="Piece"
                    fill
                    className="object-cover"
                  />
                </div>
                {/* Cursor Badge */}
                <div className="absolute -bottom-4 -right-2 bg-sage-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                  <MousePointer className="w-2.5 h-2.5" /> Alex
                </div>
              </div>

              {/* Floating Piece 2 */}
              <div className="absolute bottom-10 right-8 bg-white p-2 rounded-xl shadow-lg -rotate-6 border border-cream-300">
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-sky-700/80">
                  <Image
                    src="https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=100&auto=format&fit=crop&q=80"
                    alt="Piece 2"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="absolute -top-3 -left-2 bg-lavender-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                  <MousePointer className="w-2.5 h-2.5" /> Maya
                </div>
              </div>

            </div>

            {/* Live Status Bar */}
            <div className="glass-panel p-3 rounded-2xl flex items-center justify-between text-xs font-medium text-warmbrown-600">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Room &quot;Kyoto Rainy Afternoon&quot; · 3 Active</span>
              </div>
              <div className="flex items-center gap-1 text-neutral-500">
                <Music className="w-3.5 h-3.5 text-sage-500" />
                <span>Coffeehouse Jazz</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Footer Minimal Metadata */}
      <footer className="mt-8 pt-6 border-t border-cream-200/80 flex flex-col md:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
        <p>© 2026 Zlelin Spatial Workspace. Designed for togetherness.</p>
        <div className="flex items-center gap-6">
          <span className="hover:text-warmbrown-500 cursor-pointer" onClick={() => addToast('Shortcuts: R to rotate, Space to pan')}>Keyboard Shortcuts</span>
          <span className="hover:text-warmbrown-500 cursor-pointer" onClick={() => addToast('Privacy mode active')}>Privacy & Calm</span>
          <span className="hover:text-warmbrown-500 cursor-pointer" onClick={() => switchView('library')}>Community Puzzles</span>
        </div>
      </footer>
    </section>
  );
}
