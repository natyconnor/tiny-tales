import type { IncomingMessage, ServerResponse } from "http";
import { generateText } from "ai";
import {
  resolveImageModelId,
  resolveTextModelId,
} from "./modelCatalog.js";
import { createImageProxyToken } from "./imageProxyToken.js";
import { getStoryBudget, hasGatewayAuth } from "./storyBudget.js";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  const log = (msg: string) =>
    console.log(`[${Date.now() - startTime}ms] ${msg}`);

  log("Handler started");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!hasGatewayAuth()) {
    return res.status(503).json({
      error:
        "AI Gateway is not configured. Set AI_GATEWAY_API_KEY (or run vercel env pull for OIDC).",
      code: "GATEWAY_NOT_CONFIGURED",
    });
  }

  try {
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

    if (!topic || typeof topic !== "string") {
      return res.status(400).json({ error: "Please provide a story topic!" });
    }

    if (!maxLetters || maxLetters < 3 || maxLetters > 8) {
      return res
        .status(400)
        .json({ error: "Maximum letters must be between 3 and 8" });
    }

    const budget = await getStoryBudget(requestedModel, requestedImageModel);
    if (budget.remainingUsd !== null && budget.remainingUsd <= 0) {
      return res.status(402).json({
        error:
          "AI credits are exhausted. Add AI Gateway credits in your Vercel dashboard, or wait for the monthly free credit to refresh.",
        code: "PAYMENT_REQUIRED",
        budget,
      });
    }

    const modelName = resolveTextModelId(requestedModel);
    const imageModelName = resolveImageModelId(requestedImageModel);
    log(`Using text model: ${modelName}`);
    log(`Using image model: ${imageModelName}`);

    const skillGuidance = getSkillLevelGuidance(maxLetters);
    const prompt = buildStoryPrompt(topic, maxLetters, skillGuidance);

    log("Calling AI Gateway...");
    let responseText = "";
    try {
      const result = await generateText({
        model: modelName,
        prompt,
        temperature: 0.8,
      });
      responseText = result.text.trim();
      log(
        `AI Gateway responded (${result.usage?.totalTokens ?? "?"} tokens)`
      );
    } catch (error) {
      return handleGatewayError(res, error, log);
    }

    log(`Response received: ${responseText.length} chars`);

    let parsed: {
      title?: string;
      story: string;
      characters?: Record<string, string>;
      imagePrompts: string[];
    };
    try {
      parsed = JSON.parse(responseText);
    } catch {
      try {
        const cleanJson = responseText
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
        parsed = JSON.parse(cleanJson);
      } catch {
        log("Failed to parse JSON response, using raw text as story");
        parsed = {
          story: responseText,
          imagePrompts: [],
        };
      }
    }

    if (!parsed.story || typeof parsed.story !== "string") {
      throw new Error("Invalid response: missing story text");
    }

    const title = parsed.title?.trim() || topic;
    log(`Title: "${title}"`);

    const imagePrompts = Array.isArray(parsed.imagePrompts)
      ? parsed.imagePrompts.slice(0, 4)
      : [];

    if (parsed.characters) {
      log(`Characters defined: ${Object.keys(parsed.characters).join(", ")}`);
    }

    log(
      `Story generated: ${parsed.story.length} chars, ${imagePrompts.length} image prompts`
    );

    const imageUrls = imagePrompts.map((imagePrompt) =>
      buildImageProxyUrl(imagePrompt, imageModelName)
    );
    log(`Generated ${imageUrls.length} proxied image URLs`);

    const isDevMode =
      process.env.NODE_ENV !== "production" && !process.env.VERCEL;

    return res.status(200).json({
      title,
      story: parsed.story,
      characters: parsed.characters || {},
      imagePrompts,
      imageUrls,
      budget,
      debug: {
        time: Date.now() - startTime,
        model: modelName,
        imageModel: imageModelName,
        textApi: "ai-gateway",
        gatewayConfigured: hasGatewayAuth(),
        ...(isDevMode && {
          fullPrompt: prompt,
          rawResponse: responseText,
        }),
      },
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    log(`ERROR after ${elapsed}ms: ${error}`);

    if (error instanceof SyntaxError) {
      return res.status(400).json({ error: "Invalid request format" });
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      error: `Story generation failed after ${elapsed}ms: ${errorMessage.slice(
        0,
        200
      )}`,
    });
  }
}

