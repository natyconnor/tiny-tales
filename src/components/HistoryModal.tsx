import { History, Trash2, X } from "lucide-react";

import { MAX_STORED_STORIES } from "../constants/story";
import type { Story } from "../types/story";
import {
  extractImageModelFromUrl,
  getImageModelDisplayName,
} from "../utils/imageModels";

type HistoryModalProps = {
  savedStories: Story[];
  onClose: () => void;
  onLoadStory: (story: Story) => void;
  onClearHistory: () => void;
};

export default function HistoryModal({
  savedStories,
  onClose,
  onLoadStory,
  onClearHistory,
}: HistoryModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
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
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {savedStories.map((savedStory) => {
            const imageModelId =
              savedStory.imageUrls && savedStory.imageUrls.length > 0
                ? extractImageModelFromUrl(savedStory.imageUrls[0])
                : null;
            const imageModelName = getImageModelDisplayName(imageModelId);

            return (
              <button
                key={savedStory.id}
                onClick={() => onLoadStory(savedStory)}
                className="w-full p-4 bg-gradient-to-r from-pink-50 to-cyan-50 hover:from-pink-100 hover:to-cyan-100 rounded-2xl text-left transition-colors border-2 border-transparent hover:border-pink-200"
              >
                <p className="font-bold text-gray-700 font-comic truncate">
                  {savedStory.topic}
                </p>
                <p className="text-sm text-gray-500 font-lexend mt-1">
                  Max {savedStory.maxLetters} letters •{" "}
                  {new Date(savedStory.createdAt).toLocaleDateString()}
                </p>
                {imageModelId && (
                  <p className="text-xs text-purple-600 font-lexend mt-1">
                    🎨 {imageModelName}
                  </p>
                )}
                <p className="text-gray-600 font-lexend mt-2 line-clamp-2 text-sm">
                  {savedStory.content.slice(0, 100)}...
                </p>
              </button>
            );
          })}
        </div>

        <button
          onClick={onClearHistory}
          className="mt-4 py-2 px-4 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl flex items-center justify-center gap-2 transition-colors font-lexend"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear All History</span>
        </button>
      </div>
    </div>
  );
}
