import { useState, useEffect, useCallback } from "react";

export const ONBOARDING_KEY = "tiny-tales-onboarding-complete";
export const POST_STORY_ONBOARDING_KEY = "tiny-tales-post-story-onboarding-complete";

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      // Small delay to let the form render first
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeOnboarding = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY);
    setShowOnboarding(true);
  }, []);

  return {
    showOnboarding,
    completeOnboarding,
    resetOnboarding,
  };
}

export function usePostStoryOnboarding() {
  const [showPostStoryOnboarding, setShowPostStoryOnboarding] = useState(false);

  const triggerPostStoryOnboarding = useCallback(() => {
    // Only show if user hasn't seen it yet
    const completed = localStorage.getItem(POST_STORY_ONBOARDING_KEY);
    if (!completed) {
      // Small delay to let the UI settle after story generation
      setTimeout(() => setShowPostStoryOnboarding(true), 800);
    }
  }, []);

  const completePostStoryOnboarding = useCallback(() => {
    setShowPostStoryOnboarding(false);
  }, []);

  return {
    showPostStoryOnboarding,
    triggerPostStoryOnboarding,
    completePostStoryOnboarding,
  };
}
