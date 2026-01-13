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

    // Create the prompt
    const prompt = `Create a simple, fun children's story about "${topic}".

IMPORTANT RULES:
1. ALL words in the story MUST be ${maxLetters} letters or fewer. This is critical - no exceptions!
2. Use simple, easy-to-read language appropriate for early readers (ages 4-7)
3. The story should be exactly 5-8 sentences long
4. Make it engaging, fun, and age-appropriate
5. Use short, simple sentences
6. Include descriptive words that help paint a picture
7. End with a positive or happy conclusion

Examples of ${maxLetters}-letter words or shorter: ${getExampleWords(
      maxLetters
    )}

Write only the story text, nothing else. No titles, no explanations, just the story.`;

    // Generate the story
    log("Calling Gemini API...");
    const result = await model.generateContent(prompt);
    log("Gemini API responded");

    const story = result.response.text().trim();
    log(`Story generated: ${story.length} chars`);

    return res.status(200).json({
      story,
      debug: { time: Date.now() - startTime, model: modelName },
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

// Node.js serverless config
export const config = {
  maxDuration: 60, // Max allowed on Hobby plan
};
