'use client';

import React, { useRef, useEffect } from 'react';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import { useAiPipeline } from '@/application/use-ai-pipeline';
import { X, UploadCloud, Sparkles } from 'lucide-react';
import Image from 'next/image';

export function UploadAiModal() {
  const { isUploadModalOpen, setUploadModalOpen, selectPuzzle, switchView } = useWorkspaceStore();
  const {
    stepText,
    progressPercent,
    isProcessing,
    isReady,
    imageSrc,
    startPipeline,
    resetPipeline,
  } = useAiPipeline();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const enhancedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (imageSrc && enhancedCanvasRef.current) {
      const canvas = enhancedCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new window.Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.filter = 'contrast(115%) saturate(120%) brightness(102%)';
        ctx.drawImage(img, 0, 0);
      };
      img.src = imageSrc;
    }
  }, [imageSrc]);

  if (!isUploadModalOpen) return null;

  const handleClose = () => {
    resetPipeline();
    setUploadModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          startPipeline(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLaunchGame = () => {
    if (imageSrc) {
      selectPuzzle({
        id: 'custom-' + Date.now(),
        title: 'Custom AI Enhanced Puzzle',
        category: 'Illustration',
        pieces: 24,
        url: imageSrc,
      });
      handleClose();
      switchView('game');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="glass-panel max-w-2xl w-full p-8 rounded-[2.5rem] shadow-float border border-white/80 relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center text-neutral-500 hover:text-warmbrown-600 text-sm transition"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-2xl font-serif text-warmbrown-600 font-bold mb-1">Upload Your Image</h3>
        <p className="text-xs text-neutral-500 mb-6">
          Select a custom photo to process with our AI quality enhancement & puzzle generation pipeline.
        </p>

        {/* Upload Drag Zone */}
        {!imageSrc && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-sage-500/40 rounded-3xl p-8 text-center bg-sage-500/5 hover:bg-sage-500/10 transition cursor-pointer mb-6"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="w-12 h-12 rounded-2xl bg-sage-500 text-white mx-auto flex items-center justify-center mb-3 shadow-md">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-warmbrown-600">Click to upload or drag & drop</p>
            <p className="text-xs text-neutral-400 mt-1">High resolution PNG or JPG recommended</p>
          </div>
        )}

        {/* AI Pipeline Progress View */}
        {imageSrc && (
          <div className="space-y-6">
            {/* Image Enhancer Comparison Canvas */}
            <div className="grid grid-cols-2 gap-4 bg-cream-100 p-3 rounded-2xl border border-cream-200">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 block mb-1 uppercase">Original Input</span>
                <div className="relative w-full h-36 rounded-xl overflow-hidden">
                  <Image src={imageSrc} alt="Original" fill className="object-cover" />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-sage-600 block mb-1 uppercase flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> AI Enhanced Target
                </span>
                <canvas ref={enhancedCanvasRef} className="w-full h-36 object-cover rounded-xl shadow-sm" />
              </div>
            </div>

            {/* Stepper Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-warmbrown-600">
                <span>{stepText}...</span>
                <span className="font-mono text-sage-600">{progressPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-cream-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sage-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <button
              disabled={!isReady || isProcessing}
              onClick={handleLaunchGame}
              className="w-full py-3 rounded-2xl bg-sage-500 text-white font-semibold text-sm hover:bg-sage-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              Launch AI Enhanced Workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
