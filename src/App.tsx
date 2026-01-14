import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type SyntheticEvent,
} from "react";
import { Wand2 } from "lucide-react";
import AppHeader from "./components/AppHeader";
import ExportPrintContainer from "./components/ExportPrintContainer";
import FloatingShapes from "./components/FloatingShapes";
import HistoryModal from "./components/HistoryModal";
import StoryDisplay from "./components/StoryDisplay";
import StoryForm from "./components/StoryForm";
import { MAX_STORED_STORIES, STORAGE_KEY } from "./constants/story";
import type { ExportItem, Story } from "./types/story";
import {
  captureImageToDataUrl,
  captureLoadedImagesFromDom,
} from "./utils/imageCapture";
import { renderExportCanvas } from "./utils/exportCanvas";
import { splitStoryIntoSegments } from "./utils/storySegments";

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
  const [exportPreviewUrl, setExportPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);

  const syncLoadedImagesFromDom = useCallback(() => {
    setImageDataUrls((prev) => {
      const { next, changed } = captureLoadedImagesFromDom(prev);
      return changed ? next : prev;
    });
  }, []);

  // Auto-generate export preview when all images are loaded
  const generateExportPreview = useCallback(async () => {
    try {
      const canvas = await renderExportCanvas({
        story,
        imageUrls,
        imageDataUrls,
        topic,
      });
      setExportPreviewUrl(canvas.toDataURL("image/png"));
    } catch (error) {
      console.error("Failed to generate preview:", error);
    }
  }, [story, imageUrls, imageDataUrls, topic]);

  // Auto-generate preview when all images are captured
  useEffect(() => {
    if (!story || imageUrls.length === 0) return;

    const capturedCount = imageDataUrls.filter(Boolean).length;
    if (capturedCount < imageUrls.length) return;

    if (exportPreviewUrl) return;

    generateExportPreview();
  }, [
    story,
    imageUrls.length,
    imageDataUrls,
    exportPreviewUrl,
    generateExportPreview,
  ]);

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
    setExportPreviewUrl(null);

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
    const dataUrl = captureImageToDataUrl(img);
    if (!dataUrl) return;

    setImageDataUrls((prev) => {
      const updated = [...prev];
      updated[index] = dataUrl;
      return updated;
    });
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
    setImageDataUrls([]);
    setExportPreviewUrl(null);
    setShowHistory(false);

    // Capture any cached images that may already be in the DOM
    setTimeout(() => {
      syncLoadedImagesFromDom();
    }, 0);
  };

  const downloadAsImage = async () => {
    setIsGeneratingImage(true);
    try {
      await generateExportPreview();
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const exportSegments = splitStoryIntoSegments(
    story,
    Math.max(imageUrls.length, 1)
  );
  const exportItems: ExportItem[] = imageUrls.map((_, index) => ({
    dataUrl: imageDataUrls[index],
    segment: exportSegments[index] || "",
  }));
  const exportFileName = (() => {
    const slug = topic
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `tiny-tale${slug ? `-${slug}` : ""}.png`;
  })();

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingShapes />

      <div className="container mx-auto px-4 py-8 relative z-10">
        <AppHeader />

        <div className="max-w-2xl mx-auto">
          <StoryForm
            topic={topic}
            maxLetters={maxLetters}
            model={model}
            imageModel={imageModel}
            isLoading={isLoading}
            savedStoriesCount={savedStories.length}
            inputRef={inputRef}
            onTopicChange={setTopic}
            onMaxLettersChange={setMaxLetters}
            onModelChange={setModel}
            onImageModelChange={setImageModel}
            onGenerate={generateStory}
            onToggleHistory={() => setShowHistory((prev) => !prev)}
          />

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-center">
              <p className="text-red-600 font-medium font-lexend">{error}</p>
            </div>
          )}

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

          {story && !isLoading && (
            <StoryDisplay
              story={story}
              imageUrls={imageUrls}
              loadedImages={loadedImages}
              isGeneratingImage={isGeneratingImage}
              exportPreviewUrl={exportPreviewUrl}
              exportFileName={exportFileName}
              onImageLoad={handleImageLoad}
              onImageError={handleImageError}
              onDownloadImage={downloadAsImage}
              onGenerateAnother={generateStory}
            />
          )}

          {showHistory && (
            <HistoryModal
              savedStories={savedStories}
              onClose={() => setShowHistory(false)}
              onLoadStory={loadStory}
              onClearHistory={clearHistory}
            />
          )}
        </div>

        <ExportPrintContainer
          topic={topic}
          exportItems={exportItems}
          printContainerRef={printContainerRef}
        />

        <footer className="text-center mt-12 text-gray-500 font-lexend no-print">
          <p>Made with ❤️ for little readers everywhere</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
