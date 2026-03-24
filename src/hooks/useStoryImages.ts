import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
  type SyntheticEvent,
} from "react";

import {
  captureImageToDataUrl,
  captureLoadedImagesFromDom,
} from "../utils/imageCapture";
import { pushDebugEntry } from "./useDebugLog";

const IS_DEV = import.meta.env.DEV;

const IMAGE_RETRY_HINT_MS = 15000;
const IMAGE_SAFETY_REJECTION_PATTERNS = [
  /rejected by the safety system/i,
  /safety system/i,
  /content policy/i,
  /oai-support@microsoft\.com/i,
];

export const IMAGE_SAFETY_HINT =
  "Image generation was blocked by safety filters. Try a different image model or remove copyrighted/unsafe material.";

function isSafetySystemRejection(detail: string): boolean {
  return IMAGE_SAFETY_REJECTION_PATTERNS.some((pattern) =>
    pattern.test(detail)
  );
}

function extractRequestId(detail: string): string | null {
  const match = detail.match(/request id[:\s]+([a-z0-9-]{8,})/i);
  return match ? match[1] : null;
}

function toSafetyBlockedMessage(detail: string): string {
  const requestId = extractRequestId(detail);
  if (!requestId) return IMAGE_SAFETY_HINT;
  return `${IMAGE_SAFETY_HINT} Request ID: ${requestId}.`;
}

type UseStoryImagesOptions = {
  activeStoryId: string | null;
  onMarkStorySafetyBlocked?: (storyId: string, reason: string) => void;
};

type UseStoryImagesResult = {
  imageUrls: string[];
  setImageUrls: Dispatch<SetStateAction<string[]>>;
  imageDataUrls: string[];
  setImageDataUrls: Dispatch<SetStateAction<string[]>>;
  loadedImages: boolean[];
  failedImages: boolean[];
  slowImages: boolean[];
  blockedImages: boolean[];
  imageErrorMessages: Array<string | null>;
  displayImageUrls: Array<string | null>;
  storySafetyNotice: string | null;
  setStorySafetyNotice: Dispatch<SetStateAction<string | null>>;
  clearImageRequestResources: () => void;
  initializeImageStates: (count: number) => void;
  syncLoadedImagesFromDom: () => void;
  handleImageLoad: (
    index: number,
    event: SyntheticEvent<HTMLImageElement>
  ) => void;
  handleImageError: (index: number, url: string) => void;
  retryImage: (index: number) => void;
};

