import { type RefObject, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { History, Sparkles, Wand2, Lightbulb } from "lucide-react";

import {
  AVAILABLE_MODELS,
  IMAGE_MODELS,
  LETTER_LABELS,
  PROMPT_IDEAS,
} from "../constants/story";

type StoryFormProps = {
  topic: string;
  maxLetters: number;
  model: string;
  imageModel: string;
  isLoading: boolean;
  savedStoriesCount: number;
  inputRef: RefObject<HTMLInputElement>;
  onTopicChange: (value: string) => void;
  onMaxLettersChange: (value: number) => void;
  onModelChange: (value: string) => void;
  onImageModelChange: (value: string) => void;
  onGenerate: () => void;
  onToggleHistory: () => void;
};

export default function StoryForm({
  topic,
  maxLetters,
  model,
  imageModel,
  isLoading,
  savedStoriesCount,
  inputRef,
  onTopicChange,
  onMaxLettersChange,
  onModelChange,
  onImageModelChange,
  onGenerate,
  onToggleHistory,
}: StoryFormProps) {
  const [showHints, setShowHints] = useState(false);
  const [hintTimeout, setHintTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const promptData = PROMPT_IDEAS[maxLetters] || PROMPT_IDEAS[5];

  // Delayed close to allow mouse to move from button to popover
  const handleMouseLeave = () => {
    const timeout = setTimeout(() => setShowHints(false), 150);
    setHintTimeout(timeout);
  };

  const handleMouseEnter = () => {
    if (hintTimeout) {
      clearTimeout(hintTimeout);
      setHintTimeout(null);
    }
    setShowHints(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 md:p-8 border-4 border-dashed border-pink-200 no-print"
    >
      {/* Topic Input */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="mb-6"
        data-tutorial="prompt"
      >
        <div className="flex items-center gap-2 mb-2">
          <label className="block text-lg font-bold text-gray-700 font-comic">
            🌟 What should the story be about?
          </label>
          {/* Hint Icon */}
          <div className="relative">
            <button
              type="button"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onFocus={handleMouseEnter}
              onBlur={handleMouseLeave}
              className="p-1.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-600 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300"
              aria-label="Show prompt ideas"
            >
              <Lightbulb className="w-4 h-4" />
            </button>

            {/* Hints Popover */}
            <AnimatePresence>
              {showHints && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-1 z-50 w-72 md:w-80"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-4 font-lexend">
                    <div className="flex items-center gap-2 mb-3 text-amber-700 font-bold">
                      <span className="text-xl">{promptData.emoji}</span>
                      <span className="text-sm">
                        Ideas for {maxLetters}-letter stories
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {promptData.ideas.map((idea, index) => (
                        <li key={index}>
                          <button
                            type="button"
                            onClick={() => {
                              onTopicChange(idea);
                              setShowHints(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors"
                          >
                            {idea}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-gray-400 mt-3 text-center">
                      Click an idea or type your own!
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={topic}
          onChange={(event) => onTopicChange(event.target.value)}
          placeholder="A brave cat, magical forest, funny robot..."
          className="w-full px-4 py-3 text-lg rounded-2xl border-2 border-gray-300 bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all font-lexend placeholder:text-gray-400 shadow-sm"
          disabled={isLoading}
          onKeyDown={(event) => event.key === "Enter" && onGenerate()}
        />
      </motion.div>

      {/* Max Letters Slider */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="mb-6"
        data-tutorial="word-length"
      >
        <label className="block text-lg font-bold text-gray-700 mb-2 font-comic">
          📏 Maximum letters per word:{" "}
          <span className="text-pink-500">{maxLetters}</span>
        </label>
        <div className="relative">
          <input
            type="range"
            min="3"
            max="8"
            value={maxLetters}
            onChange={(event) => onMaxLettersChange(Number(event.target.value))}
            className="w-full h-3 bg-gradient-to-r from-pink-300 via-fuchsia-300 to-purple-300 rounded-full appearance-none cursor-pointer slider-thumb"
            disabled={isLoading}
            style={{
              WebkitAppearance: "none",
            }}
          />
          <style>{`
            input[type='range']::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 28px;
              height: 28px;
              background: linear-gradient(135deg, #f472b6, #a855f7);
              border-radius: 50%;
              cursor: pointer;
              box-shadow: 0 4px 10px rgba(0,0,0,0.2);
              border: 3px solid white;
            }
            input[type='range']::-moz-range-thumb {
              width: 28px;
              height: 28px;
              background: linear-gradient(135deg, #f472b6, #a855f7);
              border-radius: 50%;
              cursor: pointer;
              box-shadow: 0 4px 10px rgba(0,0,0,0.2);
              border: 3px solid white;
            }
          `}</style>
          <div className="flex justify-between text-sm text-gray-500 mt-1 font-lexend">
            <span>3</span>
            <span className="text-xs text-gray-400">
              (like "{LETTER_LABELS[maxLetters]}")
            </span>
            <span>8</span>
          </div>
        </div>
      </motion.div>

      {/* Model Selector */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mb-6"
        data-tutorial="story-ai"
      >
        <label className="block text-lg font-bold text-gray-700 mb-2 font-comic">
          🤖 Story AI
        </label>
        <select
          value={model}
          onChange={(event) => onModelChange(event.target.value)}
          disabled={isLoading}
          className="w-full px-4 py-3 text-base rounded-2xl border-2 border-gray-300 bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all font-lexend cursor-pointer shadow-sm"
        >
          {AVAILABLE_MODELS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — {item.description}
            </option>
          ))}
        </select>
      </motion.div>

      {/* Image Model Selector */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="mb-8"
        data-tutorial="image-ai"
      >
        <label className="block text-lg font-bold text-gray-700 mb-2 font-comic">
          🎨 Image AI
        </label>
        <select
          value={imageModel}
          onChange={(event) => onImageModelChange(event.target.value)}
          disabled={isLoading}
          className="w-full px-4 py-3 text-base rounded-2xl border-2 border-gray-300 bg-white focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100 outline-none transition-all font-lexend cursor-pointer shadow-sm"
        >
          {IMAGE_MODELS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — {item.description}
            </option>
          ))}
        </select>
      </motion.div>

      {/* Generate Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          opacity: { delay: 0.5, duration: 0.4 },
          scale: { delay: 0, duration: 0.2 },
        }}
        whileHover={!isLoading && topic.trim() ? { scale: 1.02 } : {}}
        whileTap={!isLoading && topic.trim() ? { scale: 0.98 } : {}}
        onClick={onGenerate}
        disabled={isLoading || !topic.trim()}
        className={`w-full py-4 px-6 text-xl font-bold rounded-2xl flex items-center justify-center gap-3 font-comic transition-all ${
          isLoading || !topic.trim()
            ? "bg-gray-300 text-gray-500 shadow-none cursor-not-allowed"
            : "bg-gradient-to-r from-pink-400 via-fuchsia-500 to-purple-500 text-white shadow-lg hover:shadow-xl"
        }`}
      >
        {isLoading ? (
          <>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-white rounded-full loading-dot" />
              <div className="w-3 h-3 bg-white rounded-full loading-dot" />
              <div className="w-3 h-3 bg-white rounded-full loading-dot" />
            </div>
            <span>Creating magic...</span>
          </>
        ) : (
          <>
            <Wand2 className="w-6 h-6" />
            <span>Create My Story!</span>
            <Sparkles className="w-6 h-6" />
          </>
        )}
      </motion.button>

      {/* History Button */}
      {savedStoriesCount > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onToggleHistory}
          className="mt-4 w-full py-2 px-4 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center gap-2 transition-colors font-lexend"
          data-tutorial="history"
        >
          <History className="w-5 h-5" />
          <span>My Story History ({savedStoriesCount})</span>
        </motion.button>
      )}
    </motion.div>
  );
}
