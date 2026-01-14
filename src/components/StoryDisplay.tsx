import type { SyntheticEvent } from "react";
import { Download, RotateCcw } from "lucide-react";

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
}: StoryDisplayProps) {
  const segments = splitStoryIntoSegments(
    story,
    Math.max(imageUrls.length, 1)
  );
  const bgColors = [
    "from-pink-100 to-purple-100",
    "from-cyan-100 to-blue-100",
    "from-yellow-100 to-orange-100",
    "from-green-100 to-teal-100",
  ];
  const spinnerColors = [
    "border-pink-200 border-t-pink-500",
    "border-cyan-200 border-t-cyan-500",
    "border-yellow-200 border-t-yellow-500",
    "border-green-200 border-t-green-500",
  ];

  return (
    <div className="mt-8 story-container bg-white rounded-3xl shadow-2xl p-6 md:p-8 border-4 border-yellow-300">
      {/* Story Header */}
      <div className="flex items-center justify-between mb-6 no-print">
        <h2 className="text-2xl font-bold text-gray-700 font-comic flex items-center gap-2">
          <span>📖</span> Your Story
        </h2>
        <button
          onClick={onDownloadImage}
          disabled={isGeneratingImage}
          className="p-2 bg-cyan-100 hover:bg-cyan-200 rounded-full transition-colors disabled:opacity-50"
          title="Download as image"
        >
          {isGeneratingImage ? (
            <div className="w-5 h-5 border-2 border-cyan-300 border-t-cyan-600 rounded-full animate-spin" />
          ) : (
            <Download className="w-5 h-5 text-cyan-600" />
          )}
        </button>
      </div>

      {/* Storybook Layout - Each image with its text below */}
      <div className="storybook-content space-y-8">
        {imageUrls.length === 0 ? (
          <div className="text-xl md:text-2xl leading-relaxed text-gray-800 font-lexend font-medium story-text">
            {renderStory(story)}
          </div>
        ) : (
          imageUrls.map((url, index) => (
            <div key={index} className="story-page">
              {/* Image */}
              <div
                className={`relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br ${
                  bgColors[index % bgColors.length]
                } mb-4`}
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
                <div className="text-lg md:text-xl leading-relaxed text-gray-800 font-lexend font-medium story-text px-2">
                  {renderStory(segments[index])}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Generate Another Button */}
      <button
        onClick={onGenerateAnother}
        className="mt-8 w-full py-3 px-6 bg-gradient-to-r from-cyan-400 to-green-400 text-white text-lg font-bold rounded-2xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2 font-comic no-print"
      >
        <RotateCcw className="w-5 h-5" />
        <span>Generate Another!</span>
      </button>
    </div>
  );
}
