import { GoogleGenerativeAI } from "@google/generative-ai";

interface RequestBody {
  topic: string;
  maxLetters: number;
}

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
    const { topic, maxLetters } = body;

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

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

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
    const result = await model.generateContent(prompt);
    const story = result.response.text().trim();

    // Validate that words don't exceed the limit (basic check)
    const words = story.split(/\s+/);
    const longWords = words.filter((word) => {
      // Remove punctuation for checking
      const cleanWord = word.replace(/[^a-zA-Z]/g, "");
      return cleanWord.length > maxLetters;
    });

    if (longWords.length > 0) {
      // If there are words that are too long, try to regenerate once
      console.log("Found long words, regenerating:", longWords);
      const retryResult = await model.generateContent(
        prompt +
          "\n\nREMINDER: Every single word MUST be " +
          maxLetters +
          " letters or fewer!"
      );
      const retryStory = retryResult.response.text().trim();

      return new Response(JSON.stringify({ story: retryStory }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

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

export const config = {
  runtime: "edge",
};
