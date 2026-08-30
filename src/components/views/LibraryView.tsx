'use client';

import React, { useState } from 'react';
import { useWorkspaceStore, samplePuzzles } from '@/application/use-workspace-store';
import { PuzzleItem } from '@/domain/puzzle';
import { Wand2 } from 'lucide-react';
import Image from 'next/image';

const CATEGORIES = ['All Puzzles', 'Nature', 'Cozy Interiors', 'Cityscapes', 'Minimal & Abstract', 'Illustration'];

export function LibraryView() {
  const { selectPuzzle, setUploadModalOpen, switchView, addToast } = useWorkspaceStore();
  const [selectedCategory, setSelectedCategory] = useState('All Puzzles');

  const filteredPuzzles = selectedCategory === 'All Puzzles'
    ? samplePuzzles
    : samplePuzzles.filter((p) => p.category === selectedCategory);

  const handleSelect = (puzzle: PuzzleItem) => {
    selectPuzzle(puzzle);
    addToast(`Selected "${puzzle.title}"`);
    switchView('lobby');
  };

  return (
    <section className="max-w-7xl mx-auto px-6 py-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-serif text-warmbrown-600 font-medium">Puzzle Library</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Explore curated art, nature captures, or upload your own image with AI enhancement.
          </p>
        </div>

        {/* Upload CTA Button */}
        <button
          onClick={() => setUploadModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-sage-500 text-white font-medium text-sm hover:bg-sage-600 transition shadow-sm flex items-center gap-2 self-start md:self-auto"
        >
          <Wand2 className="w-4 h-4" />
          Upload & AI Enhance
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-cream-200">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-warmbrown-500 text-white shadow-sm'
                : 'glass-panel text-neutral-600 hover:bg-cream-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Puzzle Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredPuzzles.map((puzzle: PuzzleItem) => (
          <div
            key={puzzle.id}
            onClick={() => handleSelect(puzzle)}
            className="glass-panel rounded-3xl overflow-hidden hover:-translate-y-1.5 hover:shadow-float transition-all duration-300 cursor-pointer border border-white/60 group"
          >
            <div className="relative h-48 overflow-hidden">
              <Image
                src={puzzle.url}
                alt={puzzle.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[10px] font-bold">
                {puzzle.pieces} Pieces
              </span>
            </div>
            <div className="p-4">
              <span className="text-[10px] font-bold text-sage-600 uppercase tracking-wider">
                {puzzle.category}
              </span>
              <h4 className="font-serif font-bold text-warmbrown-600 text-base mt-0.5">
                {puzzle.title}
              </h4>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
