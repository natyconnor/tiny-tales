import { SETTINGS_STORAGE_KEY } from "../constants/story";

export type UserSettings = {
  maxLetters: number;
  model: string;
  imageModel: string;
  allCaps: boolean;
};

export const DEFAULT_SETTINGS: UserSettings = {
  maxLetters: 5,
  model: "google/gemini-2.5-flash-lite",
  imageModel: "bytedance/seedream-5.0-lite",
  allCaps: false,
};

const LEGACY_TEXT_MODEL_MAP: Record<string, string> = {
  "gemini-fast": "google/gemini-2.5-flash-lite",
  openai: "xiaomi/mimo-v2.6-flash",
  "openai-large": "alibaba/qwen3.7-flash",
  "openai/gpt-5.4-mini": "xiaomi/mimo-v2.6-flash",
  "openai/gpt-5.4": "alibaba/qwen3.7-flash",
  "openai/gpt-5.6-luna": "xiaomi/mimo-v2.6-flash",
  "google/gemini-3.1-flash-lite": "alibaba/qwen3.7-flash",
};

const LEGACY_IMAGE_MODEL_MAP: Record<string, string> = {
  "grok-imagine": "bytedance/seedream-5.0-lite",
  klein: "bytedance/seedream-5.0-lite",
  "qwen-image": "bytedance/seedream-5.0-lite",
  gptimage: "bytedance/seedream-5.0-lite",
  "gptimage-large": "bfl/flux-kontext-pro",
  "google/gemini-2.5-flash-image": "bytedance/seedream-5.0-lite",
  "bfl/flux-2-klein-4b": "bytedance/seedream-5.0-lite",
  "bfl/flux-2-flex": "bytedance/seedream-5.0-lite",
};

export function loadSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<UserSettings>;
      const model =
        (parsed.model && LEGACY_TEXT_MODEL_MAP[parsed.model]) ||
        parsed.model ||
        DEFAULT_SETTINGS.model;
      const imageModel =
        (parsed.imageModel && LEGACY_IMAGE_MODEL_MAP[parsed.imageModel]) ||
        parsed.imageModel ||
        DEFAULT_SETTINGS.imageModel;
      return { ...DEFAULT_SETTINGS, ...parsed, model, imageModel };
    }
  } catch {
    console.error("Failed to load settings from localStorage");
  }

  return DEFAULT_SETTINGS;
}
