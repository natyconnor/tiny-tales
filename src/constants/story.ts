export const STORAGE_KEY = "tiny-tales-stories";
export const SETTINGS_STORAGE_KEY = "tiny-tales-settings";
export const MAX_STORED_STORIES = 50;

export type ModelOption = {
  id: string;
  name: string;
  description: string;
};

// Dynamic models are loaded from /api/models at runtime.
// These are safe fallbacks if the API is unavailable.
export const DEFAULT_AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "google/gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    description: "Fastest and cheapest",
  },
  {
    id: "alibaba/qwen3.7-flash",
    name: "Qwen 3.7 Flash",
    description: "Stronger writing, still cheap",
  },
  {
    id: "xiaomi/mimo-v2.6-flash",
    name: "MiMo 2.6 Flash",
    description: "Newest free-tier flash model",
  },
];

export const DEFAULT_IMAGE_MODELS: ModelOption[] = [
  {
    id: "bytedance/seedream-5.0-lite",
    name: "Seedream 5.0 Lite",
    description: "Stronger illustration quality",
  },
  {
    id: "bfl/flux-kontext-pro",
    name: "FLUX Kontext Pro",
    description: "Stronger prompt following",
  },
];

export const LETTER_LABELS = [
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

/**
 * Prompt ideas organized by reading level.
 * Subjects and names stay stage-friendly (cat, frog, Kim) so the story
 * can be written with simple words. The plot and imagery can use any
 * language — "learns to be brave" is fine even at 3 letters.
 */
export const PROMPT_IDEAS: Record<number, { emoji: string; ideas: string[] }> =
  {
    3: {
      emoji: "🐣",
      ideas: [
        "A shy cat who learns to be brave",
        "A sad bug who finds a pal",
        "A pig who helps a lost ant",
        "A pup who shares his toy",
        "A hen who tries to fly",
        "A cub who says sorry",
      ],
    },
    4: {
      emoji: "🐥",
      ideas: [
        "A duck who helps a lost baby bird find home",
        "A frog who is scared to jump but tries anyway",
        "A pup who learns to share his food",
        "A duck and a frog who become friends at the pond",
        "A bug who gets lost and finds a kind hand",
        "A goat who learns to be kind",
      ],
    },
    5: {
      emoji: "🐰",
      ideas: [
        "A bunny who overcomes stage fright to dance",
        "A puppy who stands up to a mean cat",
        "A whale who cleans the ocean and inspires others",
        "A fox who discovers honesty is the best policy",
        "A moth who is afraid of the dark",
        "Kim who learns that mistakes help us bake",
      ],
    },
    6: {
      emoji: "🦊",
      ideas: [
        "A kitten who starts a garden to help hungry friends",
        "A rabbit who is afraid of the rain and finds courage",
        "A lonely bird who learns friendship takes effort",
        "A picnic that goes wrong and still ends happily",
        "A boat that gets lost and finds its way home",
        "A farm friend who admits a mistake and fixes it",
      ],
    },
    7: {
      emoji: "🦉",
      ideas: [
        "A curious kitten who is scared of a sound outside",
        "A whisper in the garden that turns out to be a friend",
        "A rainbow after a storm that cheers everyone up",
        "A boy who loses his toy mouse and learns to ask for help",
        "A picnic spoiled by rain that becomes an indoor adventure",
        "A shy mouse who finds courage to speak up",
      ],
    },
    8: {
      emoji: "🦋",
      ideas: [
        "An elephant who feels too big and finds a tiny friend",
        "A bird who is afraid of the dark until a firefly helps",
        "Friends who find treasure and learn sharing matters more",
        "A birthday picnic that almost fails and becomes the best day",
        "A firefly who thinks its light is too small to matter",
        "An elephant and a bird who show that size doesn't define friendship",
      ],
    },
  };
