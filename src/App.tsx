import { useState, useEffect, useCallback, useRef } from "react";
import {
  Sparkles,
  BookOpen,
  Wand2,
  RotateCcw,
  Printer,
  Trash2,
  History,
  X,
  Volume2,
} from "lucide-react";

interface Story {
  id: string;
  topic: string;
  maxLetters: number;
  content: string;
  createdAt: number;
}

const STORAGE_KEY = "tiny-tales-stories";

const AVAILABLE_MODELS = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Recommended",
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    description: "Fastest",
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    description: "Newest (beta)",
  },
];

function App() {
  const [topic, setTopic] = useState("");
  const [maxLetters, setMaxLetters] = useState(5);
  const [model, setModel] = useState("gemini-2.5-flash");
  const [story, setStory] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedStories, setSavedStories] = useState<Story[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on page load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load saved stories from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSavedStories(JSON.parse(stored));
      } catch {
        console.error("Failed to parse stored stories");
      }
    }
  }, []);

  // Save stories to localStorage
  const saveStory = useCallback((newStory: Story) => {
    setSavedStories((prev) => {
      const updated = [newStory, ...prev].slice(0, 10); // Keep last 10 stories
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const generateStory = async () => {
    if (!topic.trim()) return;

    setIsLoading(true);
    setError("");
    setStory("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topic.trim(),
          maxLetters,
          model,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Something went wrong");
      }

      const data = await response.json();
      setStory(data.story);

      // Save to history
      saveStory({
        id: Date.now().toString(),
        topic: topic.trim(),
        maxLetters,
        content: data.story,
        createdAt: Date.now(),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Oops! Our story wizard took a nap. Please try again! 🧙‍♂️💤"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setSavedStories([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const loadStory = (savedStory: Story) => {
    setTopic(savedStory.topic);
    setMaxLetters(savedStory.maxLetters);
    setStory(savedStory.content);
    setShowHistory(false);
  };

  const printStory = () => {
    window.print();
  };

  const speakStory = () => {
    if ("speechSynthesis" in window && story) {
      const utterance = new SpeechSynthesisUtterance(story);
      utterance.rate = 0.8;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Render story with word highlighting
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

  const letterLabels = [
    "",
    "",
    "",
    "CAT",
    "BIRD",
    "HORSE",
    "RABBIT",
    "DOLPHIN",
    "ELEPHANT",
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Floating decorative shapes */}
      <div className="floating-shape top-20 left-10 w-16 h-16 bg-pink-300 rounded-full" />
      <div className="floating-shape top-40 right-20 w-12 h-12 bg-yellow-300 rounded-lg rotate-45" />
      <div className="floating-shape bottom-32 left-1/4 w-20 h-20 bg-cyan-300 rounded-full" />
      <div className="floating-shape top-1/3 right-1/3 w-14 h-14 bg-purple-300 rounded-lg" />
      <div className="floating-shape bottom-20 right-10 w-10 h-10 bg-green-300 rounded-full" />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <BookOpen className="w-12 h-12 text-pink-500 animate-wiggle" />
            <h1 className="text-4xl md:text-6xl font-bold font-comic rainbow-text">
              Tiny Tales
            </h1>
            <Sparkles className="w-12 h-12 text-yellow-500 animate-sparkle" />
          </div>
          <p className="text-lg md:text-xl text-gray-600 font-lexend">
            ✨ Magical stories for little readers! ✨
          </p>
        </header>

        {/* Main Card */}
        <div className="max-w-2xl mx-auto">
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
                onChange={(e) => setTopic(e.target.value)}
                placeholder="A brave cat, magical forest, funny robot..."
                className="w-full px-4 py-3 text-lg rounded-2xl border-2 border-gray-300 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-lexend placeholder:text-gray-400 shadow-sm"
                disabled={isLoading}
                onKeyDown={(e) => e.key === "Enter" && generateStory()}
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
                  onChange={(e) => setMaxLetters(Number(e.target.value))}
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
                    (like "{letterLabels[maxLetters]}")
                  </span>
                  <span>8</span>
                </div>
              </div>
            </div>

            {/* Model Selector */}
            <div className="mb-8">
              <label className="block text-lg font-bold text-gray-700 mb-2 font-comic">
                🤖 AI Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 text-base rounded-2xl border-2 border-gray-300 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-lexend cursor-pointer shadow-sm"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.description}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1 font-lexend">
                Different models may have separate rate limits
              </p>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateStory}
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
            {savedStories.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="mt-4 w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl flex items-center justify-center gap-2 transition-colors font-lexend"
              >
                <History className="w-5 h-5" />
                <span>My Story History ({savedStories.length})</span>
              </button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-center">
              <p className="text-red-600 font-medium font-lexend">{error}</p>
            </div>
          )}

          {/* Loading Animation */}
          {isLoading && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-4 p-6 bg-white/80 rounded-3xl shadow-lg">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
                  <Wand2 className="w-8 h-8 text-purple-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-left">
                  <p className="text-xl font-bold text-gray-700 font-comic">
                    Crafting your story...
                  </p>
                  <p className="text-gray-500 font-lexend">
                    Our wizard is writing something special! ✨
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Story Display */}
          {story && !isLoading && (
            <div className="mt-8 story-container bg-white rounded-3xl shadow-2xl p-6 md:p-8 border-4 border-yellow-300">
              {/* Story Header */}
              <div className="flex items-center justify-between mb-4 no-print">
                <h2 className="text-2xl font-bold text-gray-700 font-comic flex items-center gap-2">
                  <span>📖</span> Your Story
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={speakStory}
                    className="p-2 bg-purple-100 hover:bg-purple-200 rounded-full transition-colors"
                    title="Read aloud"
                  >
                    <Volume2 className="w-5 h-5 text-purple-600" />
                  </button>
                  <button
                    onClick={printStory}
                    className="p-2 bg-cyan-100 hover:bg-cyan-200 rounded-full transition-colors"
                    title="Print story"
                  >
                    <Printer className="w-5 h-5 text-cyan-600" />
                  </button>
                </div>
              </div>

              {/* Story Content */}
              <div className="text-xl md:text-2xl leading-relaxed text-gray-800 font-lexend font-medium">
                {renderStory(story)}
              </div>

              {/* Generate Another Button */}
              <button
                onClick={generateStory}
                className="mt-6 w-full py-3 px-6 bg-gradient-to-r from-cyan-400 to-green-400 text-white text-lg font-bold rounded-2xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2 font-comic no-print"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Generate Another!</span>
              </button>
            </div>
          )}

          {/* History Panel */}
          {showHistory && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-700 font-comic flex items-center gap-2">
                    <History className="w-6 h-6 text-purple-500" />
                    Story History
                  </h2>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                  {savedStories.map((savedStory) => (
                    <button
                      key={savedStory.id}
                      onClick={() => loadStory(savedStory)}
                      className="w-full p-4 bg-gradient-to-r from-pink-50 to-cyan-50 hover:from-pink-100 hover:to-cyan-100 rounded-2xl text-left transition-colors border-2 border-transparent hover:border-pink-200"
                    >
                      <p className="font-bold text-gray-700 font-comic truncate">
                        {savedStory.topic}
                      </p>
                      <p className="text-sm text-gray-500 font-lexend mt-1">
                        Max {savedStory.maxLetters} letters •{" "}
                        {new Date(savedStory.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-gray-600 font-lexend mt-2 line-clamp-2 text-sm">
                        {savedStory.content.slice(0, 100)}...
                      </p>
                    </button>
                  ))}
                </div>

                <button
                  onClick={clearHistory}
                  className="mt-4 py-2 px-4 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl flex items-center justify-center gap-2 transition-colors font-lexend"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear All History</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-500 font-lexend no-print">
          <p>Made with ❤️ for little readers everywhere</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
