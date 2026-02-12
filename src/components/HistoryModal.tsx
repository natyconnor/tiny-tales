import { motion, AnimatePresence } from "motion/react";
import { History, Trash2, X } from "lucide-react";

import { DEFAULT_AVAILABLE_MODELS, MAX_STORED_STORIES } from "../constants/story";
import type { Story } from "../types/story";
import {
  extractImageModelFromUrl,
  getImageModelDisplayName,
} from "../utils/imageModels";

type HistoryModalProps = {
  savedStories: Story[];
  onClose: () => void;
  onLoadStory: (story: Story) => void;
  onDeleteStory: (storyId: string) => void;
  onClearHistory: () => void;
};

export default function HistoryModal({
  savedStories,
  onClose,
  onLoadStory,
  onDeleteStory,
  onClearHistory,
}: HistoryModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white rounded-3xl shadow-2xl p-6 max-w-xl w-full max-h-[85vh] overflow-hidden flex flex-col border-4 border-purple-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-700 font-comic flex items-center gap-2">
              <History className="w-6 h-6 text-purple-500" />
              Story History
            </h2>
            {savedStories.length >= MAX_STORED_STORIES && (
              <p className="text-xs text-amber-600 font-lexend mt-1 ml-8">
                ⚠️ At capacity ({MAX_STORED_STORIES} stories). Oldest stories
                will be removed when you create new ones.
              </p>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <AnimatePresence mode="popLayout">
            {savedStories.map((savedStory) => {
              const imageModelId =
                savedStory.imageModel ??
                (savedStory.imageUrls && savedStory.imageUrls.length > 0
                  ? extractImageModelFromUrl(savedStory.imageUrls[0])
                  : null);
              const imageModelName = getImageModelDisplayName(imageModelId);
              const textModelName = savedStory.model
                ? DEFAULT_AVAILABLE_MODELS.find((item) => item.id === savedStory.model)
                    ?.name ?? savedStory.model
                : null;

              return (
                <motion.div
                  key={savedStory.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50, scale: 0.9 }}
                  transition={{
                    layout: { type: "spring", damping: 25, stiffness: 300 },
                    opacity: { duration: 0.2 },
                    x: { duration: 0.2 },
                    scale: { duration: 0.2 },
                  }}
                  className="relative group"
                >
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onLoadStory(savedStory)}
                    className="w-full p-4 bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 rounded-2xl text-left transition-all border-2 border-transparent hover:border-purple-200 hover:shadow-md pr-12"
                  >
                    <p className="font-bold text-gray-700 font-comic truncate">
                      {savedStory.topic}
                    </p>
                    <p className="text-sm text-gray-500 font-lexend mt-1">
                      Max {savedStory.maxLetters} letters •{" "}
                      {new Date(savedStory.createdAt).toLocaleDateString()}
                    </p>
                    {textModelName && (
                      <p className="text-xs text-indigo-600 font-lexend mt-1">
                        ✍️ {textModelName}
                      </p>
                    )}
                    {imageModelId && (
                      <p className="text-xs text-purple-600 font-lexend mt-1">
                        🎨 {imageModelName}
                      </p>
                    )}
                    <p className="text-gray-600 font-lexend mt-2 line-clamp-2 text-sm">
                      {savedStory.content.slice(0, 100)}...
                    </p>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteStory(savedStory.id);
                    }}
                    className="absolute top-4 right-4 p-2 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded-full transition-all text-gray-400 hover:text-red-500"
                    title="Delete story"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClearHistory}
          className="mt-4 py-2 px-4 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl flex items-center justify-center gap-2 transition-colors font-lexend"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear All History</span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
