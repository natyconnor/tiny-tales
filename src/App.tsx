import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type SyntheticEvent,
} from "react";
import html2canvas from "html2canvas";
import {
  Sparkles,
  BookOpen,
  Wand2,
  RotateCcw,
  Download,
  Trash2,
  History,
  X,
} from "lucide-react";

interface Story {
  id: string;
  topic: string;
  maxLetters: number;
  content: string;
  imageUrls: string[];
  createdAt: number;
}

const STORAGE_KEY = "tiny-tales-stories";
const MAX_STORED_STORIES = 50;

const AVAILABLE_MODELS = [
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    description: "Fastest ⚡ (recommended)",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "More capable, slower",
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    description: "Newest (beta)",
  },
];

// Available Pollinations image models
// See: https://gen.pollinations.ai/image/models
// Pollen rates from API docs (images per 1 pollen):
//   flux:          5000 images/pollen (essentially unlimited)
//   turbo:         3300 images/pollen (essentially unlimited)
//   gptimage:      70 images/pollen   (~17 stories/day with 1 pollen)
//   seedream:      35 images/pollen   (~8 stories/day with 1 pollen)
//   nanobanana:    25 images/pollen   (~6 stories/day with 1 pollen)
//   nanobanana-pro:6 images/pollen    (~1 story/day with 1 pollen)
// Each story uses 4 images
const IMAGE_MODELS = [
  {
    id: "gptimage",
    name: "GPT Image",
    description: "OpenAI (~17/day)",
  },
  {
    id: "nanobanana",
    name: "Nano Banana ⭐",
    description: "Best quality (~6/day)",
  },
  {
    id: "flux",
    name: "Flux Schnell",
    description: "Fast & free (unlimited)",
  },
  {
    id: "seedream",
    name: "Seedream",
    description: "ByteDance (~8/day)",
  },
  {
    id: "turbo",
    name: "SDXL Turbo",
    description: "Fastest (unlimited)",
  },
  {
    id: "nanobanana-pro",
    name: "Nano Banana Pro",
    description: "4K quality (~1/day)",
  },
];

// Helper function to extract image model from a Pollinations URL
const extractImageModelFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get("model") || null;
  } catch {
    return null;
  }
};

// Helper function to get display name for image model
const getImageModelDisplayName = (modelId: string | null): string => {
  if (!modelId) return "Unknown";
  const model = IMAGE_MODELS.find((m) => m.id === modelId);
  return model ? model.name : modelId;
};

