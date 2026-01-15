export const STORAGE_KEY = "tiny-tales-stories";
export const MAX_STORED_STORIES = 50;

// Available Pollinations text models
// See: https://gen.pollinations.ai/v1/models
// Using OpenAI-compatible endpoint at /v1/chat/completions
export const AVAILABLE_MODELS = [
  {
    id: "gemini-fast",
    name: "Gemini 2.5 Flash Lite",
    description: "Fastest ⚡ (recommended)",
  },
  {
    id: "deepseek",
    name: "DeepSeek V3.2",
    description: "Best reasoning 🧠",
  },
  {
    id: "openai",
    name: "GPT-5 Mini",
    description: "Balanced quality",
  },
  {
    id: "gemini",
    name: "Gemini 3 Flash",
    description: "Newest & capable",
  },
];

// Available Pollinations image models
// See: https://gen.pollinations.ai/image/models
// Pollen rates from API docs (images per 1 pollen):
//   flux:          5000 images/pollen (essentially unlimited)
//   turbo:         3300 images/pollen (essentially unlimited)
//   gptimage:      70 images/pollen   (~17 stories/day with 1 pollen)
//   seedream:      35 images/pollen   (~8 stories/day with 1 pollen)
//   nanobanana:    25 images/pollen   (~6 stories/day with 1 pollen)
//   nanobanana-pro:6 images/pollen    (~1 story/day with 1 pollen)
// Each story uses 4 images
export const IMAGE_MODELS = [
  {
    id: "gptimage",
    name: "GPT Image",
    description: "OpenAI (~17/day)",
  },
  {
    id: "nanobanana",
    name: "Nano Banana ⭐",
    description: "Best quality (~6/day)",
  },
  {
    id: "flux",
    name: "Flux Schnell",
    description: "Fast & free (unlimited)",
  },
  {
    id: "seedream",
    name: "Seedream",
    description: "ByteDance (~8/day)",
  },
  {
    id: "turbo",
    name: "SDXL Turbo",
    description: "Fastest (unlimited)",
  },
  {
    id: "nanobanana-pro",
    name: "Nano Banana Pro",
    description: "4K quality (~1/day)",
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
