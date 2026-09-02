'use client';

import React, { useEffect, useRef } from 'react';
import { drawAssembledPuzzle, generateJigsawGrid } from '@/infrastructure/jigsaw-geometry';

interface PuzzleThumbnailProps {
  imageUrl: string;
  pieceCount: number;
  seed: string;
  className?: string;
}

export function PuzzleThumbnail({ imageUrl, pieceCount, seed, className = '' }: PuzzleThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let cancelled = false;
    const image = new window.Image();
    image.crossOrigin = 'anonymous';

    const render = () => {
      if (cancelled) return;

      const width = Math.max(1, Math.round(container.clientWidth));
      const height = Math.max(1, Math.round(container.clientHeight));
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const grid = generateJigsawGrid(seed, pieceCount, width, height);
      drawAssembledPuzzle(ctx, image, grid, width, height);
    };

    image.onload = () => {
      requestAnimationFrame(render);
    };
    image.onerror = () => {
      if (cancelled || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      ctx.fillStyle = '#1a1f1c';
      ctx.fillRect(0, 0, width, height);
    };
    image.src = imageUrl;

    const observer = new ResizeObserver(() => {
      if (image.complete && image.naturalWidth > 0) render();
    });
    observer.observe(container);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [imageUrl, pieceCount, seed]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-[#141816] ${className}`}>
      <canvas ref={canvasRef} className="block h-full w-full" aria-hidden />
    </div>
  );
}
