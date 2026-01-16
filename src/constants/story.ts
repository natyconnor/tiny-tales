export const STORAGE_KEY = "tiny-tales-stories";
export const SETTINGS_STORAGE_KEY = "tiny-tales-settings";
export const MAX_STORED_STORIES = 50;

// Available Pollinations text models
// See: https://gen.pollinations.ai/v1/models
// Using OpenAI-compatible endpoint at /v1/chat/completions
export const AVAILABLE_MODELS = [
  {
    id: "gemini-fast",
    name: "Gemini 2.5 Flash Lite",
    description: "Fastest ⚡",
  },
  {
    id: "deepseek",
    name: "DeepSeek V3.2",
    description: "Best reasoning 🧠",
  },
  {
    id: "openai",
    name: "GPT-5 Mini",
    description: "Slow 🐢",
  },
  {
    id: "gemini",
    name: "Gemini 3 Flash",
    description: "Newest 🚀",
  },
];

// Available Pollinations image models
// See: https://gen.pollinations.ai/image/models
// Pollen rates from API docs (images per 1 pollen):
//   flux:          5000 images/pollen (essentially unlimited)
//   turbo:         3300 images/pollen (essentially unlimited)
//   gptimage:      70 images/pollen   (~17 stories/day with 1 pollen)
//   nanobanana:    25 images/pollen   (~6 stories/day with 1 pollen)
//   nanobanana-pro:6 images/pollen    (~1 story/day with 1 pollen)
// Each story uses 4 images
export const IMAGE_MODELS = [
  {
    id: "gptimage",
    name: "GPT Image",
    description: "Balanced speed and quality (~17/day)",
  },
  {
    id: "nanobanana",
    name: "Nano Banana 🍌",
    description: "Excellent quality (~6/day)",
  },
  {
    id: "flux",
    name: "Flux Schnell",
    description: "Fast & free (but might have some issues)",
  },
  {
    id: "turbo",
    name: "SDXL Turbo",
    description: "Free with good quality",
  },
  {
    id: "nanobanana-pro",
    name: "Nano Banana Pro",
    description: "Best quality (~1/day)",
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
 * Prompt ideas organized by word length (skill level)
 * Each prompt includes action/conflict and potential for a lesson
 * Simpler topics for shorter word limits, more complex for longer
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
        "A bear who learns to share his food",
        "A frog who is scared to jump but tries anyway",
        "A lazy snail who wins a race by not giving up",
        "A rude goat who learns to be kind",
        "A tiny fish who saves the pond from trash",
      ],
    },
    5: {
      emoji: "🐰",
      ideas: [
        "A bunny who overcomes stage fright to dance",
        "A mouse who stands up to a mean cat",
        "A robot who learns that mistakes help us grow",
        "A whale who cleans the ocean and inspires others",
        "A panda who learns patience while learning to cook",
        "A fox who discovers honesty is the best policy",
      ],
    },
    6: {
      emoji: "🦊",
      ideas: [
        "A dragon who learns being different is special",
        "A pirate who returns stolen treasure and finds real riches",
        "A kitten who starts a garden to help hungry friends",
        "A wizard who admits a mistake and fixes it together",
        "A lonely robot who learns friendship takes effort",
        "A squirrel who saves for winter and helps neighbors too",
      ],
    },
    7: {
      emoji: "🦉",
      ideas: [
        "A penguin who explores but learns home is where the heart is",
        "A unicorn who stumbles but keeps trying until she sparkles",
        "A grumpy cloud who discovers joy in helping flowers grow",
        "A knight who befriends a dragon instead of fighting",
        "A bookworm who learns adventures happen outside books too",
        "A timid owl who finds courage to speak up for friends",
      ],
    },
    8: {
      emoji: "🦋",
      ideas: [
        "A dinosaur who travels through time and learns to appreciate the present",
        "A princess who proves girls can be scientists and heroes",
        "A vegetable garden that teaches a picky eater to try new things",
        "An elephant and ladybug who show that size doesn't define friendship",
        "A spaceship captain who conquers fear of the dark with a friend's help",
        "A young inventor whose failed experiment leads to an amazing discovery",
      ],
    },
  };
