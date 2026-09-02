'use client';

import React, { useState } from 'react';
import { useWorkspaceStore, samplePuzzles } from '@/application/use-workspace-store';
import { PuzzleItem } from '@/domain/puzzle';
import { PuzzleThumbnail } from '@/components/puzzle/PuzzleThumbnail';
import { Wand2, Search } from 'lucide-react';

const CATEGORIES = ['All Puzzles', 'Nature', 'Cozy Interiors', 'Cityscapes', 'Minimal & Abstract', 'Illustration'];

export function LibraryView() {
  const { selectPuzzle, setUploadModalOpen, switchView, addToast } = useWorkspaceStore();
  const [selectedCategory, setSelectedCategory] = useState('All Puzzles');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPuzzles = samplePuzzles.filter((p) => {
    const matchesCategory = selectedCategory === 'All Puzzles' || p.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelect = (puzzle: PuzzleItem) => {
    selectPuzzle(puzzle);
    addToast(`Selected "${puzzle.title}"`);
    switchView('lobby');
  };

  return (
    <section className="mx-auto max-w-[1400px] select-none px-4 pb-16 pt-2 text-white sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8 border-b border-white/[0.06] pb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
              Puzzle Library
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/45">
              Browse handcrafted artwork and start a solo session or invite friends to solve together in your virtual workspace.
            </p>
          </div>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 self-start rounded-full border border-[#7eb564]/30 bg-[#7eb564]/10 px-5 py-2.5 text-sm font-medium text-[#b8e89a] transition hover:border-[#7eb564]/50 hover:bg-[#7eb564]/15"
          >
            <Wand2 className="h-4 w-4" />
            Upload & AI Enhance
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="library-filter-scroll flex items-center gap-1 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition ${
                  isActive
                    ? 'bg-white text-[#0c1210]'
                    : 'text-white/45 hover:bg-white/[0.06] hover:text-white/80'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-white/35 sm:block">
            {filteredPuzzles.length} puzzle{filteredPuzzles.length === 1 ? '' : 's'}
          </p>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search puzzles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-white/[0.08] bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-[#7eb564]/40 focus:outline-none focus:ring-1 focus:ring-[#7eb564]/25"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {filteredPuzzles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
            <Search className="h-6 w-6 text-white/25" />
          </div>
          <p className="text-base font-medium text-white/70">No puzzles found</p>
          <p className="mt-1 text-sm text-white/35">Try a different category or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredPuzzles.map((puzzle: PuzzleItem) => (
            <button
              key={puzzle.id}
              type="button"
              onClick={() => handleSelect(puzzle)}
              className="group w-full text-left"
            >
              <PuzzleThumbnail
                imageUrl={puzzle.url}
                pieceCount={puzzle.pieces}
                seed={`puzzle-${puzzle.id}`}
                className="aspect-[4/3] w-full rounded-md transition duration-300 group-hover:brightness-[1.06] group-hover:ring-1 group-hover:ring-white/10"
              />

              <div className="mt-3">
                <h3 className="truncate text-sm font-medium text-white transition group-hover:text-[#b8e89a]">
                  {puzzle.title}
                </h3>
                <p className="mt-0.5 text-xs text-white/35">
                  {puzzle.category} · {puzzle.pieces} pieces
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
