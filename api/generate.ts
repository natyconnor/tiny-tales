import { GoogleGenerativeAI } from "@google/generative-ai";

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

export default async function handler(req: Request): Promise<Response> {
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get API key from environment
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set");
    return new Response(
      JSON.stringify({
        error: "Server configuration error. Please try again later.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body: RequestBody = await req.json();
    const { topic, maxLetters, model: requestedModel } = body;

    // Validate input
    if (!topic || typeof topic !== "string") {
      return new Response(
        JSON.stringify({ error: "Please provide a story topic!" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!maxLetters || maxLetters < 3 || maxLetters > 8) {
      return new Response(
        JSON.stringify({ error: "Maximum letters must be between 3 and 8" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Use requested model if valid, otherwise default to fastest model
    const modelName =
      requestedModel && ALLOWED_MODELS.includes(requestedModel)
        ? requestedModel
        : "gemini-2.5-flash-lite";

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

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

    // Generate the story (single attempt to avoid timeout)
    const result = await model.generateContent(prompt);
    const story = result.response.text().trim();

    return new Response(JSON.stringify({ story }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating story:", error);

    // Handle specific error types
    if (error instanceof SyntaxError) {
      return new Response(JSON.stringify({ error: "Invalid request format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        error: "Our story wizard had a hiccup! Please try again. 🧙‍♂️",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
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

// Use Node.js serverless runtime (allows longer timeout than Edge)
export const config = {
  maxDuration: 60, // Max allowed on Hobby plan
};
