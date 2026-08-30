'use client';

import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the PWA install prompt');
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 right-6 z-50 glass-panel p-4 rounded-2xl shadow-float border border-white/80 max-w-sm flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sage-500 text-white flex items-center justify-center shrink-0 shadow-sm">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-warmbrown-600">Install Zlelin App</p>
          <p className="text-[11px] text-neutral-500">Play offline & launch directly from your desktop or phone.</p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 bg-sage-500 text-white rounded-xl text-xs font-semibold hover:bg-sage-600 transition shadow-sm"
        >
          Install
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="p-1.5 text-neutral-400 hover:text-warmbrown-600 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
