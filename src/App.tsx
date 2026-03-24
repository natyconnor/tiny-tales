import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RotateCcw, Wand2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";

import { api } from "../convex/_generated/api";
import AppHeader from "./components/AppHeader";
import DebugPanel from "./components/DebugPanel";
import ExportPrintContainer from "./components/ExportPrintContainer";
import BookletPrintContainer from "./components/BookletPrintContainer";
import ExportPreviewModal from "./components/ExportPreviewModal";
import FloatingShapes from "./components/FloatingShapes";
import HistoryModal from "./components/HistoryModal";
import Tutorial from "./components/OnboardingTutorial";
import ReadingModeModal from "./components/ReadingModeModal";
import ShareModal from "./components/ShareModal";
import StoryDisplay from "./components/StoryDisplay";
import StoryForm from "./components/StoryForm";
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
import { MAX_STORED_STORIES, SETTINGS_STORAGE_KEY } from "./constants/story";
import type { ExportItem, Story } from "./types/story";
import { captureLoadedImagesFromDom } from "./utils/imageCapture";
import { renderExportCanvas } from "./utils/exportCanvas";
import { splitStoryIntoSegments } from "./utils/storySegments";
import { renderBookletDataUrl } from "./utils/bookletCanvas";
import { useDebugLog } from "./hooks/useDebugLog";
import { usePollinations } from "./hooks/usePollinations";
import { IMAGE_SAFETY_HINT, useStoryImages } from "./hooks/useStoryImages";
import { useStoryHistory } from "./hooks/useStoryHistory";
import { loadSettings, type UserSettings } from "./utils/settingsStorage";

const IS_DEV = import.meta.env.DEV;

