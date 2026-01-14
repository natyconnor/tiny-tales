import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type SyntheticEvent,
} from "react";
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
  const [exportPreviewUrl, setExportPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);

  const captureImageToDataUrl = (img: HTMLImageElement): string | null => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL("image/png");
    } catch (err) {
      console.warn("Could not capture image for export:", err);
      return null;
    }
  };

  const captureLoadedImagesFromDom = useCallback(() => {
    const images = Array.from(
      document.querySelectorAll<HTMLImageElement>("[data-story-image]")
    );

    if (images.length === 0) return;

    setImageDataUrls((prev) => {
      const updated = [...prev];
      let changed = false;

      images.forEach((img) => {
        const index = Number(img.dataset.index);
        if (Number.isNaN(index)) return;
        if (!img.complete || img.naturalWidth === 0) return;
        if (updated[index]) return;

        const dataUrl = captureImageToDataUrl(img);
        if (dataUrl) {
          updated[index] = dataUrl;
          changed = true;
        }
      });

      return changed ? updated : prev;
    });
  }, []);

  const loadImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = dataUrl;
    });
  };

  const wrapTextLines = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const width = ctx.measureText(test).width;
      if (width <= maxWidth || !current) {
        current = test;
      } else {
        lines.push(current);
        current = word;
      }
    }

    if (current) {
      lines.push(current);
    }

    return lines;
  };

  const splitStoryIntoSegments = useCallback(
    (text: string, numSegments: number): string[] => {
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      const segments: string[] = [];
      const sentencesPerSegment = Math.ceil(sentences.length / numSegments);

      for (let i = 0; i < numSegments; i += 1) {
        const start = i * sentencesPerSegment;
        const end = start + sentencesPerSegment;
        const segment = sentences.slice(start, end).join(" ").trim();
        if (segment) {
          segments.push(segment);
        }
      }

      return segments;
    },
    []
  );

  const renderExportCanvas =
    useCallback(async (): Promise<HTMLCanvasElement> => {
      const segments = splitStoryIntoSegments(
        story,
        Math.max(imageUrls.length, 1)
      );
      const items = imageUrls.map((_, index) => ({
        dataUrl: imageDataUrls[index],
        segment: segments[index] || "",
      }));

      const canvasWidth = 600;
      const padding = 24;
      const gap = 12;
      const columns = items.length === 1 ? 1 : 2;
      const innerWidth = canvasWidth - padding * 2;
      const cardWidth = (innerWidth - gap * (columns - 1)) / columns;
      const imageSize = cardWidth;

      const titleFont = '700 28px "Comic Neue", cursive';
      const subtitleFont = '500 12px "Lexend", sans-serif';
      const textFont = '500 13px "Lexend", sans-serif';
      const lineHeight = 18;
      const textPadX = 12;
      const textPadY = 10;
      const minTextHeight = 44;

      if ("fonts" in document && document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {
          // Ignore font loading failures
        }
      }

      const measureCanvas = document.createElement("canvas");
      const measureCtx = measureCanvas.getContext("2d");
      if (!measureCtx) {
        throw new Error("Unable to create canvas context");
      }

      measureCtx.font = textFont;
      const textLayouts = items.map((item) => {
        const lines = wrapTextLines(
          measureCtx,
          item.segment,
          cardWidth - textPadX * 2
        );
        const height = Math.max(
          minTextHeight,
          lines.length * lineHeight + textPadY * 2
        );
        return { lines, height };
      });

      const rowTextHeights: number[] = [];
      for (let row = 0; row < Math.ceil(items.length / columns); row += 1) {
        const start = row * columns;
        const end = start + columns;
        const rowItems = textLayouts.slice(start, end);
        rowTextHeights.push(
          rowItems.reduce(
            (max, item) => Math.max(max, item.height),
            minTextHeight
          )
        );
      }

      const topBarHeight = 6;
      const headerGap = 12;
      const titleHeight = 32;
      const subtitleHeight = 16;
      const gridTop =
        padding + topBarHeight + headerGap + titleHeight + subtitleHeight + 8;

      const gridHeight = rowTextHeights.reduce((total, rowHeight, rowIndex) => {
        const rowCardHeight = imageSize + rowHeight;
        return (
          total +
          rowCardHeight +
          (rowIndex < rowTextHeights.length - 1 ? gap : 0)
        );
      }, 0);

      const footerHeight = 16;
      const canvasHeight = gridTop + gridHeight + 16 + footerHeight + padding;

      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth * 2;
      canvas.height = canvasHeight * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Unable to create canvas context");
      }

      const drawRoundedRect = (
        rectCtx: CanvasRenderingContext2D,
        x: number,
        yPos: number,
        width: number,
        height: number,
        radius: number
      ) => {
        const r = Math.min(radius, width / 2, height / 2);
        rectCtx.beginPath();
        rectCtx.moveTo(x + r, yPos);
        rectCtx.lineTo(x + width - r, yPos);
        rectCtx.quadraticCurveTo(x + width, yPos, x + width, yPos + r);
        rectCtx.lineTo(x + width, yPos + height - r);
        rectCtx.quadraticCurveTo(
          x + width,
          yPos + height,
          x + width - r,
          yPos + height
        );
        rectCtx.lineTo(x + r, yPos + height);
        rectCtx.quadraticCurveTo(x, yPos + height, x, yPos + height - r);
        rectCtx.lineTo(x, yPos + r);
        rectCtx.quadraticCurveTo(x, yPos, x + r, yPos);
        rectCtx.closePath();
      };

      const drawRoundedTopRect = (
        rectCtx: CanvasRenderingContext2D,
        x: number,
        yPos: number,
        width: number,
        height: number,
        radius: number
      ) => {
        const r = Math.min(radius, width / 2, height / 2);
        rectCtx.beginPath();
        rectCtx.moveTo(x + r, yPos);
        rectCtx.lineTo(x + width - r, yPos);
        rectCtx.quadraticCurveTo(x + width, yPos, x + width, yPos + r);
        rectCtx.lineTo(x + width, yPos + height);
        rectCtx.lineTo(x, yPos + height);
        rectCtx.lineTo(x, yPos + r);
        rectCtx.quadraticCurveTo(x, yPos, x + r, yPos);
        rectCtx.closePath();
      };

      ctx.scale(2, 2);

      const background = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      background.addColorStop(0, "#FFFBEB");
      background.addColorStop(1, "#FCE7F3");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      const barGradient = ctx.createLinearGradient(
        padding,
        0,
        canvasWidth - padding,
        0
      );
      barGradient.addColorStop(0, "#F472B6");
      barGradient.addColorStop(1, "#8B5CF6");
      ctx.fillStyle = barGradient;
      drawRoundedRect(ctx, padding, padding, innerWidth, topBarHeight, 4);
      ctx.fill();

      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#7C3AED";
      ctx.font = titleFont;
      ctx.fillText("Tiny Tales", canvasWidth / 2, padding + topBarHeight + 6);

      ctx.font = subtitleFont;
      const subtitleY = padding + topBarHeight + 6 + titleHeight - 6;
      const label = "A story about:";
      const labelWidth = ctx.measureText(label).width;
      const topicWidth = ctx.measureText(topic).width;
      const totalWidth = labelWidth + 6 + topicWidth;
      const startX = (canvasWidth - totalWidth) / 2;
      ctx.textAlign = "left";
      ctx.fillStyle = "#6B7280";
      ctx.fillText(label, startX, subtitleY);
      ctx.fillStyle = "#EC4899";
      ctx.fillText(topic, startX + labelWidth + 6, subtitleY);

      let y = gridTop;

      const images = await Promise.all(
        items.map((item) =>
          item.dataUrl
            ? loadImageFromDataUrl(item.dataUrl)
            : Promise.resolve(null)
        )
      );

      for (let row = 0; row < rowTextHeights.length; row += 1) {
        const rowTextHeight = rowTextHeights[row];
        const rowHeight = imageSize + rowTextHeight;

        for (let col = 0; col < columns; col += 1) {
          const index = row * columns + col;
          if (!items[index]) continue;

          const x = padding + col * (cardWidth + gap);
          const layout = textLayouts[index];
          const img = images[index];

          ctx.save();
          drawRoundedRect(ctx, x, y, cardWidth, rowHeight, 12);
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#FACC15";
          ctx.stroke();
          ctx.restore();

          ctx.save();
          drawRoundedTopRect(ctx, x, y, cardWidth, imageSize, 12);
          ctx.clip();

          if (img) {
            const scale = Math.min(
              imageSize / img.width,
              imageSize / img.height
            );
            const drawWidth = img.width * scale;
            const drawHeight = img.height * scale;
            const dx = x + (imageSize - drawWidth) / 2;
            const dy = y + (imageSize - drawHeight) / 2;
            ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
          } else {
            ctx.fillStyle = "#FEF3C7";
            ctx.fillRect(x, y, imageSize, imageSize);
          }
          ctx.restore();

          ctx.beginPath();
          ctx.moveTo(x, y + imageSize);
          ctx.lineTo(x + cardWidth, y + imageSize);
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#FACC15";
          ctx.stroke();

          ctx.font = textFont;
          ctx.fillStyle = "#374151";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";

          const lines = layout.lines;
          const textHeight = lines.length * lineHeight;
          const textY = y + imageSize + (rowTextHeight - textHeight) / 2;
          lines.forEach((line, lineIndex) => {
            ctx.fillText(
              line,
              x + cardWidth / 2,
              textY + lineIndex * lineHeight
            );
          });
        }

        y += rowHeight + (row < rowTextHeights.length - 1 ? gap : 0);
      }

      ctx.font = subtitleFont;
      ctx.fillStyle = "#9CA3AF";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("Made with Tiny Tales ✨", canvasWidth / 2, y + 16);

      return canvas;
    }, [story, imageUrls, imageDataUrls, topic, splitStoryIntoSegments]);

  // Auto-generate export preview when all images are loaded
  const generateExportPreview = useCallback(async () => {
    try {
      const canvas = await renderExportCanvas();
      setExportPreviewUrl(canvas.toDataURL("image/png"));
    } catch (error) {
      console.error("Failed to generate preview:", error);
    }
  }, [renderExportCanvas]);

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
    setExportPreviewUrl(null);
    setShowHistory(false);

    // Capture any cached images that may already be in the DOM
    setTimeout(() => {
      captureLoadedImagesFromDom();
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
                          data-story-image
                          data-index={index}
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

              {exportPreviewUrl && (
                <div className="mt-6 bg-white rounded-3xl shadow-xl p-4 border-4 border-yellow-300">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-700 font-comic">
                      🖼️ Export Preview
                    </h3>
                    <a
                      href={exportPreviewUrl}
                      download={exportFileName}
                      className="px-3 py-1.5 bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded-lg text-sm font-lexend transition-colors"
                    >
                      Download PNG
                    </a>
                  </div>
                  <img
                    src={exportPreviewUrl}
                    alt="Export preview"
                    className="w-full rounded-2xl border-2 border-yellow-200"
                  />
                </div>
              )}

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

        {/* Print Container for Image Export (hidden) */}
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
                className={`grid gap-3 mb-4 items-start ${
                  exportItems.length === 1 ? "grid-cols-1" : "grid-cols-2"
                }`}
              >
                {exportItems.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border-2 border-yellow-300 bg-white overflow-hidden"
                  >
                    <div className="aspect-square bg-amber-50">
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
                    <div className="border-t-2 border-yellow-300 px-3 py-4 text-center bg-white">
                      <p className="text-sm leading-snug text-gray-700">
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
