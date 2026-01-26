import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type SyntheticEvent,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wand2 } from "lucide-react";
import AppHeader from "./components/AppHeader";
import ExportPrintContainer from "./components/ExportPrintContainer";
import BookletPrintContainer from "./components/BookletPrintContainer";
import ExportPreviewModal from "./components/ExportPreviewModal";
import FloatingShapes from "./components/FloatingShapes";
import HistoryModal from "./components/HistoryModal";
import Tutorial from "./components/OnboardingTutorial";
import {
  INITIAL_TUTORIAL_STEPS,
  POST_STORY_TUTORIAL_STEPS,
} from "./constants/tutorial";
import {
  useOnboarding,
  usePostStoryOnboarding,
  ONBOARDING_KEY,
  POST_STORY_ONBOARDING_KEY,
} from "./hooks/useOnboarding";
import ReadingModeModal from "./components/ReadingModeModal";
import StoryDisplay from "./components/StoryDisplay";
import StoryForm from "./components/StoryForm";
import {
  MAX_STORED_STORIES,
  STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
} from "./constants/story";
import type { ExportItem, Story } from "./types/story";
import {
  captureImageToDataUrl,
  captureLoadedImagesFromDom,
} from "./utils/imageCapture";
import { renderExportCanvas } from "./utils/exportCanvas";
import { splitStoryIntoSegments } from "./utils/storySegments";
import { renderBookletDataUrl } from "./utils/bookletCanvas";

type UserSettings = {
  maxLetters: number;
  model: string;
  imageModel: string;
  allCaps: boolean;
};

const DEFAULT_SETTINGS: UserSettings = {
  maxLetters: 5,
  model: "gemini-2.5-flash-lite",
  imageModel: "gptimage",
  allCaps: false,
};

function loadSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<UserSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    console.error("Failed to load settings from localStorage");
  }
  return DEFAULT_SETTINGS;
}