export function useStoryImages({
  activeStoryId,
  onMarkStorySafetyBlocked,
}: UseStoryImagesOptions): UseStoryImagesResult {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageDataUrls, setImageDataUrls] = useState<string[]>([]);
  const [loadedImages, setLoadedImages] = useState<boolean[]>([]);
  const [failedImages, setFailedImages] = useState<boolean[]>([]);
  const [slowImages, setSlowImages] = useState<boolean[]>([]);
  const [blockedImages, setBlockedImages] = useState<boolean[]>([]);
  const [imageErrorMessages, setImageErrorMessages] = useState<
    Array<string | null>
  >([]);
  const [displayImageUrls, setDisplayImageUrls] = useState<
    Array<string | null>
  >([]);
  const [isRequestingImages, setIsRequestingImages] = useState<boolean[]>([]);
  const [storySafetyNotice, setStorySafetyNotice] = useState<string | null>(
    null
  );

  const imageUrlsRef = useRef<string[]>([]);
  const pendingImageRequestsRef = useRef<Array<AbortController | null>>([]);
  const imageObjectUrlsRef = useRef<Array<string | null>>([]);

  const syncLoadedImagesFromDom = useCallback(() => {
    setImageDataUrls((prev) => {
      const { next, changed } = captureLoadedImagesFromDom(prev);
      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    imageUrlsRef.current = imageUrls;
  }, [imageUrls]);

  const revokeObjectUrl = useCallback((url: string | null | undefined) => {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  }, []);

  const clearImageRequestResources = useCallback(() => {
    pendingImageRequestsRef.current.forEach((controller) => {
      controller?.abort();
    });
    pendingImageRequestsRef.current = [];

    imageObjectUrlsRef.current.forEach((url) => {
      revokeObjectUrl(url);
    });
    imageObjectUrlsRef.current = [];
  }, [revokeObjectUrl]);

  const initializeImageStates = useCallback((count: number) => {
    setLoadedImages(new Array(count).fill(false));
    setFailedImages(new Array(count).fill(false));
    setSlowImages(new Array(count).fill(false));
    setBlockedImages(new Array(count).fill(false));
    setImageErrorMessages(new Array(count).fill(null));
    setDisplayImageUrls(new Array(count).fill(null));
    setIsRequestingImages(new Array(count).fill(false));
  }, []);

  useEffect(
    () => () => {
      clearImageRequestResources();
    },
    [clearImageRequestResources]
  );

  const handleImageLoad = useCallback(
    (index: number, event: SyntheticEvent<HTMLImageElement>) => {
      console.log(`Image ${index + 1} loaded successfully`);
      setLoadedImages((prev) => {
        const updated = [...prev];
        updated[index] = true;
        return updated;
      });
      setFailedImages((prev) => {
        const updated = [...prev];
        updated[index] = false;
        return updated;
      });
      setSlowImages((prev) => {
        const updated = [...prev];
        updated[index] = false;
        return updated;
      });
      setBlockedImages((prev) => {
        const updated = [...prev];
        updated[index] = false;
        return updated;
      });
      setImageErrorMessages((prev) => {
        const updated = [...prev];
        updated[index] = null;
        return updated;
      });
      setIsRequestingImages((prev) => {
        const updated = [...prev];
        updated[index] = false;
        return updated;
      });

      const img = event.currentTarget;
      const dataUrl = captureImageToDataUrl(img);
      if (!dataUrl) return;

      setImageDataUrls((prev) => {
        const updated = [...prev];
        updated[index] = dataUrl;
        return updated;
      });
    },
    []
  );

  const loadImageForSlot = useCallback(
    async (index: number, url: string) => {
      pendingImageRequestsRef.current[index]?.abort();

      const controller = new AbortController();
      pendingImageRequestsRef.current[index] = controller;
      const fetchStart = Date.now();

      setIsRequestingImages((prev) => {
        const updated = [...prev];
        updated[index] = true;
        return updated;
      });

      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (controller.signal.aborted || imageUrlsRef.current[index] !== url) {
          return;
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (response.ok && contentType.startsWith("image/")) {
          const imageBlob = await response.blob();
          if (controller.signal.aborted || imageUrlsRef.current[index] !== url) {
            return;
          }

          if (IS_DEV) {
            pushDebugEntry({
              type: "image",
              label: `Image ${index + 1}: loaded (${(imageBlob.size / 1024).toFixed(0)} KB)`,
              durationMs: Date.now() - fetchStart,
              request: { url, method: "GET" },
              response: { status: response.status, body: { contentType, sizeBytes: imageBlob.size } },
            });
          }

          const blobUrl = URL.createObjectURL(imageBlob);
          const previousBlobUrl = imageObjectUrlsRef.current[index];
          revokeObjectUrl(previousBlobUrl);
          imageObjectUrlsRef.current[index] = blobUrl;

          setDisplayImageUrls((prev) => {
            const updated = [...prev];
            updated[index] = blobUrl;
            return updated;
          });
          setFailedImages((prev) => {
            const updated = [...prev];
            updated[index] = false;
            return updated;
          });
          setSlowImages((prev) => {
            const updated = [...prev];
            updated[index] = false;
            return updated;
          });
          setBlockedImages((prev) => {
            const updated = [...prev];
            updated[index] = false;
            return updated;
          });
          setImageErrorMessages((prev) => {
            const updated = [...prev];
            updated[index] = null;
            return updated;
          });
          return;
        }

        let detail = "";
        let errorCode = "";
        if (contentType.includes("application/json")) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string; detail?: string; code?: string }
            | null;
          detail = [payload?.error, payload?.detail].filter(Boolean).join(" ");
          errorCode = payload?.code ?? "";
        } else {
          detail = (await response.text().catch(() => "")).slice(0, 500);
        }

        const fallback = `Image generation failed (${response.status}).`;
        const failureDetail = detail.trim() || fallback;
        const blockedBySafety = isSafetySystemRejection(failureDetail);
        let failureMessage: string;
        if (blockedBySafety) {
          failureMessage = toSafetyBlockedMessage(failureDetail);
        } else if (errorCode === "PAYMENT_REQUIRED") {
          failureMessage = "Out of pollen! Top up your balance at enter.pollinations.ai to continue generating images.";
        } else if (response.status >= 500) {
          failureMessage = "Image service had an error. You can retry this image.";
        } else {
          failureMessage = "Image could not be generated for this scene. You can retry this image.";
        }

        if (IS_DEV) {
          pushDebugEntry({
            type: "image",
            label: `Image ${index + 1}: ${blockedBySafety ? "BLOCKED" : "FAILED"} (${response.status})`,
            durationMs: Date.now() - fetchStart,
            request: { url, method: "GET" },
            response: { status: response.status, body: { detail: failureDetail, contentType } },
            error: failureMessage,
            meta: { blockedBySafety },
          });
        }

        const previousBlobUrl = imageObjectUrlsRef.current[index];
        revokeObjectUrl(previousBlobUrl);
        imageObjectUrlsRef.current[index] = null;

        setDisplayImageUrls((prev) => {
          const updated = [...prev];
          updated[index] = null;
          return updated;
        });
        setLoadedImages((prev) => {
          const updated = [...prev];
          updated[index] = false;
          return updated;
        });
        setFailedImages((prev) => {
          const updated = [...prev];
          updated[index] = true;
          return updated;
        });
        setSlowImages((prev) => {
          const updated = [...prev];
          updated[index] = true;
          return updated;
        });
        setBlockedImages((prev) => {
          const updated = [...prev];
          updated[index] = blockedBySafety;
          return updated;
        });
        setImageErrorMessages((prev) => {
          const updated = [...prev];
          updated[index] = failureMessage;
          return updated;
        });

        if (blockedBySafety) {
          setStorySafetyNotice(failureMessage);
          if (activeStoryId) {
            onMarkStorySafetyBlocked?.(activeStoryId, failureMessage);
          }
        }
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          return;
        }

        if (imageUrlsRef.current[index] !== url) {
          return;
        }

        if (IS_DEV) {
          pushDebugEntry({
            type: "image",
            label: `Image ${index + 1}: network error`,
            durationMs: Date.now() - fetchStart,
            request: { url, method: "GET" },
            error: error instanceof Error ? error.message : String(error),
          });
        }

        const previousBlobUrl = imageObjectUrlsRef.current[index];
        revokeObjectUrl(previousBlobUrl);
        imageObjectUrlsRef.current[index] = null;

        setDisplayImageUrls((prev) => {
          const updated = [...prev];
          updated[index] = null;
          return updated;
        });
        setLoadedImages((prev) => {
          const updated = [...prev];
          updated[index] = false;
          return updated;
        });
        setFailedImages((prev) => {
          const updated = [...prev];
          updated[index] = true;
          return updated;
        });
        setSlowImages((prev) => {
          const updated = [...prev];
          updated[index] = true;
          return updated;
        });
        setBlockedImages((prev) => {
          const updated = [...prev];
          updated[index] = false;
          return updated;
        });
        setImageErrorMessages((prev) => {
          const updated = [...prev];
          updated[index] = "Could not load this image. You can retry this image.";
          return updated;
        });
      } finally {
        if (pendingImageRequestsRef.current[index] === controller) {
          pendingImageRequestsRef.current[index] = null;
        }
        setIsRequestingImages((prev) => {
          const updated = [...prev];
          updated[index] = false;
          return updated;
        });
      }
    },
    [activeStoryId, onMarkStorySafetyBlocked, revokeObjectUrl]
  );

  const handleImageError = useCallback((index: number, url: string) => {
    console.error(`Image ${index + 1} failed to render`);
    console.error(`URL: ${url}`);
    setLoadedImages((prev) => {
      const updated = [...prev];
      updated[index] = false;
      return updated;
    });
    setFailedImages((prev) => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });
    setSlowImages((prev) => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });
    setBlockedImages((prev) => {
      const updated = [...prev];
      updated[index] = false;
      return updated;
    });
    setImageErrorMessages((prev) => {
      const updated = [...prev];
      updated[index] = "Image failed to render. You can retry this image.";
      return updated;
    });
  }, []);

  const retryImage = useCallback(
    (index: number) => {
      if (blockedImages[index]) {
        return;
      }

      pendingImageRequestsRef.current[index]?.abort();
      pendingImageRequestsRef.current[index] = null;

      const previousBlobUrl = imageObjectUrlsRef.current[index];
      revokeObjectUrl(previousBlobUrl);
      imageObjectUrlsRef.current[index] = null;

      setDisplayImageUrls((prev) => {
        const updated = [...prev];
        updated[index] = null;
        return updated;
      });
      setFailedImages((prev) => {
        const updated = [...prev];
        updated[index] = false;
        return updated;
      });
      setSlowImages((prev) => {
        const updated = [...prev];
        updated[index] = false;
        return updated;
      });
      setLoadedImages((prev) => {
        const updated = [...prev];
        updated[index] = false;
        return updated;
      });
      setBlockedImages((prev) => {
        const updated = [...prev];
        updated[index] = false;
        return updated;
      });
      setImageErrorMessages((prev) => {
        const updated = [...prev];
        updated[index] = null;
        return updated;
      });
      setIsRequestingImages((prev) => {
        const updated = [...prev];
        updated[index] = false;
        return updated;
      });
      setImageDataUrls((prev) => {
        const updated = [...prev];
        updated[index] = "";
        return updated;
      });
      setImageUrls((prev) => {
        const updated = [...prev];
        const original = updated[index];
        if (!original) return prev;
        const nextUrl = new URL(original, window.location.origin);
        nextUrl.searchParams.set("retry", Date.now().toString());
        updated[index] = `${nextUrl.pathname}${nextUrl.search}`;
        return updated;
      });
    },
    [blockedImages, revokeObjectUrl]
  );

  useEffect(() => {
    if (imageUrls.length === 0) return;

    imageUrls.forEach((url, index) => {
      if (!url) return;
      if (loadedImages[index] || failedImages[index] || blockedImages[index]) {
        return;
      }
      if (isRequestingImages[index] || displayImageUrls[index]) {
        return;
      }
      void loadImageForSlot(index, url);
    });
  }, [
    imageUrls,
    loadedImages,
    failedImages,
    blockedImages,
    isRequestingImages,
    displayImageUrls,
    loadImageForSlot,
  ]);

  useEffect(() => {
    if (imageUrls.length === 0) return;

    const timers: Array<ReturnType<typeof setTimeout>> = [];

    imageUrls.forEach((_, index) => {
      if (
        loadedImages[index] ||
        failedImages[index] ||
        blockedImages[index] ||
        displayImageUrls[index]
      ) {
        return;
      }

      const timer = setTimeout(() => {
        setSlowImages((prev) => {
          if (prev[index]) return prev;
          const updated = [...prev];
          updated[index] = true;
          return updated;
        });
      }, IMAGE_RETRY_HINT_MS);

      timers.push(timer);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [imageUrls, loadedImages, failedImages, blockedImages, displayImageUrls]);

  return {
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
  };
}
