'use client';

import React from 'react';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import { Trophy } from 'lucide-react';

export function VictoryModal() {
  const { isVictoryModalOpen, setVictoryModalOpen, gameStats, switchView, addToast } = useWorkspaceStore();

  if (!isVictoryModalOpen) return null;

  const handleClose = () => {
    setVictoryModalOpen(false);
  };

  const handleNext = () => {
    handleClose();
    switchView('library');
  };

  const handleRestart = () => {
    handleClose();
    addToast('Puzzle reset for a fresh session!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="glass-panel max-w-lg w-full p-8 rounded-[2.5rem] shadow-float border border-white/80 text-center relative animate-bounce-short">
        <div className="w-16 h-16 rounded-full bg-sage-100 text-sage-600 mx-auto flex items-center justify-center text-2xl mb-4 shadow-sm">
          <Trophy className="w-8 h-8" />
        </div>

        <h3 className="text-3xl font-serif text-warmbrown-600 font-bold mb-2">
          Together, Piece by Piece!
        </h3>
        <p className="text-xs text-neutral-500 mb-6">
          You and your companions completed the puzzle with total harmony.
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 bg-cream-100 p-4 rounded-2xl border border-cream-200 mb-6">
          <div>
            <p className="text-[10px] text-neutral-400 uppercase font-bold">Time Spent</p>
            <p className="text-base font-bold text-warmbrown-600 font-mono">04:18</p>
          </div>
          <div>
            <p className="text-[10px] text-neutral-400 uppercase font-bold">Total Moves</p>
            <p className="text-base font-bold text-warmbrown-600 font-mono">{gameStats.movesCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-neutral-400 uppercase font-bold">Accuracy</p>
            <p className="text-base font-bold text-sage-600 font-mono">{gameStats.accuracyPercent}%</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleNext}
            className="flex-1 py-3 rounded-2xl bg-cream-200 text-warmbrown-600 font-semibold text-xs hover:bg-cream-300 transition"
          >
            Browse Next Puzzle
          </button>
          <button
            onClick={handleRestart}
            className="flex-1 py-3 rounded-2xl bg-sage-500 text-white font-semibold text-xs hover:bg-sage-600 transition shadow-md"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
