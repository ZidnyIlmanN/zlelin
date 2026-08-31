'use client';

import React, { useState } from 'react';
import { useWorkspaceStore, samplePuzzles } from '@/application/use-workspace-store';
import { PuzzleItem } from '@/domain/puzzle';
import { Wand2, Search, Play, Puzzle } from 'lucide-react';
import Image from 'next/image';

const CATEGORIES = ['All Puzzles', 'Nature', 'Cozy Interiors', 'Cityscapes', 'Minimal & Abstract', 'Illustration'];

export function LibraryView() {
  const { selectPuzzle, setUploadModalOpen, switchView, addToast } = useWorkspaceStore();
  const [selectedCategory, setSelectedCategory] = useState('All Puzzles');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPuzzles = samplePuzzles.filter((p) => {
    const matchesCategory = selectedCategory === 'All Puzzles' || p.category === selectedCategory;
    const matchesSearch = searchQuery.trim() === '' || 
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
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-white select-none">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-serif text-white font-medium tracking-tight">
            Puzzle Library
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-xl">
            Pilih karya seni favorit untuk dimainkan sendiri atau bersama teman di meja virtual.
          </p>
        </div>

        {/* AI Upload CTA */}
        <button
          onClick={() => setUploadModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-[#788A75] hover:bg-[#687A65] text-white font-semibold text-xs transition shadow-sm flex items-center gap-2 self-start md:self-auto"
        >
          <Wand2 className="w-4 h-4" />
          <span>Upload & AI Enhance</span>
        </button>
      </div>

      {/* 2. Search & Category Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-8">
        
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'bg-white/[0.02] text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.05]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-neutral-500" />
          <input
            type="text"
            placeholder="Search puzzle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white/[0.03] focus:bg-white/[0.06] text-xs text-white placeholder-neutral-500 focus:outline-none transition"
          />
        </div>

      </div>

      {/* 3. Puzzle Cards Grid */}
      {filteredPuzzles.length === 0 ? (
        <div className="p-12 text-center rounded-[2.5rem] bg-white/[0.02] my-6">
          <Puzzle className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-neutral-300">No puzzles found</p>
          <p className="text-xs text-neutral-500 mt-1">Try another category or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
          {filteredPuzzles.map((puzzle: PuzzleItem) => (
            <div
              key={puzzle.id}
              onClick={() => handleSelect(puzzle)}
              className="bg-white/[0.025] hover:bg-white/[0.05] rounded-[2rem] overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer group flex flex-col justify-between"
            >
              {/* Image Container */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-900">
                <Image
                  src={puzzle.url}
                  alt={puzzle.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Piece Count Badge */}
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium tracking-wide">
                  {puzzle.pieces} Pieces
                </span>
              </div>

              {/* Card Meta & Details */}
              <div className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-sage-400 uppercase tracking-wider">
                    {puzzle.category}
                  </span>
                  <h4 className="font-serif font-bold text-white text-base mt-0.5 group-hover:text-sage-300 transition-colors">
                    {puzzle.title}
                  </h4>
                </div>

                <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-[#788A75] text-neutral-400 group-hover:text-white flex items-center justify-center transition-all shrink-0">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </section>
  );
}