function App() {
  const initialSettings = loadSettings();
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [maxLetters, setMaxLetters] = useState(initialSettings.maxLetters);
  const [model, setModel] = useState(initialSettings.model);
  const [imageModel, setImageModel] = useState(initialSettings.imageModel);
  const [allCaps, setAllCaps] = useState(initialSettings.allCaps);
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
  const [bookletPreviewUrl, setBookletPreviewUrl] = useState<string | null>(
    null
  );
  const [showExportModal, setShowExportModal] = useState(false);
  const [showReadingMode, setShowReadingMode] = useState(false);
  const [readingModeIndex, setReadingModeIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const {
    showPostStoryOnboarding,
    triggerPostStoryOnboarding,
    completePostStoryOnboarding,
  } = usePostStoryOnboarding();

  const syncLoadedImagesFromDom = useCallback(() => {
    setImageDataUrls((prev) => {
      const { next, changed } = captureLoadedImagesFromDom(prev);
      return changed ? next : prev;
    });
  }, []);

  const buildBookletPayload = useCallback(() => {
    const { next, changed } = captureLoadedImagesFromDom(imageDataUrls);
    if (changed) {
      setImageDataUrls(next);
    }
    const paddedImages: Array<string | undefined> = [...next];
    while (paddedImages.length < 4) {
      paddedImages.push(undefined);
    }
    const segments = splitStoryIntoSegments(story, 4);
    while (segments.length < 4) {
      segments.push("");
    }
    return {
      topic: title || topic,
      imageDataUrls: paddedImages,
      segments,
      allCaps,
    };
  }, [imageDataUrls, story, title, topic, allCaps]);

  // Auto-generate export preview when all images are loaded
  const generateExportPreview = useCallback(async () => {
    try {
      const canvas = await renderExportCanvas({
        story,
        imageUrls,
        imageDataUrls,
        topic,
        allCaps,
      });
      setExportPreviewUrl(canvas.toDataURL("image/png"));
    } catch (error) {
      console.error("Failed to generate preview:", error);
    }
  }, [story, imageUrls, imageDataUrls, topic, allCaps]);

  const generateBookletPreview = useCallback(async () => {
    try {
      const dataUrl = await renderBookletDataUrl(buildBookletPayload());
      setBookletPreviewUrl(dataUrl);
    } catch (error) {
      console.error("Failed to generate booklet preview:", error);
    }
  }, [buildBookletPayload]);

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

  // Regenerate previews when allCaps changes
  useEffect(() => {
    if (!story || imageUrls.length === 0) return;

    const capturedCount = imageDataUrls.filter(Boolean).length;
    if (capturedCount < imageUrls.length) return;

    // Clear existing previews so they regenerate with new allCaps setting
    setExportPreviewUrl(null);
    setBookletPreviewUrl(null);
  }, [allCaps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!story || imageUrls.length === 0) return;

    const capturedCount = imageDataUrls.filter(Boolean).length;
    if (capturedCount < imageUrls.length) return;

    if (bookletPreviewUrl) return;

    generateBookletPreview();
  }, [
    story,
    imageUrls.length,
    imageDataUrls,
    bookletPreviewUrl,
    generateBookletPreview,
  ]);

  // Trigger post-story tutorial when first story is fully loaded
  useEffect(() => {
    if (!story || imageUrls.length === 0) return;

    const capturedCount = imageDataUrls.filter(Boolean).length;
    if (capturedCount < imageUrls.length) return;

    // All images loaded - trigger post-story onboarding
    triggerPostStoryOnboarding();
  }, [story, imageUrls.length, imageDataUrls, triggerPostStoryOnboarding]);

  useEffect(() => {
    document.body.dataset.bookletReady = bookletPreviewUrl ? "true" : "false";
  }, [bookletPreviewUrl]);

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

  // Save user settings to localStorage when they change
  useEffect(() => {
    const settings: UserSettings = { maxLetters, model, imageModel, allCaps };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [maxLetters, model, imageModel, allCaps]);

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
    setTitle("");
    setImageUrls([]);
    setLoadedImages([]);
    setImageDataUrls([]);
    setExportPreviewUrl(null);
    setBookletPreviewUrl(null);

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

      const storyTitle = data.title || topic.trim();
      setStory(data.story);
      setTitle(storyTitle);

      // Set image URLs and initialize loading state
      const urls = data.imageUrls || [];
      setImageUrls(urls);
      setLoadedImages(new Array(urls.length).fill(false));

      // Save to history
      saveStory({
        id: Date.now().toString(),
        topic: topic.trim(),
        title: storyTitle,
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

  const deleteStory = useCallback((storyId: string) => {
    setSavedStories((prev) => {
      const updated = prev.filter((story) => story.id !== storyId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const loadStory = (savedStory: Story) => {
    setTopic(savedStory.topic);
    setTitle(savedStory.title || savedStory.topic);
    setMaxLetters(savedStory.maxLetters);
    setStory(savedStory.content);
    setImageUrls(savedStory.imageUrls || []);
    setLoadedImages(new Array(savedStory.imageUrls?.length || 0).fill(false));
    setImageDataUrls([]);
    setExportPreviewUrl(null);
    setBookletPreviewUrl(null);
    setShowHistory(false);

    // Capture any cached images that may already be in the DOM
    setTimeout(() => {
      syncLoadedImagesFromDom();
    }, 0);
  };

  const downloadAsImage = async () => {
    setIsGeneratingImage(true);
    try {
      // If we already have a preview, just show the modal
      if (exportPreviewUrl) {
        setShowExportModal(true);
      } else {
        // Generate the preview first, then show modal
        await generateExportPreview();
        setShowExportModal(true);
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const openReadingMode = () => {
    setReadingModeIndex(0);
    setShowReadingMode(true);
  };

  const getBookletFileName = () => {
    const slug = topic
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `tiny-tale-${slug || "story"}-booklet.png`;
  };

  const downloadDataUrl = (dataUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadMiniBook = async () => {
    const dataUrl = await renderBookletDataUrl(buildBookletPayload());
    setBookletPreviewUrl(dataUrl);
    downloadDataUrl(dataUrl, getBookletFileName());
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

        {/* Form section - narrower width */}
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

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-center"
              >
                <p className="text-red-600 font-medium font-lexend">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {storageWarning && (
              <motion.div
                key="warning"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center"
              >
                <p className="text-amber-700 font-medium font-lexend">
                  ⚠️ Story saved! Your oldest story was removed to make room.
                </p>
                <p className="text-xs text-amber-600 font-lexend mt-1">
                  (You can keep up to {MAX_STORED_STORIES} stories in your
                  history)
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="mt-8 text-center"
              >
                <div className="inline-flex items-center gap-4 p-6 bg-white/80 rounded-3xl shadow-lg border-2 border-pink-200">
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Story section - wider width for 2-column layout */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {story && !isLoading && (
              <StoryDisplay
                story={story}
                imageUrls={imageUrls}
                loadedImages={loadedImages}
                isGeneratingImage={isGeneratingImage}
                allCaps={allCaps}
                onImageLoad={handleImageLoad}
                onImageError={handleImageError}
                onDownloadImage={downloadAsImage}
                onGenerateAnother={generateStory}
                onOpenReadingMode={openReadingMode}
                onPrintMiniBook={downloadMiniBook}
                onAllCapsChange={setAllCaps}
              />
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showHistory && (
            <HistoryModal
              savedStories={savedStories}
              onClose={() => setShowHistory(false)}
              onLoadStory={loadStory}
              onDeleteStory={deleteStory}
              onClearHistory={clearHistory}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showExportModal && exportPreviewUrl && (
            <ExportPreviewModal
              previewUrl={exportPreviewUrl}
              fileName={exportFileName}
              onClose={() => setShowExportModal(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showReadingMode && imageUrls.length > 0 && (
            <ReadingModeModal
              imageUrls={imageUrls}
              segments={exportSegments}
              currentIndex={readingModeIndex}
              allCaps={allCaps}
              onIndexChange={setReadingModeIndex}
              onClose={() => setShowReadingMode(false)}
            />
          )}
        </AnimatePresence>

        <ExportPrintContainer
          topic={topic}
          exportItems={exportItems}
          printContainerRef={printContainerRef}
        />
        <BookletPrintContainer bookletPreviewUrl={bookletPreviewUrl} />

        <AnimatePresence>
          {showOnboarding && (
            <Tutorial
              steps={INITIAL_TUTORIAL_STEPS}
              storageKey={ONBOARDING_KEY}
              onComplete={completeOnboarding}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPostStoryOnboarding && (
            <Tutorial
              steps={POST_STORY_TUTORIAL_STEPS}
              storageKey={POST_STORY_ONBOARDING_KEY}
              onComplete={completePostStoryOnboarding}
            />
          )}
        </AnimatePresence>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-12 text-gray-500 font-lexend no-print"
        >
          <p>Made with ❤️ for little readers everywhere</p>
        </motion.footer>
      </div>
    </div>
  );
}

export default App;