function handleGatewayError(
  res: VercelResponse,
  error: unknown,
  log: (msg: string) => void
) {
  const message = error instanceof Error ? error.message : String(error);
  log(`AI Gateway error: ${message}`);

  const lower = message.toLowerCase();
  const isPaymentError =
    lower.includes("402") ||
    lower.includes("payment_required") ||
    lower.includes("payment required") ||
    lower.includes("insufficient credit") ||
    lower.includes("insufficient funds") ||
    lower.includes("insufficient balance") ||
    (lower.includes("credit") &&
      (lower.includes("exhausted") ||
        lower.includes("empty") ||
        lower.includes("out of")));

  if (isPaymentError) {
    return res.status(402).json({
      error:
        "AI credits are exhausted. Add free-tier usage later this month, or top up AI Gateway credits in your Vercel dashboard.",
      code: "PAYMENT_REQUIRED",
    });
  }

  if (
    lower.includes("403") ||
    lower.includes("forbidden") ||
    lower.includes("restricted") ||
    lower.includes("not available") ||
    lower.includes("free tier")
  ) {
    return res.status(403).json({
      error:
        "This story model is not available on the free AI Gateway tier right now. Try Gemini Flash Lite instead.",
      code: "MODEL_UNAVAILABLE",
    });
  }

  if (lower.includes("401") || lower.includes("unauthorized")) {
    return res.status(401).json({
      error: "AI Gateway authentication failed. Check AI_GATEWAY_API_KEY.",
      code: "UNAUTHORIZED",
    });
  }

  if (lower.includes("429") || lower.includes("rate")) {
    return res.status(429).json({
      error: "Too many requests right now. Please wait a moment and try again.",
      code: "RATE_LIMITED",
    });
  }

  return res.status(502).json({
    error: `Story generation failed: ${message.slice(0, 200)}`,
    code: "UPSTREAM_ERROR",
  });
}

