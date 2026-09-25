import { DEFAULT_IMAGE_MODELS } from "../constants/story";

/** Best-effort model id from a proxied image URL (legacy Pollinations or token URLs). */
export const extractImageModelFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url, window.location.origin);
    const direct = urlObj.searchParams.get("model");
    if (direct) return direct;

    const token = urlObj.searchParams.get("token");
    if (!token) return null;
    const encoded = token.split(".")[0];
    if (!encoded) return null;
    const json = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(json) as { model?: string };
    return typeof parsed.model === "string" ? parsed.model : null;
  } catch {
    return null;
  }
};

const HISTORICAL_IMAGE_MODEL_NAMES: Record<string, string> = {
  "bfl/flux-2-klein-4b": "FLUX.2 Klein",
  "bfl/flux-2-flex": "FLUX.2 Flex",
};

export const getImageModelDisplayName = (modelId: string | null): string => {
  if (!modelId) return "Unknown";
  const model = DEFAULT_IMAGE_MODELS.find((item) => item.id === modelId);
  if (model) return model.name;
  return HISTORICAL_IMAGE_MODEL_NAMES[modelId] ?? modelId;
};
