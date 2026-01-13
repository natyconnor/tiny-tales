import { GoogleGenerativeAI } from "@google/generative-ai";
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
}

// Allowed models (to prevent arbitrary model injection)
const ALLOWED_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
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
    const { topic, maxLetters, model: requestedModel } = body;
    log(
      `Request body parsed: topic="${topic}", maxLetters=${maxLetters}, model=${requestedModel}`
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
    log(`Using model: ${modelName}`);

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    log("Gemini client initialized");

    // Create the prompt - now requesting JSON with story + 4 image prompts
    const prompt = `Create a simple, fun children's story about "${topic}" along with 4 illustration prompts.

STORY RULES:
1. ALL words in the story MUST be ${maxLetters} letters or fewer. This is critical - no exceptions!
2. Use simple, easy-to-read language appropriate for early readers (ages 4-7)
3. The story should be exactly 5-8 sentences long. The sentences don't have to be complete sentences
4. Make it engaging, fun, and age-appropriate
5. Use short, simple sentences
6. Include descriptive words that help paint a picture
7. End with a positive or happy conclusion
8. The longer the words, the more complex the story can be

Examples of ${maxLetters}-letter words or shorter: ${getExampleWords(
      maxLetters
    )}

IMAGE PROMPT RULES:
1. Create exactly 4 image prompts for key moments in the story
2. Each prompt MUST start with: "whimsical watercolor children's book illustration:"
3. Keep the main character/subject consistent across all 4 prompts
4. Make prompts descriptive but concise (under 100 characters after the prefix)
5. Prompts should be child-friendly and match the story's tone

Respond with ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "story": "The story text here...",
  "imagePrompts": [
    "whimsical watercolor children's book illustration: first scene description",
    "whimsical watercolor children's book illustration: second scene description",
    "whimsical watercolor children's book illustration: third scene description",
    "whimsical watercolor children's book illustration: fourth scene description"
  ]
}`;

    // Generate the story and image prompts
    log("Calling Gemini API...");
    const result = await model.generateContent(prompt);
    log("Gemini API responded");

    const responseText = result.response.text().trim();
    log(`Response received: ${responseText.length} chars`);

    // Parse the JSON response
    let parsed: { story: string; imagePrompts: string[] };
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

    log(
      `Story generated: ${parsed.story.length} chars, ${imagePrompts.length} image prompts`
    );

    // Log each image prompt
    imagePrompts.forEach((prompt, i) => {
      log(
        `Image prompt ${i + 1}: ${prompt.slice(0, 100)}${
          prompt.length > 100 ? "..." : ""
        }`
      );
    });

    // Build Pollinations URLs for each image prompt (only log once to avoid spam)
    const imageUrls = imagePrompts.map((prompt, i) =>
      buildPollinationsUrl(prompt, i === 0 ? log : undefined)
    );

    // Log summary of URLs
    log(`Generated ${imageUrls.length} Pollinations URLs`);

    return res.status(200).json({
      story: parsed.story,
      imagePrompts,
      imageUrls,
      debug: {
        time: Date.now() - startTime,
        model: modelName,
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
 * Supports optional API key for higher rate limits
 *
 * Per https://enter.pollinations.ai/api/docs#tag/genpollinationsai/GET/image/%7Bprompt%7D
 * - API key can be passed as query param: ?key=YOUR_API_KEY
 * - Or via Authorization header (not used here since we're building URLs)
 */
function buildPollinationsUrl(
  prompt: string,
  log?: (msg: string) => void
): string {
  const pollinationsKey = process.env.POLLINATIONS_API_KEY;

  // Per docs: default model is "zimage", default dimensions are 1024x1024
  // Using 512x512 for faster loading in children's book context
  const params = new URLSearchParams({
    width: "512",
    height: "512",
    model: "flux", // flux is still supported and good for illustrations
    safe: "true", // Enable safety content filter for children's content
    seed: "-1", // Random seed for variety
  });

  // Log environment variable status
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

  // If API key is configured, add it to bypass rate limits
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
    // Log URL but redact the key for security
    const safeUrl = pollinationsKey
      ? url.replace(pollinationsKey, "[REDACTED]")
      : url;
    log(`Generated Pollinations URL: ${safeUrl}`);
  }

  return url;
}

// Node.js serverless config
export const config = {
  maxDuration: 60, // Max allowed on Hobby plan
};
