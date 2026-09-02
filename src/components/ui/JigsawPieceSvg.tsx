import React, { useMemo } from 'react';
import { buildJigsawSvgPath, JigsawEdge } from '@/lib/jigsaw-svg-path';

interface JigsawPieceSvgProps {
  tabs?: [JigsawEdge, JigsawEdge, JigsawEdge, JigsawEdge];
  size?: number;
  className?: string;
}

export function JigsawPieceSvg({
  tabs = [1, -1, -1, 1],
  size = 96,
  className = '',
}: JigsawPieceSvgProps) {
  const path = useMemo(() => buildJigsawSvgPath(tabs, 100), [tabs]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}
