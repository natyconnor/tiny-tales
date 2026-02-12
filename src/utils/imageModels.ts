import { DEFAULT_IMAGE_MODELS } from "../constants/story";

// Helper function to extract image model from a Pollinations URL
export const extractImageModelFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get("model") || null;
  } catch {
    return null;
  }
};

// Helper function to get display name for image model
export const getImageModelDisplayName = (modelId: string | null): string => {
  if (!modelId) return "Unknown";
  const model = DEFAULT_IMAGE_MODELS.find((item) => item.id === modelId);
  return model ? model.name : modelId;
};
