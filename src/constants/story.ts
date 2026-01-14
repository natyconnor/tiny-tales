export const STORAGE_KEY = "tiny-tales-stories";
export const MAX_STORED_STORIES = 50;

export const AVAILABLE_MODELS = [
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    description: "Fastest ⚡ (recommended)",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "More capable, slower",
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    description: "Newest (beta)",
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
