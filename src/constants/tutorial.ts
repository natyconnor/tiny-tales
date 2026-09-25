export type TutorialStep = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  targetSelector?: string; // Optional - if not provided, shows centered modal
  position: "top" | "bottom" | "center";
};

export const INITIAL_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Tiny Tales!",
    description:
      "Create magical stories for little readers! Can your child only read words with 3 or 4 letters? No problem! Our AI writes unique tales with simple words perfect for early readers, then illustrates them with beautiful pictures.  Ready to make some magic?",
    emoji: "📚",
    position: "center",
  },
  {
    id: "prompt",
    title: "What's Your Story About?",
    description:
      "Type anything you'd like your story to be about! Keep the characters simple at lower letter limits — the plot can be as rich as you like. Click the lightbulb for ideas.",
    emoji: "🌟",
    targetSelector: "[data-tutorial='prompt']",
    position: "bottom",
  },
  {
    id: "word-length",
    title: "Choose Your Reading Level",
    description:
      "Slide to pick the maximum letters per word. Smaller numbers (3-4) use short, simple sounds like cat and frog. Bigger numbers (6-8) add blends and longer words for confident readers!",
    emoji: "📏",
    targetSelector: "[data-tutorial='word-length']",
    position: "bottom",
  },
  {
    id: "story-ai",
    title: "Pick Your Story Writer",
    description:
      "Choose which AI model writes your story. Each has its own style — some are faster, others more creative. Try different ones to find your favorite storyteller!",
    emoji: "🤖",
    targetSelector: "[data-tutorial='story-ai']",
    position: "bottom",
  },
  {
    id: "image-ai",
    title: "Choose Your Illustrator",
    description:
      "Select which AI creates the pictures for your story. Each story gets 4 beautiful images!",
    emoji: "🎨",
    targetSelector: "[data-tutorial='image-ai']",
    position: "top",
  },
];

export const POST_STORY_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "history",
    title: "Your Stories Are Saved!",
    description:
      "Find all your past stories here! Since there's no login, your data stays completely private on your device. Just remember — clearing your browser data will erase your story history, so download your favorites to keep them!",
    emoji: "💾",
    targetSelector: "[data-tutorial='history']",
    position: "top",
  },
];
