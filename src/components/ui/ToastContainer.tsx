'use client';

import React from 'react';
import { useWorkspaceStore } from '@/application/use-workspace-store';

export function ToastContainer() {
  const { toasts } = useWorkspaceStore();

  return (
    <div className="fixed top-24 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="glass-panel px-4 py-2.5 rounded-2xl text-xs font-semibold text-warmbrown-600 shadow-float border border-white/80 flex items-center gap-2 animate-fade-in pointer-events-auto transition-all duration-300"
        >
          <span className="w-2 h-2 rounded-full bg-sage-500 shrink-0" />
          {toast.message}
        </div>
      ))}
    </div>
  );
}