function slugifyTopic(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

const STORY_GENERATION_SLOW_NOTICE_DELAY_MS = 15000;

function App() {
  const initialSettings = useMemo(() => loadSettings(), []);

  const shareId = useMemo(() => {
    const match = window.location.pathname.match(/^\/s\/([a-zA-Z0-9_-]+)$/);
    return match ? match[1] : null;
  }, []);

  const shareStoryMutation = useMutation(api.stories.share);
  const sharedStory = useQuery(
    api.stories.getByShortId,
    shareId ? { shortId: shareId } : "skip"
  );

  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [maxLetters, setMaxLetters] = useState(initialSettings.maxLetters);
  const [model, setModel] = useState(initialSettings.model);
  const [imageModel, setImageModel] = useState(initialSettings.imageModel);
  const [allCaps, setAllCaps] = useState(initialSettings.allCaps);
  const [story, setStory] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [exportPreviewUrl, setExportPreviewUrl] = useState<string | null>(null);
  const [bookletPreviewUrl, setBookletPreviewUrl] = useState<string | null>(
    null
  );
  const [showExportModal, setShowExportModal] = useState(false);
  const [showReadingMode, setShowReadingMode] = useState(false);
  const [readingModeIndex, setReadingModeIndex] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isLoadingShared, setIsLoadingShared] = useState(false);
  const [showSlowGenerationNotice, setShowSlowGenerationNotice] =
    useState(false);
  const [generationErrorMessage, setGenerationErrorMessage] = useState<
    string | null
  >(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);
  const storySectionRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollToStoryRef = useRef(false);
  const generationRequestIdRef = useRef(0);
  const generationAbortControllerRef = useRef<AbortController | null>(null);

  const {
    savedStories,
    activeStoryId,
    storageWarning,
    setActiveStoryId,
    saveStory,
    markSavedStorySafetyBlocked,
    clearHistory,
    deleteStory,
  } = useStoryHistory();

  const {
    imageUrls,
    setImageUrls,
    imageDataUrls,
    setImageDataUrls,
    loadedImages,
    failedImages,
    slowImages,
    blockedImages,
    imageErrorMessages,
    displayImageUrls,
    storySafetyNotice,
    setStorySafetyNotice,
    clearImageRequestResources,
    initializeImageStates,
    syncLoadedImagesFromDom,
    handleImageLoad,
    handleImageError,
    retryImage,
  } = useStoryImages({
    activeStoryId,
    onMarkStorySafetyBlocked: markSavedStorySafetyBlocked,
  });

  const {
    dropdownTextModels,
    dropdownImageModels,
    lockedImageModelIds,
    premiumShowcaseModels,
    pollinationsKeyStatus,
    pollinationsKeyError,
    pollinationsBalanceText,
    pollinationsUsageLoading,
    pollinationsEstimateSummary,
    pollinationsEstimateDetail,
    pollinationsUsageError,
    sharedBalanceEnabled,
    sharedBalanceText,
    sharedBalanceLoading,
    sharedBalanceError,
    usablePollinationsApiKey,
    refreshPollinationsUsage,
    connectPollinations,
  } = usePollinations({ model, imageModel, setModel, setImageModel });

  const debugLog = useDebugLog();

  const { showOnboarding, completeOnboarding } = useOnboarding();
  const {
    showPostStoryOnboarding,
    triggerPostStoryOnboarding,
    completePostStoryOnboarding,
  } = usePostStoryOnboarding();

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
  }, [allCaps, imageDataUrls, setImageDataUrls, story, title, topic]);

  const generateExportPreview = useCallback(async () => {
    try {
      const canvas = await renderExportCanvas({
        story,
        imageUrls,
        imageDataUrls,
        topic,
        title,
        allCaps,
      });
      setExportPreviewUrl(canvas.toDataURL("image/png"));
    } catch (previewError) {
      console.error("Failed to generate preview:", previewError);
    }
  }, [allCaps, imageDataUrls, imageUrls, story, title, topic]);

  const generateBookletPreview = useCallback(async () => {
    try {
      const dataUrl = await renderBookletDataUrl(buildBookletPayload());
      setBookletPreviewUrl(dataUrl);
    } catch (previewError) {
      console.error("Failed to generate booklet preview:", previewError);
    }
  }, [buildBookletPayload]);

  useEffect(() => {
    if (!story || imageUrls.length === 0) return;

    const capturedCount = imageDataUrls.filter(Boolean).length;
    if (capturedCount < imageUrls.length) return;
    if (exportPreviewUrl) return;

    void generateExportPreview();
  }, [
    story,
    imageUrls.length,
    imageDataUrls,
    exportPreviewUrl,
    generateExportPreview,
  ]);

  useEffect(() => {
    if (!story || imageUrls.length === 0) return;

    const capturedCount = imageDataUrls.filter(Boolean).length;
    if (capturedCount < imageUrls.length) return;

    setExportPreviewUrl(null);
    setBookletPreviewUrl(null);
  }, [allCaps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!story || imageUrls.length === 0) return;

    const capturedCount = imageDataUrls.filter(Boolean).length;
    if (capturedCount < imageUrls.length) return;
    if (bookletPreviewUrl) return;

    void generateBookletPreview();
  }, [
    story,
    imageUrls.length,
    imageDataUrls,
    bookletPreviewUrl,
    generateBookletPreview,
  ]);

  useEffect(() => {
    if (!story || imageUrls.length === 0) return;

    const capturedCount = imageDataUrls.filter(Boolean).length;
    if (capturedCount < imageUrls.length) return;

    triggerPostStoryOnboarding();
  }, [story, imageUrls.length, imageDataUrls, triggerPostStoryOnboarding]);

  useEffect(() => {
    if (isLoading || !story) return;
    if (!shouldAutoScrollToStoryRef.current) return;

    requestAnimationFrame(() => {
      storySectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    shouldAutoScrollToStoryRef.current = false;
  }, [isLoading, story]);

  useEffect(() => {
    if (!isLoading) {
      setShowSlowGenerationNotice(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowSlowGenerationNotice(true);
    }, STORY_GENERATION_SLOW_NOTICE_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isLoading]);

  useEffect(() => {
    document.body.dataset.bookletReady = bookletPreviewUrl ? "true" : "false";
  }, [bookletPreviewUrl]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const settings: UserSettings = { maxLetters, model, imageModel, allCaps };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [maxLetters, model, imageModel, allCaps]);

  useEffect(() => {
    if (!shareId) return;

    if (sharedStory === undefined) {
      setIsLoadingShared(true);
      return;
    }

    setIsLoadingShared(false);

    if (sharedStory === null) {
      setGenerationErrorMessage(null);
      setError("This story link has expired or doesn't exist.");
      return;
    }

    setTopic(sharedStory.topic);
    setTitle(sharedStory.title || sharedStory.topic);
    setMaxLetters(sharedStory.maxLetters);
    setStory(sharedStory.content);
    clearImageRequestResources();
    setImageUrls(sharedStory.imageUrls || []);
    initializeImageStates(sharedStory.imageUrls?.length || 0);
    setActiveStoryId(null);
    setStorySafetyNotice(null);
    setImageDataUrls([]);
    setExportPreviewUrl(null);
    setBookletPreviewUrl(null);
  }, [
    shareId,
    sharedStory,
    clearImageRequestResources,
    initializeImageStates,
    setActiveStoryId,
    setImageUrls,
    setImageDataUrls,
    setStorySafetyNotice,
  ]);

  const generateStory = async () => {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) return;

    const requestId = generationRequestIdRef.current + 1;
    generationRequestIdRef.current = requestId;
    generationAbortControllerRef.current?.abort();
    const controller = new AbortController();
    generationAbortControllerRef.current = controller;

    shouldAutoScrollToStoryRef.current = true;
    setShowSlowGenerationNotice(false);
    setGenerationErrorMessage(null);
    setIsLoading(true);
    setError("");
    setStory("");
    setTitle("");
    clearImageRequestResources();
    setImageUrls([]);
    initializeImageStates(0);
    setActiveStoryId(null);
    setStorySafetyNotice(null);
    setImageDataUrls([]);
    setExportPreviewUrl(null);
    setBookletPreviewUrl(null);

    try {
      const requestBody = {
        topic: trimmedTopic,
        maxLetters,
        model,
        imageModel,
        pollinationsApiKey: usablePollinationsApiKey,
      };
      const fetchStart = Date.now();

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        let userMessage = errorData.error || "Something went wrong";
        if (errorData.code === "PAYMENT_REQUIRED") {
          userMessage = "Out of pollen! Top up your balance at enter.pollinations.ai to continue generating stories.";
        } else if (errorData.code === "UNAUTHORIZED") {
          userMessage = "Your Pollinations API key is invalid or expired. Please reconnect your account.";
        }

        if (IS_DEV) {
          debugLog.push({
            type: "generate",
            label: `Generate: "${trimmedTopic}" — FAILED (${response.status})`,
            durationMs: Date.now() - fetchStart,
            request: { url: "/api/generate", method: "POST", body: requestBody },
            response: { status: response.status, body: errorData },
            error: errorData.error || `HTTP ${response.status}`,
          });
        }
        throw new Error(userMessage);
      }

      const data = await response.json();
      if (requestId !== generationRequestIdRef.current) return;

      if (IS_DEV) {
        debugLog.push({
          type: "generate",
          label: `Generate: "${trimmedTopic}"`,
          durationMs: Date.now() - fetchStart,
          request: { url: "/api/generate", method: "POST", body: requestBody },
          response: { status: response.status, body: data },
          meta: {
            storyLength: data.story?.length,
            imagePromptCount: data.imagePrompts?.length,
            model: data.debug?.model,
            imageModel: data.debug?.imageModel,
          },
        });
      }

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

      const storyTitle = data.title || trimmedTopic;
      const urls = data.imageUrls || [];

      setStory(data.story);
      setTitle(storyTitle);
      setImageUrls(urls);
      initializeImageStates(urls.length);

      const storyId = Date.now().toString();
      setActiveStoryId(storyId);
      saveStory({
        id: storyId,
        topic: trimmedTopic,
        title: storyTitle,
        maxLetters,
        model: data.debug?.model ?? model,
        imageModel: data.debug?.imageModel ?? imageModel,
        imageSafetyBlocked: false,
        content: data.story,
        imageUrls: urls,
        createdAt: Date.now(),
      });

      refreshPollinationsUsage();
    } catch (generationError) {
      if (requestId !== generationRequestIdRef.current) return;

      if (
        generationError instanceof DOMException &&
        generationError.name === "AbortError"
      ) {
        return;
      }

      shouldAutoScrollToStoryRef.current = false;
      const message =
        generationError instanceof Error
          ? generationError.message
          : "Oops! Our story wizard took a nap. Please try again! 🧙‍♂️💤";
      setError(message);
      setGenerationErrorMessage(message);
    } finally {
      if (generationAbortControllerRef.current === controller) {
        generationAbortControllerRef.current = null;
      }

      if (requestId === generationRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  const retryStoryGeneration = () => {
    generationAbortControllerRef.current?.abort();
    void generateStory();
  };

  const loadStory = (savedStory: Story) => {
    setTopic(savedStory.topic);
    setTitle(savedStory.title || savedStory.topic);
    setMaxLetters(savedStory.maxLetters);
    setStory(savedStory.content);
    clearImageRequestResources();
    setImageUrls(savedStory.imageUrls || []);
    initializeImageStates(savedStory.imageUrls?.length || 0);
    setActiveStoryId(savedStory.id);
    setStorySafetyNotice(
      savedStory.imageSafetyBlocked
        ? savedStory.imageSafetyReason || IMAGE_SAFETY_HINT
        : null
    );
    setImageDataUrls([]);
    setExportPreviewUrl(null);
    setBookletPreviewUrl(null);
    setShowHistory(false);

    setTimeout(() => {
      syncLoadedImagesFromDom();
    }, 0);
  };

  const downloadAsImage = async () => {
    setIsGeneratingImage(true);
    try {
      if (exportPreviewUrl) {
        setShowExportModal(true);
      } else {
        await generateExportPreview();
        setShowExportModal(true);
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const shareStory = async () => {
    if (!story) return;

    setIsSharing(true);
    try {
      const { shortId } = await shareStoryMutation({
        topic,
        title: title || topic,
        content: story,
        maxLetters,
        imageUrls,
      });

      const url = `${window.location.origin}/s/${shortId}`;
      setShareUrl(url);
      setShowShareModal(true);
    } catch (shareError) {
      console.error("Share error:", shareError);
      setGenerationErrorMessage(null);
      setError(
        shareError instanceof Error
          ? shareError.message
          : "Failed to create share link. Please try again."
      );
    } finally {
      setIsSharing(false);
    }
  };

  const openReadingMode = () => {
    setReadingModeIndex(0);
    setShowReadingMode(true);
  };

  const downloadMiniBook = async () => {
    const dataUrl = await renderBookletDataUrl(buildBookletPayload());
    setBookletPreviewUrl(dataUrl);
    const slug = slugifyTopic(topic);
    downloadDataUrl(dataUrl, `tiny-tale-${slug || "story"}-booklet.png`);
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
    const slug = slugifyTopic(topic);
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
            availableModels={dropdownTextModels}
            availableImageModels={dropdownImageModels}
            isLoading={isLoading}
            savedStoriesCount={savedStories.length}
            inputRef={inputRef}
            pollinationsStatus={pollinationsKeyStatus}
            pollinationsError={
              pollinationsKeyStatus === "invalid" ? pollinationsKeyError : ""
            }
            pollinationsBalanceText={pollinationsBalanceText}
            pollinationsEstimateLoading={pollinationsUsageLoading}
            pollinationsEstimateSummary={pollinationsEstimateSummary}
            pollinationsEstimateDetail={pollinationsEstimateDetail}
            pollinationsEstimateError={pollinationsUsageError}
            sharedBalanceEnabled={sharedBalanceEnabled}
            sharedBalanceText={sharedBalanceText}
            sharedBalanceLoading={sharedBalanceLoading}
            sharedBalanceError={sharedBalanceError}
            lockedImageModelIds={lockedImageModelIds}
            premiumShowcaseModels={premiumShowcaseModels}
            onTopicChange={setTopic}
            onMaxLettersChange={setMaxLetters}
            onModelChange={setModel}
            onImageModelChange={setImageModel}
            onGenerate={generateStory}
            onToggleHistory={() => setShowHistory((prev) => !prev)}
            onConnectPollinations={connectPollinations}
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
                {generationErrorMessage && (
                  <button
                    type="button"
                    onClick={retryStoryGeneration}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm font-semibold text-pink-600 shadow transition-colors hover:bg-white"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Retry story
                  </button>
                )}
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
            {(isLoading || isLoadingShared) && (
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
                      {isLoadingShared
                        ? "Loading shared story..."
                        : "Crafting your story..."}
                    </p>
                    <p className="text-gray-500 font-lexend">
                      {isLoadingShared
                        ? "Just a moment!"
                        : showSlowGenerationNotice
                        ? "AI generation can take awhile. We'll let you know if something goes wrong."
                        : "Our wizard is writing something special! ✨"}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div ref={storySectionRef} className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {story && !isLoading && (
              <StoryDisplay
                title={title || topic}
                story={story}
                imageUrls={imageUrls}
                displayImageUrls={displayImageUrls}
                loadedImages={loadedImages}
                failedImages={failedImages}
                slowImages={slowImages}
                blockedImages={blockedImages}
                imageErrorMessages={imageErrorMessages}
                policyWarning={storySafetyNotice}
                isGeneratingImage={isGeneratingImage}
                isSharing={isSharing}
                allCaps={allCaps}
                onImageLoad={handleImageLoad}
                onImageError={handleImageError}
                onRetryImage={retryImage}
                onDownloadImage={downloadAsImage}
                onGenerateAnother={generateStory}
                onOpenReadingMode={openReadingMode}
                onPrintMiniBook={downloadMiniBook}
                onShare={shareStory}
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
          {showShareModal && shareUrl && (
            <ShareModal
              shareUrl={shareUrl}
              onClose={() => setShowShareModal(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showReadingMode && imageUrls.length > 0 && (
            <ReadingModeModal
              imageUrls={imageUrls}
              displayImageUrls={displayImageUrls}
              loadedImages={loadedImages}
              failedImages={failedImages}
              blockedImages={blockedImages}
              imageErrorMessages={imageErrorMessages}
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
          <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <a
              href="https://github.com/natyconnor/tiny-tales"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-pink-500 transition-colors underline underline-offset-2"
            >
              View on GitHub
            </a>
            <span className="text-gray-300">·</span>
            <a
              href="https://nathanconnor.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-pink-500 transition-colors underline underline-offset-2"
            >
              Check out my other work
            </a>
            <span className="text-gray-300">·</span>
            <a
              href="https://pollinations.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-pink-500 transition-colors underline underline-offset-2"
              aria-label="Visit pollinations.ai"
            >
              Powered by pollinations.ai
            </a>
          </p>
        </motion.footer>
      </div>

      {IS_DEV && <DebugPanel />}
    </div>
  );
}

export default App;
