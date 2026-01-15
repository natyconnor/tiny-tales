import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type ReadingModeModalProps = {
  imageUrls: string[];
  segments: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

const renderStoryText = (text: string) => {
  return text.split(/(\s+)/).map((word, index) => {
    if (word.trim() === "") {
      return <span key={index}>{word}</span>;
    }
    return (
      <span key={index} className="reading-mode-word">
        {word}
      </span>
    );
  });
};

export default function ReadingModeModal({
  imageUrls,
  segments,
  currentIndex,
  onIndexChange,
  onClose,
}: ReadingModeModalProps) {
  const totalPanels = imageUrls.length;
  const hasNext = currentIndex < totalPanels - 1;
  const hasPrev = currentIndex > 0;

  const goNext = useCallback(() => {
    if (hasNext) {
      onIndexChange(currentIndex + 1);
    }
  }, [hasNext, currentIndex, onIndexChange]);

  const goPrev = useCallback(() => {
    if (hasPrev) {
      onIndexChange(currentIndex - 1);
    }
  }, [hasPrev, currentIndex, onIndexChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-gradient-to-br from-pink-50 via-white to-purple-50 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden border-4 border-purple-300 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-purple-200 bg-gradient-to-r from-pink-100/80 to-purple-100/80">
          <h3 className="text-xl font-bold text-gray-700 font-comic flex items-center gap-2">
            <span>📚</span> Reading Mode
          </h3>
          <div className="flex items-center gap-4">
            <span className="text-sm font-lexend text-gray-500 bg-white/60 px-3 py-1 rounded-full">
              {currentIndex + 1} of {totalPanels}
            </span>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-full transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5 text-gray-500" />
            </motion.button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative p-6 md:p-8 overflow-y-auto overflow-x-hidden max-h-[calc(95vh-140px)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col items-center gap-6"
            >
              {/* Large Image */}
              <div className="w-full max-w-2xl aspect-[4/3] rounded-2xl overflow-hidden shadow-xl border-4 border-purple-200 bg-gradient-to-br from-pink-100 to-purple-100">
                <img
                  src={imageUrls[currentIndex]}
                  alt={`Story panel ${currentIndex + 1}`}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              </div>

              {/* Large Text */}
              {segments[currentIndex] && (
                <div className="w-full max-w-2xl text-center px-4">
                  <p className="text-2xl md:text-3xl lg:text-4xl leading-relaxed text-gray-800 font-lexend font-semibold reading-mode-text">
                    {renderStoryText(segments[currentIndex])}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          <div className="absolute inset-x-0 top-1/3 flex justify-between px-2 md:px-4 pointer-events-none">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              disabled={!hasPrev}
              className={`pointer-events-auto p-3 md:p-4 rounded-full shadow-lg transition-all ${
                hasPrev
                  ? "bg-white/90 hover:bg-white text-purple-600 hover:text-purple-700"
                  : "bg-white/30 text-gray-300 cursor-not-allowed"
              }`}
              title="Previous (←)"
            >
              <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              disabled={!hasNext}
              className={`pointer-events-auto p-3 md:p-4 rounded-full shadow-lg transition-all ${
                hasNext
                  ? "bg-white/90 hover:bg-white text-purple-600 hover:text-purple-700"
                  : "bg-white/30 text-gray-300 cursor-not-allowed"
              }`}
              title="Next (→)"
            >
              <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
            </motion.button>
          </div>
        </div>

        {/* Footer with progress dots */}
        <div className="p-4 border-t-2 border-purple-200 bg-gradient-to-r from-pink-50 to-purple-50">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: totalPanels }).map((_, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onIndexChange(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-gradient-to-r from-pink-500 to-purple-500 w-6"
                    : "bg-purple-200 hover:bg-purple-300"
                }`}
                title={`Go to panel ${index + 1}`}
              />
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-2 font-lexend">
            Use arrow keys ← → or click arrows to navigate
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
