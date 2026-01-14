import { GoogleGenAI } from "@google/genai";
import type { IncomingMessage, ServerResponse } from "http";

// Vercel serverless types
interface VercelRequest extends IncomingMessage {
  query: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body: unknown;
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
}

interface RequestBody {
  topic: string;
  maxLetters: number;
  model?: string;
  imageModel?: string;
}

// Allowed text models (to prevent arbitrary model injection)
const ALLOWED_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
];

// Allowed Pollinations image models
// See: https://gen.pollinations.ai/image/models
// Pollen rates (images per 1 pollen / pollen per image):
//   flux:          5000 images/pollen = 0.0002 pollen/image
//   turbo:         3300 images/pollen = 0.0003 pollen/image
//   gptimage:      70 images/pollen   = 0.0143 pollen/image
//   seedream:      35 images/pollen   = 0.0286 pollen/image
//   nanobanana:    25 images/pollen   = 0.04 pollen/image
//   nanobanana-pro:6 images/pollen    = 0.167 pollen/image
// Each story uses 4 images
const ALLOWED_IMAGE_MODELS = [
  "flux", // Flux Schnell - 5K images/pollen (essentially unlimited)
  "nanobanana", // NanoBanana - 25 images/pollen
  "gptimage", // OpenAI GPT Image 1 Mini - 70 images/pollen
  "seedream", // ByteDance Seedream 4.0 - 35 images/pollen
  "turbo", // SDXL Turbo - 3.3K images/pollen (essentially unlimited)
  "nanobanana-pro", // NanoBanana Pro - 6 images/pollen (expensive!)
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  const log = (msg: string) =>
    console.log(`[${Date.now() - startTime}ms] ${msg}`);

  log("Handler started");

  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get API key from environment
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    log("ERROR: GEMINI_API_KEY is not set");
    return res.status(500).json({
      error: "Server configuration error: API key not set",
    });
  }
  log(`API key found: ${apiKey.slice(0, 8)}...`);

  try {
    // In Node.js serverless, body is already parsed
    const body = req.body as RequestBody;
    const {
      topic,
      maxLetters,
      model: requestedModel,
      imageModel: requestedImageModel,
    } = body;
    log(
      `Request body parsed: topic="${topic}", maxLetters=${maxLetters}, model=${requestedModel}, imageModel=${requestedImageModel}`
    );

    // Validate input
    if (!topic || typeof topic !== "string") {
      return res.status(400).json({ error: "Please provide a story topic!" });
    }

    if (!maxLetters || maxLetters < 3 || maxLetters > 8) {
      return res
        .status(400)
        .json({ error: "Maximum letters must be between 3 and 8" });
    }

    // Use requested model if valid, otherwise default to fastest model
    const modelName =
      requestedModel && ALLOWED_MODELS.includes(requestedModel)
        ? requestedModel
        : "gemini-2.5-flash-lite";
    log(`Using text model: ${modelName}`);

    // Use requested image model if valid, otherwise default to flux
    const imageModelName =
      requestedImageModel && ALLOWED_IMAGE_MODELS.includes(requestedImageModel)
        ? requestedImageModel
        : "flux";
    log(`Using image model: ${imageModelName}`);

    // Initialize Gemini
    const ai = new GoogleGenAI({ apiKey });
    log("Gemini client initialized");

    // Create the prompt - requesting JSON with story + character descriptions + image prompts
    const prompt = `Create a simple, fun children's story about "${topic}" with detailed character descriptions and 4 illustration prompts.

=== PART 1: STORY TEXT ===
Write a story for early readers (ages 4-7) where ALL words are ${maxLetters} letters or fewer.

STORY RULES:
1. ALL words MUST be ${maxLetters} letters or fewer - NO EXCEPTIONS!
2. Exactly 5-8 short, simple sentences (fragments are okay when the letter limit is low)
3. Make it engaging, fun, and age-appropriate
4. End with a positive or happy conclusion
5. The longer the words, the more complex the story can be (more articles and such)

Examples of ${maxLetters}-letter words: ${getExampleWords(maxLetters)}

=== PART 2: CHARACTER DESCRIPTIONS ===
For EACH character or important object in your story, provide a detailed visual description.
These are NOT limited by word length - be descriptive!

Include for each character:
- Species/type (e.g., "orange tabby cat", "small gray mouse")
- Key visual features (colors, patterns, size, clothing if any)
- Personality expressed through appearance (cheerful smile, curious eyes, etc.)

=== PART 3: IMAGE PROMPTS ===
Create 4 image prompts for key story moments. Each prompt must:

1. Start with: "whimsical watercolor children's book illustration:"
2. Include the FULL character description (from Part 2) for any character in that scene
3. Describe the action/scene from that part of the story
4. Include setting details (grassy meadow, cozy kitchen, sunny garden, etc.)
5. Maintain a consistent art style description

CRITICAL: The image prompts must be self-contained - each one should fully describe the characters as if it's the only context the image generator will see. Never use pronouns or short names alone - always include the visual description.

Example of a GOOD prompt:
"whimsical watercolor children's book illustration: a cheerful orange tabby cat with bright green eyes and a white chest chasing a tiny gray mouse with big pink ears and a long curly tail through a sunny meadow filled with colorful wildflowers"

Example of a BAD prompt:
"whimsical watercolor children's book illustration: Pat chases Tim through a meadow"
(Bad because it uses names without descriptions - image generator doesn't know what Pat and Tim look like!)

=== RESPONSE FORMAT ===
Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "story": "The simple story text with ${maxLetters}-letter-max words...",
  "characters": {
    "characterName": "Full visual description of this character"
  },
  "imagePrompts": [
    "whimsical watercolor children's book illustration: [full character descriptions] + [scene 1 description]",
    "whimsical watercolor children's book illustration: [full character descriptions] + [scene 2 description]",
    "whimsical watercolor children's book illustration: [full character descriptions] + [scene 3 description]",
    "whimsical watercolor children's book illustration: [full character descriptions] + [scene 4 description]"
  ]
}`;

    // Generate the story and image prompts
    log("Calling Gemini API...");
    const result = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    log("Gemini API responded");

    const responseText = result.text?.trim() ?? "";
    log(`Response received: ${responseText.length} chars`);

    // Parse the JSON response
    let parsed: {
      story: string;
      characters?: Record<string, string>;
      imagePrompts: string[];
    };
    try {
      // Remove any markdown code block markers if present
      const cleanJson = responseText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      log("Failed to parse JSON, attempting to extract story");
      // Fallback: if JSON parsing fails, use the response as story text
      parsed = {
        story: responseText,
        imagePrompts: [],
      };
    }

    // Validate the parsed response
    if (!parsed.story || typeof parsed.story !== "string") {
      throw new Error("Invalid response: missing story text");
    }

    // Ensure we have exactly 4 image prompts (or empty array as fallback)
    const imagePrompts = Array.isArray(parsed.imagePrompts)
      ? parsed.imagePrompts.slice(0, 4)
      : [];

    // Log characters if present
    if (parsed.characters) {
      log(`Characters defined: ${Object.keys(parsed.characters).join(", ")}`);
      Object.entries(parsed.characters).forEach(([name, desc]) => {
        log(`  ${name}: ${desc.slice(0, 80)}${desc.length > 80 ? "..." : ""}`);
      });
    }

    log(
      `Story generated: ${parsed.story.length} chars, ${imagePrompts.length} image prompts`
    );

    // Log each image prompt
    imagePrompts.forEach((prompt, i) => {
      log(
        `Image prompt ${i + 1}: ${prompt.slice(0, 150)}${
          prompt.length > 150 ? "..." : ""
        }`
      );
    });

    // Build Pollinations URLs for each image prompt
    const imageUrls = imagePrompts.map((prompt, i) =>
      buildPollinationsUrl(prompt, imageModelName, i === 0 ? log : undefined)
    );
    log(`Generated ${imageUrls.length} Pollinations URLs`);

    return res.status(200).json({
      story: parsed.story,
      characters: parsed.characters || {},
      imagePrompts,
      imageUrls,
      debug: {
        time: Date.now() - startTime,
        model: modelName,
        imageModel: imageModelName,
        pollinationsKeyConfigured: !!process.env.POLLINATIONS_API_KEY,
      },
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    log(`ERROR after ${elapsed}ms: ${error}`);

    // Handle specific error types
    if (error instanceof SyntaxError) {
      return res.status(400).json({ error: "Invalid request format" });
    }

    // Include error details for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      error: `Story generation failed after ${elapsed}ms: ${errorMessage.slice(
        0,
        200
      )}`,
    });
  }
}

function getExampleWords(maxLetters: number): string {
  const examples: Record<number, string[]> = {
    3: ["the", "cat", "dog", "run", "big", "sun", "fun", "red", "and", "can"],
    4: [
      "play",
      "tree",
      "bird",
      "jump",
      "rain",
      "bear",
      "fish",
      "love",
      "soft",
      "warm",
    ],
    5: [
      "happy",
      "smile",
      "dance",
      "green",
      "quick",
      "sweet",
      "small",
      "cloud",
      "dream",
      "shine",
    ],
    6: [
      "forest",
      "rabbit",
      "gentle",
      "purple",
      "splash",
      "friend",
      "bright",
      "breeze",
      "nature",
      "giggle",
    ],
    7: [
      "rainbow",
      "magical",
      "sparkle",
      "whisper",
      "curious",
      "flutter",
      "puddles",
      "sunbeam",
      "morning",
      "journey",
    ],
    8: [
      "sunshine",
      "treasure",
      "elephant",
      "laughter",
      "discover",
      "colorful",
      "friendly",
      "grateful",
      "peaceful",
      "adorable",
    ],
  };

  return (examples[maxLetters] || examples[5]).join(", ");
}

/**
 * Builds a Pollinations.ai image URL from a prompt
 * See available models at: https://gen.pollinations.ai/image/models
 */
function buildPollinationsUrl(
  prompt: string,
  model: string,
  log?: (msg: string) => void
): string {
  const pollinationsKey = process.env.POLLINATIONS_API_KEY;

  const params = new URLSearchParams({
    width: "512",
    height: "512",
    model: model,
    safe: "true",
    seed: "-1",
  });

  if (log) {
    log(
      `POLLINATIONS_API_KEY: ${
        pollinationsKey
          ? `"${pollinationsKey.slice(0, 8)}..." (${
              pollinationsKey.length
            } chars)`
          : "NOT SET"
      }`
    );
  }

  if (pollinationsKey) {
    params.set("key", pollinationsKey);
    if (log) {
      log(`Added key param to URL`);
    }
  } else {
    if (log) {
      log(
        `WARNING: No POLLINATIONS_API_KEY configured - using anonymous tier with rate limits`
      );
    }
  }

  const url = `https://gen.pollinations.ai/image/${encodeURIComponent(
    prompt
  )}?${params.toString()}`;

  if (log) {
    const safeUrl = pollinationsKey
      ? url.replace(pollinationsKey, "[REDACTED]")
      : url;
    log(`Generated Pollinations URL: ${safeUrl}`);
  }

  return url;
}

// Node.js serverless config
export const config = {
  maxDuration: 60,
};
