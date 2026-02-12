import { useCallback, useEffect, useState } from "react";

import {
  MAX_STORED_STORIES,
  STORAGE_KEY,
} from "../constants/story";
import type { Story } from "../types/story";

type UseStoryHistoryResult = {
  savedStories: Story[];
  activeStoryId: string | null;
  storageWarning: boolean;
  setActiveStoryId: (storyId: string | null) => void;
  saveStory: (story: Story) => void;
  markSavedStorySafetyBlocked: (storyId: string, reason: string) => void;
  clearHistory: () => void;
  deleteStory: (storyId: string) => void;
};

export function useStoryHistory(): UseStoryHistoryResult {
  const [savedStories, setSavedStories] = useState<Story[]>([]);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      setSavedStories(JSON.parse(stored));
    } catch {
      console.error("Failed to parse stored stories");
    }
  }, []);

  const saveStory = useCallback((newStory: Story) => {
    setSavedStories((prev) => {
      const wasAtLimit = prev.length >= MAX_STORED_STORIES;
      const updated = [newStory, ...prev].slice(0, MAX_STORED_STORIES);

      if (wasAtLimit) {
        setStorageWarning(true);
        setTimeout(() => setStorageWarning(false), 5000);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const markSavedStorySafetyBlocked = useCallback(
    (storyId: string, reason: string) => {
      setSavedStories((prev) => {
        let changed = false;
        const updated = prev.map((saved) => {
          if (saved.id !== storyId) return saved;
          changed = true;
          return {
            ...saved,
            imageSafetyBlocked: true,
            imageSafetyReason: reason,
          };
        });

        if (changed) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }

        return updated;
      });
    },
    []
  );

  const clearHistory = useCallback(() => {
    setSavedStories([]);
    setActiveStoryId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const deleteStory = useCallback((storyId: string) => {
    setSavedStories((prev) => {
      const updated = prev.filter((story) => story.id !== storyId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setActiveStoryId((prev) => (prev === storyId ? null : prev));
  }, []);

  return {
    savedStories,
    activeStoryId,
    storageWarning,
    setActiveStoryId,
    saveStory,
    markSavedStorySafetyBlocked,
    clearHistory,
    deleteStory,
  };
}
