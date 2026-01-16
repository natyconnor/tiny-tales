import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import type { TutorialStep } from "../constants/tutorial";

type TutorialProps = {
  steps: TutorialStep[];
  storageKey: string;
  onComplete: () => void;
};

export default function Tutorial({
  steps,
  storageKey,
  onComplete,
}: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const step = steps[currentStep];

  // Update highlight position when step changes
  const updateHighlight = useCallback(() => {
    if (!step.targetSelector) {
      setHighlightRect(null);
      return;
    }
    const element = document.querySelector(step.targetSelector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setHighlightRect(rect);
    }
  }, [step.targetSelector]);

  useEffect(() => {
    updateHighlight();

    // Update on resize/scroll
    window.addEventListener("resize", updateHighlight);
    window.addEventListener("scroll", updateHighlight);

    return () => {
      window.removeEventListener("resize", updateHighlight);
      window.removeEventListener("scroll", updateHighlight);
    };
  }, [updateHighlight]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(storageKey, "true");
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  // Calculate tooltip position (only for non-centered steps)
  const getTooltipStyle = (): React.CSSProperties => {
    const tooltipWidth = 340;

    if (!highlightRect) {
      return { width: tooltipWidth };
    }

    const padding = 16;

    // Center horizontally relative to highlighted element, but keep within viewport
    let left = highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2;
    left = Math.max(
      padding,
      Math.min(left, window.innerWidth - tooltipWidth - padding)
    );

    if (step.position === "bottom") {
      return {
        top: highlightRect.bottom + 16,
        left,
        width: tooltipWidth,
      };
    } else {
      return {
        bottom: window.innerHeight - highlightRect.top + 16,
        left,
        width: tooltipWidth,
      };
    }
  };

  const isCentered = step.position === "center";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100]"
    >
      {/* Dark overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {highlightRect && (
              <rect
                x={highlightRect.left - 8}
                y={highlightRect.top - 8}
                width={highlightRect.width + 16}
                height={highlightRect.height + 16}
                rx="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Highlight border glow */}
      {highlightRect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute pointer-events-none"
          style={{
            left: highlightRect.left - 8,
            top: highlightRect.top - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
            borderRadius: 16,
            border: "3px solid rgba(236, 72, 153, 0.8)",
            boxShadow:
              "0 0 20px rgba(236, 72, 153, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)",
          }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        {/* Wrapper for centering - uses flex for centered steps, absolute positioning for others */}
        <div
          key={`wrapper-${step.id}`}
          className={
            isCentered
              ? "fixed inset-0 flex items-center justify-center z-10 pointer-events-none"
              : "contents"
          }
        >
          <motion.div
            key={step.id}
            initial={{
              opacity: 0,
              scale: isCentered ? 0.9 : 1,
              y: isCentered ? 0 : step.position === "bottom" ? -10 : 10,
            }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              scale: isCentered ? 0.9 : 1,
              y: isCentered ? 0 : step.position === "bottom" ? -10 : 10,
            }}
            transition={{ duration: 0.2 }}
            className={
              isCentered ? "z-10 pointer-events-auto" : "absolute z-10"
            }
            style={isCentered ? { width: 400 } : getTooltipStyle()}
          >
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-pink-400 via-fuchsia-500 to-purple-500 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{step.emoji}</span>
                  <h3 className="text-white font-bold font-comic text-lg">
                    {step.title}
                  </h3>
                </div>
                <button
                  onClick={handleSkip}
                  className="text-white/80 hover:text-white transition-colors p-1"
                  aria-label="Skip tutorial"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="px-5 py-4">
                <p className="text-gray-600 font-lexend text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
                {/* Progress dots */}
                <div className="flex gap-1.5">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentStep
                          ? "bg-pink-500"
                          : index < currentStep
                          ? "bg-pink-300"
                          : "bg-gray-300"
                      }`}
                    />
                  ))}
                </div>

                {/* Navigation buttons */}
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <button
                      onClick={handlePrev}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors font-lexend"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1 px-4 py-1.5 text-sm font-bold text-white bg-gradient-to-r from-pink-400 to-purple-500 rounded-xl hover:from-pink-500 hover:to-purple-600 transition-all font-lexend shadow-md"
                  >
                    {currentStep === steps.length - 1 ? (
                      <>
                        Let's Go!
                        <Sparkles className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Skip text at bottom */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <button
          onClick={handleSkip}
          className="text-white/70 hover:text-white text-sm font-lexend transition-colors"
        >
          Skip tutorial
        </button>
      </div>
    </motion.div>
  );
}
