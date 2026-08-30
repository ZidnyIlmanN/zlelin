import { useState, useCallback } from 'react';

export const AI_PIPELINE_STEPS = [
  'Preparing your puzzle',
  'Enhancing quality',
  'AI upscaling',
  'Smart color correction',
  'Noise reduction',
  'Puzzle generation',
  'Ready to play',
];

export function useAiPipeline() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const startPipeline = useCallback((src: string, onComplete?: (enhancedSrc: string) => void) => {
    setImageSrc(src);
    setIsProcessing(true);
    setIsReady(false);
    setCurrentStepIndex(0);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < AI_PIPELINE_STEPS.length) {
        setCurrentStepIndex(step);
      } else {
        clearInterval(interval);
        setIsProcessing(false);
        setIsReady(true);
        if (onComplete) onComplete(src);
      }
    }, 500);
  }, []);

  const resetPipeline = useCallback(() => {
    setImageSrc(null);
    setIsProcessing(false);
    setIsReady(false);
    setCurrentStepIndex(0);
  }, []);

  const progressPercent = Math.round(((currentStepIndex + 1) / AI_PIPELINE_STEPS.length) * 100);

  return {
    currentStepIndex,
    stepText: AI_PIPELINE_STEPS[currentStepIndex] || 'Ready to play',
    progressPercent,
    isProcessing,
    isReady,
    imageSrc,
    startPipeline,
    resetPipeline,
  };
}
