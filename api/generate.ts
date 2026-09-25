import type { IncomingMessage, ServerResponse } from "http";
import { generateText } from "ai";
import { z } from "zod";
import {
  resolveImageModelId,
  resolveTextModelId,
} from "./modelCatalog.js";
import { createImageProxyToken } from "./imageProxyToken.js";
import { getStoryBudget, hasGatewayAuth } from "./storyBudget.js";
import { getPhonicsStage } from "./phonics/stages.js";
import { buildRepairHint, findIllegalWords } from "./phonics/validate.js";
import {
  buildArtUserPrompt,
  buildStoryUserPrompt,
  injectImagePrompt,
  STORY_SYSTEM_PROMPT,
} from "./phonics/prompts.js";

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

const storyResponseSchema = z.object({
  title: z.string().optional(),
  story: z.string().optional(),
  pages: z
    .array(z.union([z.string(), z.object({ text: z.string() })]))
    .optional(),
});

const artResponseSchema = z.object({
  characters: z.record(z.string(), z.string()).optional(),
  imagePrompts: z.array(z.string()).optional(),
});

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
    const stage = getPhonicsStage(maxLetters);
    log(`Using text model: ${modelName}`);
    log(`Using image model: ${imageModelName}`);
    log(`Phonics stage: ${stage.name}`);

    const storyPrompt = buildStoryUserPrompt(topic, stage);
    log("Generating story pages...");

    let storyRaw = "";
    try {
      const result = await generateText({
        model: modelName,
        system: STORY_SYSTEM_PROMPT,
        prompt: storyPrompt,
        temperature: 0.5,
      });
      storyRaw = result.text.trim();
      log(`Story model responded (${result.usage?.totalTokens ?? "?"} tokens)`);
    } catch (error) {
      return handleGatewayError(res, error, log);
    }

    let { title, pages } = normalizeStory(storyRaw, topic);
    let storyText = joinPages(pages);
    let repaired = false;

    const firstIllegal = findIllegalWords(storyText, stage);
    if (firstIllegal.length > 0) {
      log(
        `Illegal words: ${firstIllegal.map((item) => item.word).join(", ")}`
      );
      const repairHint = buildRepairHint(firstIllegal);
      try {
        const repairResult = await generateText({
          model: modelName,
          system: STORY_SYSTEM_PROMPT,
          prompt: buildStoryUserPrompt(topic, stage, repairHint),
          temperature: 0.3,
        });
        const repairedStory = normalizeStory(repairResult.text.trim(), topic);
        const repairedText = joinPages(repairedStory.pages);
        const stillIllegal = findIllegalWords(repairedText, stage);
        if (
          stillIllegal.length < firstIllegal.length ||
          stillIllegal.length === 0
        ) {
          title = repairedStory.title;
          pages = repairedStory.pages;
          storyText = repairedText;
          repaired = true;
          log(
            stillIllegal.length === 0
              ? "Repair pass cleared illegal words"
              : `Repair pass reduced illegal words to: ${stillIllegal
                  .map((item) => item.word)
                  .join(", ")}`
          );
        } else {
          log("Repair pass did not improve the story; keeping first draft");
        }
      } catch (error) {
        log(
          `Repair pass skipped: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    log(`Title: "${title}"`);
    log(`Pages: ${pages.length}`);

    let characters: Record<string, string> = {};
    let imagePrompts: string[] = [];

    try {
      log("Generating illustration prompts...");
      const artResult = await generateText({
        model: modelName,
        prompt: buildArtUserPrompt(title, pages),
        temperature: 0.6,
      });
      const art = normalizeArt(artResult.text.trim());
      characters = art.characters;
      imagePrompts = pages.map((page, index) =>
        injectImagePrompt(art.imagePrompts[index] || page, characters)
      );
      log(
        `Art model responded with ${Object.keys(characters).length} characters and ${imagePrompts.length} prompts`
      );
    } catch (error) {
      log(
        `Art pass skipped: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    const imageUrls = imagePrompts.map((imagePrompt) =>
      buildImageProxyUrl(imagePrompt, imageModelName)
    );

    const isDevMode =
      process.env.NODE_ENV !== "production" && !process.env.VERCEL;

    return res.status(200).json({
      title,
      story: storyText,
      pages,
      characters,
      imagePrompts,
      imageUrls,
      budget,
      debug: {
        time: Date.now() - startTime,
        model: modelName,
        imageModel: imageModelName,
        textApi: "ai-gateway",
        gatewayConfigured: hasGatewayAuth(),
        phonicsStage: stage.name,
        repaired,
        ...(isDevMode && {
          fullPrompt: storyPrompt,
          rawResponse: storyRaw,
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

function parseJsonObject(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    const stripped = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    try {
      return JSON.parse(stripped);
    } catch {
      const start = stripped.indexOf("{");
      const end = stripped.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(stripped.slice(start, end + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  }
}

function normalizeStory(
  raw: string,
  fallbackTitle: string
): { title: string; pages: string[] } {
  const parsed = parseJsonObject(raw);
  const result = storyResponseSchema.safeParse(parsed);

  let title = fallbackTitle;
  let pages: string[] = [];

  if (result.success) {
    if (result.data.title?.trim()) {
      title = result.data.title.trim();
    }
    if (result.data.pages && result.data.pages.length > 0) {
      pages = result.data.pages
        .map((page) => (typeof page === "string" ? page : page.text).trim())
        .filter(Boolean);
    } else if (result.data.story?.trim()) {
      pages = splitIntoPages(result.data.story.trim(), 4);
    }
  }

  if (pages.length === 0) {
    pages = splitIntoPages(raw, 4);
  }

  while (pages.length < 4) {
    pages.push(pages[pages.length - 1] || "");
  }

  return { title, pages: pages.slice(0, 4) };
}

function normalizeArt(raw: string): {
  characters: Record<string, string>;
  imagePrompts: string[];
} {
  const parsed = parseJsonObject(raw);
  const result = artResponseSchema.safeParse(parsed);
  if (!result.success) {
    return { characters: {}, imagePrompts: [] };
  }

  return {
    characters: result.data.characters ?? {},
    imagePrompts: (result.data.imagePrompts ?? [])
      .map((prompt) => prompt.trim())
      .filter(Boolean)
      .slice(0, 4),
  };
}

function joinPages(pages: string[]): string {
  return pages.map((page) => page.trim()).filter(Boolean).join("\n\n");
}

function splitIntoPages(text: string, count: number): string[] {
  const paragraphs = text
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (paragraphs.length >= 2) {
    return paragraphs.slice(0, count);
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (sentences.length === 0) return [text.trim()].filter(Boolean);

  const pages: string[] = [];
  const base = Math.max(1, Math.floor(sentences.length / count));
  let index = 0;
  for (let i = 0; i < count && index < sentences.length; i += 1) {
    const remainingPages = count - i;
    const remainingSentences = sentences.length - index;
    const take = i === count - 1
      ? remainingSentences
      : Math.max(1, Math.min(base, remainingSentences - remainingPages + 1));
    pages.push(sentences.slice(index, index + take).join(" "));
    index += take;
  }
  return pages;
}

function buildImageProxyUrl(prompt: string, model: string): string {
  const token = createImageProxyToken(prompt, model);
  const params = new URLSearchParams({ token });
  return `/api/image?${params.toString()}`;
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

export const config = {
  maxDuration: 60,
};
