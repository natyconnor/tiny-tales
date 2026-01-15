import type { SyntheticEvent } from "react";
import { motion } from "motion/react";
import { Download, RotateCcw, BookOpen } from "lucide-react";

import { splitStoryIntoSegments } from "../utils/storySegments";

type StoryDisplayProps = {
  story: string;
  imageUrls: string[];
  loadedImages: boolean[];
  isGeneratingImage: boolean;
  onImageLoad: (index: number, event: SyntheticEvent<HTMLImageElement>) => void;
  onImageError: (index: number, url: string) => void;
  onDownloadImage: () => void;
  onGenerateAnother: () => void;
  onOpenReadingMode: () => void;
};

const renderStory = (text: string) => {
  return text.split(/(\s+)/).map((word, index) => {
    if (word.trim() === "") {
      return <span key={index}>{word}</span>;
    }
    return (
      <span key={index} className="story-word">
        {word}
      </span>
    );
  });
};

export default function StoryDisplay({
  story,
  imageUrls,
  loadedImages,
  isGeneratingImage,
  onImageLoad,
  onImageError,
  onDownloadImage,
  onGenerateAnother,
  onOpenReadingMode,
}: StoryDisplayProps) {
  const segments = splitStoryIntoSegments(story, Math.max(imageUrls.length, 1));

  // Unified pink-to-purple color palette for story cards
  const bgColors = [
    "from-pink-100 to-rose-100",
    "from-rose-100 to-fuchsia-100",
    "from-fuchsia-100 to-violet-100",
    "from-violet-100 to-purple-100",
  ];
  const spinnerColors = [
    "border-pink-200 border-t-pink-500",
    "border-rose-200 border-t-rose-500",
    "border-fuchsia-200 border-t-fuchsia-500",
    "border-purple-200 border-t-purple-500",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mt-8 story-container bg-white rounded-3xl shadow-2xl p-6 md:p-8 border-4 border-purple-300"
    >
      {/* Story Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-between mb-6 no-print"
      >
        <h2 className="text-2xl font-bold text-gray-700 font-comic flex items-center gap-2">
          <span>📖</span> Your Story
        </h2>
        <div className="flex items-center gap-2">
          {imageUrls.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onOpenReadingMode}
              className="p-2 bg-purple-100 hover:bg-purple-200 rounded-full transition-colors"
              title="Reading Mode"
            >
              <BookOpen className="w-5 h-5 text-purple-600" />
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onDownloadImage}
            disabled={isGeneratingImage}
            className="p-2 bg-pink-100 hover:bg-pink-200 rounded-full transition-colors disabled:opacity-50"
            title="Download as image"
          >
            {isGeneratingImage ? (
              <div className="w-5 h-5 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
            ) : (
              <Download className="w-5 h-5 text-pink-600" />
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Storybook Layout - 2-column responsive grid */}
      <div className="storybook-content">
        {imageUrls.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl md:text-2xl leading-relaxed text-gray-800 font-lexend font-medium story-text"
          >
            {renderStory(story)}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {imageUrls.map((url, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  delay: 0.2 + index * 0.15,
                  duration: 0.4,
                  ease: "easeOut",
                }}
                className="story-page"
              >
                {/* Image */}
                <div
                  className={`relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br ${
                    bgColors[index % bgColors.length]
                  } mb-3`}
                >
                  {!loadedImages[index] && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div
                          className={`w-12 h-12 border-4 ${
                            spinnerColors[index % spinnerColors.length]
                          } rounded-full animate-spin mx-auto mb-2`}
                        />
                        <p className="text-sm text-gray-500 font-lexend">
                          Creating art...
                        </p>
                      </div>
                    </div>
                  )}
                  <img
                    src={url}
                    alt={`Story illustration ${index + 1}`}
                    className={`w-full h-full object-cover transition-opacity duration-500 ${
                      loadedImages[index] ? "opacity-100" : "opacity-0"
                    }`}
                    data-story-image
                    data-index={index}
                    crossOrigin="anonymous"
                    onLoad={(event) => onImageLoad(index, event)}
                    onError={() => onImageError(index, url)}
                  />
                </div>

                {/* Corresponding text segment */}
                {segments[index] && (
                  <div className="text-base md:text-lg leading-relaxed text-gray-800 font-lexend font-medium story-text px-1">
                    {renderStory(segments[index])}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Another Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onGenerateAnother}
        className="mt-8 w-full py-3 px-6 bg-gradient-to-r from-pink-400 to-purple-500 text-white text-lg font-bold rounded-2xl shadow-md hover:shadow-lg transition-shadow flex items-center justify-center gap-2 font-comic no-print"
      >
        <RotateCcw className="w-5 h-5" />
        <span>Try Again!</span>
      </motion.button>
    </motion.div>
  );
}
