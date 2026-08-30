'use client';

import React from 'react';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import { useMusicStore } from '@/application/use-music-store';
import { THEME_OPTIONS, TableTheme } from '@/domain/theme';
import { Plus, Minus, Expand, Image as ImageIcon, Shuffle, Palette, Music, Settings, MessageSquare } from 'lucide-react';

interface FloatingToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onScatter: () => void;
}

export function FloatingToolbar({ onZoomIn, onZoomOut, onResetView, onScatter }: FloatingToolbarProps) {
  const {
    currentTheme,
    setTheme,
    showReferenceOverlay,
    toggleReferenceOverlay,
    switchView,
    isVcExpanded,
    addToast,
  } = useWorkspaceStore();

  const cycleTheme = () => {
    const currentIndex = THEME_OPTIONS.findIndex((t) => t.id === currentTheme);
    const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
    const nextTheme = THEME_OPTIONS[nextIndex].id as TableTheme;
    setTheme(nextTheme);
  };

  return (
    <>
      {/* LEFT FLOATING TOOLBAR */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-40 glass-panel p-2 rounded-2xl shadow-float flex flex-col gap-2 border border-white/60">
        <button
          onClick={onZoomIn}
          className="w-10 h-10 rounded-xl hover:bg-cream-200 flex items-center justify-center text-warmbrown-600 text-sm transition"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={onZoomOut}
          className="w-10 h-10 rounded-xl hover:bg-cream-200 flex items-center justify-center text-warmbrown-600 text-sm transition"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={onResetView}
          className="w-10 h-10 rounded-xl hover:bg-cream-200 flex items-center justify-center text-warmbrown-600 text-sm transition"
          title="Fit Screen"
        >
          <Expand className="w-4 h-4" />
        </button>

        <div className="w-full h-px bg-cream-300 my-1"></div>

        <button
          onClick={toggleReferenceOverlay}
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm transition ${
            showReferenceOverlay
              ? 'bg-sage-500 text-white shadow-sm'
              : 'hover:bg-cream-200 text-warmbrown-600'
          }`}
          title="Toggle Board Target Frame Overlay"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <button
          onClick={onScatter}
          className="w-10 h-10 rounded-xl hover:bg-cream-200 flex items-center justify-center text-warmbrown-600 text-sm transition"
          title="Scatter Unconnected Pieces"
        >
          <Shuffle className="w-4 h-4" />
        </button>
      </div>

      {/* RIGHT FLOATING TOOLBAR (Shifts left into workspace area when VC sidebar is expanded) */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 z-40 glass-panel p-2 rounded-2xl shadow-float flex flex-col gap-2 border border-white/60 transition-all duration-300 ${
          isVcExpanded
            ? 'right-[19rem] sm:right-[21rem] md:right-[23rem] lg:right-[25rem]'
            : 'right-6'
        }`}
      >
        <button
          onClick={cycleTheme}
          className="w-10 h-10 rounded-xl hover:bg-cream-200 flex items-center justify-center text-warmbrown-600 text-sm transition"
          title="Ambience Theme"
        >
          <Palette className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            useMusicStore.getState().setCenterModalOpen(true);
          }}
          className="w-10 h-10 rounded-xl hover:bg-cream-200 flex items-center justify-center text-warmbrown-600 text-sm transition"
          title="Collaborative Music Hub"
        >
          <Music className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            useWorkspaceStore.getState().setChatModalOpen(true);
          }}
          className="relative w-10 h-10 rounded-xl hover:bg-cream-200 flex items-center justify-center text-warmbrown-600 text-sm transition"
          title="Open Room Chat"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button
          onClick={() => switchView('lobby')}
          className="w-10 h-10 rounded-xl hover:bg-cream-200 flex items-center justify-center text-warmbrown-600 text-sm transition"
          title="Room Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}
