import {
  resolveImageModelId,
  resolveTextModelId,
} from "./modelCatalog.js";

const CREDITS_URL = "https://ai-gateway.vercel.sh/v1/credits";
const MODELS_URL = "https://ai-gateway.vercel.sh/v1/models";
const IMAGES_PER_STORY = 4;
const ESTIMATED_TEXT_INPUT_TOKENS = 2800;
const ESTIMATED_TEXT_OUTPUT_TOKENS = 800;
const PRICING_CACHE_TTL_MS = 10 * 60 * 1000;

export type StoryCostEstimate = {
  textUsd: number;
  imageUsd: number;
  storyUsd: number;
  imageCount: number;
  textModel: string;
  imageModel: string;
};

export type StoryBudget = {
  remainingUsd: number | null;
  totalUsedUsd: number | null;
  estimate: StoryCostEstimate;
  approxStories: number | null;
};

type GatewayCreditsResponse = {
  balance?: string;
  total_used?: string;
};

type GatewayModelPricing = {
  input?: string;
  output?: string;
  image?: string;
};

type GatewayModel = {
  id?: string;
  type?: string;
  pricing?: GatewayModelPricing;
};

type PricingTable = {
  fetchedAt: number;
  text: Map<string, { input: number; output: number }>;
  image: Map<string, number>;
};

const IMAGE_PRICE_FALLBACKS: Record<string, number> = {
  "bytedance/seedream-5.0-lite": 0.035,
  "bfl/flux-kontext-pro": 0.04,
};

let pricingCache: PricingTable | null = null;

export function hasGatewayAuth(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
      process.env.VERCEL_OIDC_TOKEN?.trim()
  );
}

function getGatewayAuthHeaders(): Record<string, string> | null {
  const token =
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.VERCEL_OIDC_TOKEN?.trim();
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

function parseUsd(value: string | undefined): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function loadPricing(): Promise<PricingTable> {
  if (pricingCache && Date.now() - pricingCache.fetchedAt < PRICING_CACHE_TTL_MS) {
    return pricingCache;
  }

  const text = new Map<string, { input: number; output: number }>();
  const image = new Map<string, number>();

  try {
    const response = await fetch(MODELS_URL);
    if (response.ok) {
      const payload = (await response.json()) as { data?: GatewayModel[] };
      for (const model of payload.data ?? []) {
        if (typeof model.id !== "string" || !model.pricing) continue;
        const input = parseUsd(model.pricing.input);
        const output = parseUsd(model.pricing.output);
        if (input !== null && output !== null) {
          text.set(model.id, { input, output });
        }
        const imagePrice = parseUsd(model.pricing.image);
        if (imagePrice !== null && imagePrice > 0) {
          image.set(model.id, imagePrice);
        }
      }
    }
  } catch (error) {
    console.warn("Failed to load AI Gateway model pricing:", error);
  }

  pricingCache = {
    fetchedAt: Date.now(),
    text,
    image,
  };
  return pricingCache;
}

function estimateTextCost(
  modelId: string,
  pricing: PricingTable
): number {
  const rates = pricing.text.get(modelId);
  if (!rates) return 0.002;
  return (
    rates.input * ESTIMATED_TEXT_INPUT_TOKENS +
    rates.output * ESTIMATED_TEXT_OUTPUT_TOKENS
  );
}

function estimateImageUnitCost(
  modelId: string,
  pricing: PricingTable
): number {
  return (
    pricing.image.get(modelId) ??
    IMAGE_PRICE_FALLBACKS[modelId] ??
    0.04
  );
}

export function estimateStoryCost(
  textModel: string,
  imageModel: string,
  pricing: PricingTable
): StoryCostEstimate {
  const textUsd = estimateTextCost(textModel, pricing);
  const imageUsd = estimateImageUnitCost(imageModel, pricing) * IMAGES_PER_STORY;
  return {
    textUsd,
    imageUsd,
    storyUsd: textUsd + imageUsd,
    imageCount: IMAGES_PER_STORY,
    textModel,
    imageModel,
  };
}

export async function fetchRemainingCredits(): Promise<{
  remainingUsd: number | null;
  totalUsedUsd: number | null;
}> {
  const headers = getGatewayAuthHeaders();
  if (!headers) {
    return { remainingUsd: null, totalUsedUsd: null };
  }

  try {
    const response = await fetch(CREDITS_URL, { headers });
    if (!response.ok) {
      console.warn(
        `AI Gateway credits request failed: ${response.status} ${await response
          .text()
          .then((text) => text.slice(0, 200))}`
      );
      return { remainingUsd: null, totalUsedUsd: null };
    }
    const payload = (await response.json()) as GatewayCreditsResponse;
    return {
      remainingUsd: parseUsd(payload.balance),
      totalUsedUsd: parseUsd(payload.total_used),
    };
  } catch (error) {
    console.warn("Failed to load AI Gateway credits:", error);
    return { remainingUsd: null, totalUsedUsd: null };
  }
}

export async function getStoryBudget(
  requestedTextModel?: string,
  requestedImageModel?: string
): Promise<StoryBudget> {
  const textModel = resolveTextModelId(requestedTextModel);
  const imageModel = resolveImageModelId(requestedImageModel);
  const [pricing, credits] = await Promise.all([
    loadPricing(),
    fetchRemainingCredits(),
  ]);
  const estimate = estimateStoryCost(textModel, imageModel, pricing);
  const approxStories =
    credits.remainingUsd !== null && estimate.storyUsd > 0
      ? credits.remainingUsd / estimate.storyUsd
      : null;

  return {
    remainingUsd: credits.remainingUsd,
    totalUsedUsd: credits.totalUsedUsd,
    estimate,
    approxStories,
  };
}