function App() {
  const [topic, setTopic] = useState("");
  const [maxLetters, setMaxLetters] = useState(5);
  const [model, setModel] = useState("gemini-2.5-flash-lite");
  const [imageModel, setImageModel] = useState("gptimage");
  const [story, setStory] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loadedImages, setLoadedImages] = useState<boolean[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedStories, setSavedStories] = useState<Story[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageDataUrls, setImageDataUrls] = useState<string[]>([]);
  const [storageWarning, setStorageWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);

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
      const wasAtLimit = prev.length >= MAX_STORED_STORIES;
      const updated = [newStory, ...prev].slice(0, MAX_STORED_STORIES);

      // Show warning if we're at capacity and an old story was removed
      if (wasAtLimit) {
        setStorageWarning(true);
        // Auto-hide warning after 5 seconds
        setTimeout(() => setStorageWarning(false), 5000);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const generateStory = async () => {
    if (!topic.trim()) return;

    setIsLoading(true);
    setError("");
    setStory("");
    setImageUrls([]);
    setLoadedImages([]);
    setImageDataUrls([]);

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
          imageModel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Something went wrong");
      }

      const data = await response.json();

      // Debug logging
      console.log("=== Story Generation Debug ===");
      console.log("Story length:", data.story?.length, "chars");
      console.log("Image prompts:", data.imagePrompts);
      console.log("Image URLs:", data.imageUrls);
      console.log("Debug info:", data.debug);
      console.log(
        "POLLINATIONS_API_KEY configured:",
        data.debug?.pollinationsKeyConfigured ? "YES" : "NO"
      );
      console.log("==============================");

      setStory(data.story);

      // Set image URLs and initialize loading state
      const urls = data.imageUrls || [];
      setImageUrls(urls);
      setLoadedImages(new Array(urls.length).fill(false));

      // Save to history
      saveStory({
        id: Date.now().toString(),
        topic: topic.trim(),
        maxLetters,
        content: data.story,
        imageUrls: urls,
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

  // Handle image load completion - also capture as data URL for export
  const handleImageLoad = (
    index: number,
    event: SyntheticEvent<HTMLImageElement>
  ) => {
    console.log(`Image ${index + 1} loaded successfully`);
    setLoadedImages((prev) => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });

    // Convert the loaded image to a data URL for export (no extra network request!)
    const img = event.currentTarget;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        setImageDataUrls((prev) => {
          const updated = [...prev];
          updated[index] = dataUrl;
          return updated;
        });
      }
    } catch (err) {
      console.warn(`Could not capture image ${index + 1} for export:`, err);
    }
  };

  // Handle image load error
  const handleImageError = (index: number, url: string) => {
    console.error(`Image ${index + 1} failed to load`);
    console.error(`URL: ${url}`);
    console.error(
      "This may be due to Pollinations rate limiting. Check if referrer is configured."
    );
  };

  const clearHistory = () => {
    setSavedStories([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const loadStory = (savedStory: Story) => {
    setTopic(savedStory.topic);
    setMaxLetters(savedStory.maxLetters);
    setStory(savedStory.content);
    setImageUrls(savedStory.imageUrls || []);
    setLoadedImages(new Array(savedStory.imageUrls?.length || 0).fill(false));
    setImageDataUrls([]); // Reset - will be populated as images load
    setShowHistory(false);
  };

  const downloadAsImage = async () => {
    if (!printContainerRef.current) {
      console.error("Print container ref not found");
      return;
    }

    setIsGeneratingImage(true);
    const container = printContainerRef.current;

    try {
      // Position the container on-screen for html2canvas (it needs to be visible)
      container.style.display = "block";
      container.style.position = "fixed";
      container.style.left = "0";
      container.style.top = "0";
      container.style.zIndex = "9999";

      // Wait for layout to settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(container, {
        backgroundColor: "#fffbeb",
        scale: 2,
        logging: false,
      });

      // Create and trigger download
      const link = document.createElement("a");
      link.download = `tiny-tale-${topic
        .replace(/[^a-z0-9]/gi, "-")
        .toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Failed to generate image:", error);
      alert("Sorry, couldn't generate the image. Please try again!");
    } finally {
      // Reset container to hidden
      container.style.display = "none";
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.zIndex = "auto";
      setIsGeneratingImage(false);
    }
  };

  // Split story into segments for pairing with images
  const splitStoryIntoSegments = (
    text: string,
    numSegments: number
  ): string[] => {
    // Split by sentences (period, exclamation, or question mark followed by space)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const segments: string[] = [];
    const sentencesPerSegment = Math.ceil(sentences.length / numSegments);

    for (let i = 0; i < numSegments; i++) {
      const start = i * sentencesPerSegment;
      const end = start + sentencesPerSegment;
      const segment = sentences.slice(start, end).join(" ").trim();
      if (segment) {
        segments.push(segment);
      }
    }

    return segments;
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

  const exportSegments = splitStoryIntoSegments(
    story,
    Math.max(imageUrls.length, 1)
  );
  const exportItems = imageUrls.map((_, index) => ({
    dataUrl: imageDataUrls[index],
    segment: exportSegments[index] || "",
  }));

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
            <div className="mb-6">
              <label className="block text-lg font-bold text-gray-700 mb-2 font-comic">
                🤖 Story AI
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
            </div>

            {/* Image Model Selector */}
            <div className="mb-8">
              <label className="block text-lg font-bold text-gray-700 mb-2 font-comic">
                🎨 Image AI
              </label>
              <select
                value={imageModel}
                onChange={(e) => setImageModel(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 text-base rounded-2xl border-2 border-gray-300 bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all font-lexend cursor-pointer shadow-sm"
              >
                {IMAGE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.description}
                  </option>
                ))}
              </select>
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

          {/* Storage Warning */}
          {storageWarning && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center">
              <p className="text-amber-700 font-medium font-lexend">
                ⚠️ Story saved! Your oldest story was removed to make room.
              </p>
              <p className="text-xs text-amber-600 font-lexend mt-1">
                (You can keep up to {MAX_STORED_STORIES} stories in your
                history)
              </p>
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
              <div className="flex items-center justify-between mb-6 no-print">
                <h2 className="text-2xl font-bold text-gray-700 font-comic flex items-center gap-2">
                  <span>📖</span> Your Story
                </h2>
                <button
                  onClick={downloadAsImage}
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
                {(() => {
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

                  // If no images, just show the story text
                  if (imageUrls.length === 0) {
                    return (
                      <div className="text-xl md:text-2xl leading-relaxed text-gray-800 font-lexend font-medium story-text">
                        {renderStory(story)}
                      </div>
                    );
                  }

                  return imageUrls.map((url, index) => (
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
                          crossOrigin="anonymous"
                          onLoad={(e) => handleImageLoad(index, e)}
                          onError={() => handleImageError(index, url)}
                        />
                      </div>

                      {/* Corresponding text segment */}
                      {segments[index] && (
                        <div className="text-lg md:text-xl leading-relaxed text-gray-800 font-lexend font-medium story-text px-2">
                          {renderStory(segments[index])}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>

              {/* Generate Another Button */}
              <button
                onClick={generateStory}
                className="mt-8 w-full py-3 px-6 bg-gradient-to-r from-cyan-400 to-green-400 text-white text-lg font-bold rounded-2xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2 font-comic no-print"
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
                  <div>
                    <h2 className="text-2xl font-bold text-gray-700 font-comic flex items-center gap-2">
                      <History className="w-6 h-6 text-purple-500" />
                      Story History
                    </h2>
                    {savedStories.length >= MAX_STORED_STORIES && (
                      <p className="text-xs text-amber-600 font-lexend mt-1 ml-8">
                        ⚠️ At capacity ({MAX_STORED_STORIES} stories). Oldest
                        stories will be removed when you create new ones.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                  {savedStories.map((savedStory) => {
                    // Extract image model from the first image URL
                    const imageModelId =
                      savedStory.imageUrls && savedStory.imageUrls.length > 0
                        ? extractImageModelFromUrl(savedStory.imageUrls[0])
                        : null;
                    const imageModelName =
                      getImageModelDisplayName(imageModelId);

                    return (
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

        {/* Hidden Print Container for Image Export */}
        <div
          ref={printContainerRef}
          data-print-container
          className="absolute -left-[9999px] top-0"
          style={{ display: "none" }}
        >
          <div className="w-[600px] bg-gradient-to-b from-amber-50 to-pink-50 font-lexend p-6">
            {/* Decorative top border */}
            <div className="h-1.5 bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 rounded-full mb-4" />

            {/* Header */}
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-2xl">📖</span>
                <h1 className="text-3xl font-bold font-comic text-purple-600">
                  Tiny Tales
                </h1>
                <span className="text-2xl">✨</span>
              </div>
              <p className="text-gray-500 text-sm">
                A story about:{" "}
                <strong className="text-pink-500">{topic}</strong>
              </p>
            </div>

            {/* Images Grid - uses captured data URLs from already-loaded images */}
            {exportItems.length > 0 && (
              <div
                className={`grid gap-3 mb-4 ${
                  exportItems.length === 1 ? "grid-cols-1" : "grid-cols-2"
                }`}
              >
                {exportItems.map((item, index) => (
                  <div key={index} className="bg-white">
                    <div className="aspect-square bg-amber-50 border-2 border-yellow-300 rounded-t-xl overflow-hidden">
                      {item.dataUrl ? (
                        <img
                          src={item.dataUrl}
                          alt={`Story illustration ${index + 1}`}
                          className="w-full h-full object-contain block bg-white"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-amber-600">
                          Image unavailable
                        </div>
                      )}
                    </div>
                    <div className="border-2 border-t-0 border-yellow-300 rounded-b-xl px-3 py-2 min-h-[48px] flex items-center">
                      <p className="text-sm leading-relaxed text-gray-700">
                        {item.segment}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="text-center mt-4">
              <p className="text-xs text-gray-400">Made with Tiny Tales ✨</p>
            </div>
          </div>
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
