import type { RefObject } from "react";
import { History, Sparkles, Wand2 } from "lucide-react";

import {
  AVAILABLE_MODELS,
  IMAGE_MODELS,
  LETTER_LABELS,
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
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 md:p-8 border-4 border-dashed border-pink-200 no-print">
      {/* Topic Input */}
      <div className="mb-6">
        <label className="block text-lg font-bold text-gray-700 mb-2 font-comic">
          🌟 What should the story be about?
        </label>
        <input
          ref={inputRef}
          type="text"
          value={topic}
          onChange={(event) => onTopicChange(event.target.value)}
          placeholder="A brave cat, magical forest, funny robot..."
          className="w-full px-4 py-3 text-lg rounded-2xl border-2 border-gray-300 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-lexend placeholder:text-gray-400 shadow-sm"
          disabled={isLoading}
          onKeyDown={(event) => event.key === "Enter" && onGenerate()}
        />
      </div>

      {/* Max Letters Slider */}
      <div className="mb-6">
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
            className="w-full h-3 bg-gradient-to-r from-green-300 via-cyan-300 to-purple-300 rounded-full appearance-none cursor-pointer slider-thumb"
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
              background: linear-gradient(135deg, #FF6B9D, #4ECDC4);
              border-radius: 50%;
              cursor: pointer;
              box-shadow: 0 4px 10px rgba(0,0,0,0.2);
              border: 3px solid white;
            }
            input[type='range']::-moz-range-thumb {
              width: 28px;
              height: 28px;
              background: linear-gradient(135deg, #FF6B9D, #4ECDC4);
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
      </div>

      {/* Model Selector */}
      <div className="mb-6">
        <label className="block text-lg font-bold text-gray-700 mb-2 font-comic">
          🤖 Story AI
        </label>
        <select
          value={model}
          onChange={(event) => onModelChange(event.target.value)}
          disabled={isLoading}
          className="w-full px-4 py-3 text-base rounded-2xl border-2 border-gray-300 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-lexend cursor-pointer shadow-sm"
        >
          {AVAILABLE_MODELS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — {item.description}
            </option>
          ))}
        </select>
      </div>

      {/* Image Model Selector */}
      <div className="mb-8">
        <label className="block text-lg font-bold text-gray-700 mb-2 font-comic">
          🎨 Image AI
        </label>
        <select
          value={imageModel}
          onChange={(event) => onImageModelChange(event.target.value)}
          disabled={isLoading}
          className="w-full px-4 py-3 text-base rounded-2xl border-2 border-gray-300 bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all font-lexend cursor-pointer shadow-sm"
        >
          {IMAGE_MODELS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — {item.description}
            </option>
          ))}
        </select>
      </div>

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={isLoading || !topic.trim()}
        className="w-full py-4 px-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 font-comic"
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
      </button>

      {/* History Button */}
      {savedStoriesCount > 0 && (
        <button
          onClick={onToggleHistory}
          className="mt-4 w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl flex items-center justify-center gap-2 transition-colors font-lexend"
        >
          <History className="w-5 h-5" />
          <span>My Story History ({savedStoriesCount})</span>
        </button>
      )}
    </div>
  );
}
