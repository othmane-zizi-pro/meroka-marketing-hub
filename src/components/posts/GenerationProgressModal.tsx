'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Brain, Scale, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GenerationProgressModalProps {
  isOpen: boolean;
  onComplete: () => void;
  postsToGenerate?: number;
}

const STEPS = [
  { id: 'fetch', label: 'Fetching inspiration posts', icon: Sparkles, duration: 3000 },
  { id: 'generate', label: 'LLM Council generating candidates', icon: Brain, duration: 80000 },
  { id: 'judge', label: 'Selecting best responses', icon: Scale, duration: 15000 },
  { id: 'save', label: 'Saving drafts', icon: CheckCircle2, duration: 2000 },
];

const MODELS = ['GPT-5.2', 'Gemini 3 Pro', 'Grok 4.1 Fast'];

export function GenerationProgressModal({
  isOpen,
  onComplete,
  postsToGenerate = 5
}: GenerationProgressModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [activeModel, setActiveModel] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setActiveModel(0);
      setProgress(0);
      return;
    }

    // Simulate progress through steps
    const stepDurations = STEPS.map(s => s.duration);
    const totalDuration = stepDurations.reduce((a, b) => a + b, 0);
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 100;
      const newProgress = Math.min((elapsed / totalDuration) * 100, 95);
      setProgress(newProgress);

      // Determine current step based on elapsed time
      let cumulativeTime = 0;
      let newStep = 0;
      for (let i = 0; i < STEPS.length; i++) {
        cumulativeTime += stepDurations[i];
        if (elapsed < cumulativeTime) {
          newStep = i;
          break;
        }
        if (i === STEPS.length - 1) {
          newStep = STEPS.length - 1;
        }
      }
      setCurrentStep(newStep);

      // Cycle through models during generation step
      if (newStep === 1) {
        setActiveModel(Math.floor((elapsed % 3000) / 1000));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Generating Posts</h3>
              <p className="text-sm text-white/80">Creating {postsToGenerate} AI-powered drafts</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Steps */}
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isComplete = index < currentStep;
            const isPending = index > currentStep;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all duration-300",
                  isActive && "bg-purple-50 border border-purple-200",
                  isComplete && "bg-green-50",
                  isPending && "opacity-40"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg",
                  isActive && "bg-purple-100",
                  isComplete && "bg-green-100",
                  isPending && "bg-gray-100"
                )}>
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : isActive ? (
                    <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
                  ) : (
                    <StepIcon className={cn(
                      "h-5 w-5",
                      isPending ? "text-gray-400" : "text-purple-600"
                    )} />
                  )}
                </div>
                <div className="flex-1">
                  <p className={cn(
                    "text-sm font-medium",
                    isActive && "text-purple-900",
                    isComplete && "text-green-800",
                    isPending && "text-gray-500"
                  )}>
                    {step.label}
                  </p>

                  {/* Show models during generation step */}
                  {step.id === 'generate' && isActive && (
                    <div className="flex items-center gap-2 mt-2">
                      {MODELS.map((model, i) => (
                        <span
                          key={model}
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full transition-all duration-300",
                            i === activeModel
                              ? "bg-purple-200 text-purple-800 font-medium"
                              : "bg-gray-100 text-gray-500"
                          )}
                        >
                          {model}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <p className="text-xs text-center text-gray-500">
            This usually takes 1-2 minutes...
          </p>
        </div>
      </div>
    </div>
  );
}
