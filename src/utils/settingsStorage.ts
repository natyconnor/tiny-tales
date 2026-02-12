import { SETTINGS_STORAGE_KEY } from "../constants/story";

export type UserSettings = {
  maxLetters: number;
  model: string;
  imageModel: string;
  allCaps: boolean;
};

export const DEFAULT_SETTINGS: UserSettings = {
  maxLetters: 5,
  model: "openai",
  imageModel: "gptimage",
  allCaps: false,
};

export function loadSettings(): UserSettings {
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