function buildStoryPrompt(
  topic: string,
  maxLetters: number,
  skillGuidance: ReturnType<typeof getSkillLevelGuidance>
): string {
  return `Create a simple, fun children's story about "${topic}" with a title, detailed character descriptions, and 4 illustration prompts.

=== PART 1: TITLE ===
Create a short, catchy title for this children's book (2-5 words). The title should:
- Be memorable and fun
- Capture the essence of the story
- Appeal to young readers
- NOT just repeat the topic verbatim

Examples of good titles:
- Topic "a cat who loves pizza" → "Pizza Paws"
- Topic "dinosaur at school" → "Dino's First Day"
- Topic "bunny learns to share" → "The Sharing Bunny"

=== PART 2: STORY TEXT ===
Write a story for early readers where ALL words are ${maxLetters} letters or fewer.

SKILL LEVEL: ${skillGuidance.complexity}

STORY STRUCTURE:
- Sentence length: ${skillGuidance.sentenceLength}
- Total sentences: ${skillGuidance.sentenceCount}
DO NOT EXCEED THESE LIMITS!

CRITICAL GRAMMAR RULES:
${skillGuidance.grammarNotes}

WORD LIMIT:
- ALL words MUST be ${maxLetters} letters or fewer - NO EXCEPTIONS!
- Count carefully: "beautiful" = 9 letters (NOT allowed if limit is 8)
- Examples of ${maxLetters}-letter words: ${getExampleWords(maxLetters)}

SENTENCE EXAMPLES FOR THIS SKILL LEVEL:
${skillGuidance.exampleSentences}

STORY REQUIREMENTS:
1. Make it engaging, fun, and age-appropriate
2. End with a positive or happy conclusion
3. Each sentence should be its own clear thought
4. Read your story aloud mentally - it should sound natural, not choppy

GRAMMAR RULES (IMPORTANT - follow standard English grammar):
- Use "an" before vowel sounds: "an ant", "an egg", "an owl", "an ice cream", "an umbrella"
- Use "a" before consonant sounds: "a cat", "a dog", "a bird", "a unicorn" (sounds like "yoo")
- Subject-verb agreement: "The cat runs" (singular), "The cats run" (plural)
- Consistent tense: stick to past tense ("ran", "jumped", "said") or present tense throughout
- Proper capitalization: start sentences with capitals, capitalize names
- Complete thoughts: avoid sentence fragments unless intentional for younger readers (3-4 letter words)

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
Return a JSON object with this shape:
{
  "title": "Short catchy book title (2-5 words)",
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
}

Return ONLY valid JSON. Do not wrap it in markdown fences.`;
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

function getSkillLevelGuidance(maxLetters: number): {
  sentenceLength: string;
  sentenceCount: string;
  grammarNotes: string;
  exampleSentences: string;
  complexity: string;
} {
  switch (maxLetters) {
    case 3:
      return {
        sentenceLength: "3-5 words per sentence",
        sentenceCount: "4-6 very short sentences total",
        grammarNotes: `CRITICAL: Always include small articles and words like "a", "the", "is", "it", "to", "in", "on", "up" - these are all ${maxLetters} letters or fewer and make sentences readable! Don't skip articles to save space. Fragments like "Big sun!" or "A red cat." are perfect.`,
        exampleSentences: `
GOOD examples for 3-letter limit:
- "A cat ran."
- "The dog is big."
- "It was fun!"
- "I see a red bug."

BAD examples (sentences too long or missing articles):
- "Cat ran to the big red sun and had fun" (too many words in one sentence)
- "Cat ran." (missing "The" or "A" - sounds unnatural)`,
        complexity:
          "Beginner reader level. Ultra-simple. Think single actions, basic observations.",
      };

    case 4:
      return {
        sentenceLength: "3-5 words per sentence",
        sentenceCount: "5-7 short sentences total",
        grammarNotes: `Include all articles (a, an, the) and common small words (is, are, was, were, has, have, this, that, with). These make sentences flow naturally. Short complete sentences are better than fragments.`,
        exampleSentences: `
GOOD examples for 4-letter limit:
- "The bird sang a song."
- "A bear ate fish."
- "They play in the rain."
- "It was a warm day."

BAD examples:
- "Bird sang song." (missing articles - sounds choppy)
- "The bird sang a beautiful song in the morning" (too long)`,
        complexity:
          "Early reader level. Simple complete sentences with basic narrative.",
      };

    case 5:
      return {
        sentenceLength: "4-7 words per sentence",
        sentenceCount: "5-8 sentences total",
        grammarNotes: `Write proper, complete sentences with good grammar. Include articles, conjunctions (and, but, so), and descriptive words. Sentences should feel natural when read aloud.`,
        exampleSentences: `
GOOD examples for 5-letter limit:
- "The happy bunny found a shiny shell."
- "She ran fast and won the race."
- "The small bird sang a sweet song."
- "It was a warm and sunny day."`,
        complexity:
          "Developing reader level. More descriptive language and simple story arcs.",
      };

    case 6:
      return {
        sentenceLength: "5-9 words per sentence",
        sentenceCount: "6-8 sentences total",
        grammarNotes: `Write fuller sentences with proper grammar, varied sentence structure, and descriptive language. Include dialogue if it fits naturally. Use conjunctions to connect ideas.`,
        exampleSentences: `
GOOD examples for 6-letter limit:
- "The gentle rabbit hopped across the grassy garden."
- "She smiled bright and waved to her friend."
- "The purple flower danced in the gentle breeze."`,
        complexity:
          "Confident reader level. Richer vocabulary, more detailed scenes, character emotions.",
      };

    case 7:
      return {
        sentenceLength: "6-10 words per sentence",
        sentenceCount: "6-10 sentences total",
        grammarNotes: `Write complete, grammatically rich sentences. Use varied sentence lengths for rhythm. Include descriptive adjectives, dialogue, and character thoughts/feelings.`,
        exampleSentences: `
GOOD examples for 7-letter limit:
- "The curious kitten sparkled with delight at the rainbow."
- "Morning sunbeam danced through the magical flutter of puddles."
- "She whispered a secret and started her amazing journey."`,
        complexity:
          "Advanced early reader. Complex narratives, character development, vivid imagery.",
      };

    case 8:
    default:
      return {
        sentenceLength: "6-12 words per sentence",
        sentenceCount: "6-10 sentences total",
        grammarNotes: `Write polished, complete sentences with sophisticated structure. Use rich vocabulary, varied sentence patterns, dialogue, and emotional depth. The story should feel like a real children's book.`,
        exampleSentences: `
GOOD examples for 8-letter limit:
- "The cheerful elephant trumpeted with colorful laughter and grateful joy."
- "She followed the peaceful treasure map to discover a friendly surprise."
- "The adorable sunshine made everyone feel grateful and peaceful."`,
        complexity:
          "Fluent early reader. Full narrative with beginning, middle, end. Rich description and character arcs.",
      };
  }
}

function buildImageProxyUrl(prompt: string, model: string): string {
  const token = createImageProxyToken(prompt, model);
  const params = new URLSearchParams({ token });
  return `/api/image?${params.toString()}`;
}

export const config = {
  maxDuration: 60,
};
