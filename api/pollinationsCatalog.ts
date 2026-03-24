const MODELS_URL = "https://gen.pollinations.ai/v1/models";
const LEGACY_TEXT_MODELS_URL = "https://gen.pollinations.ai/text/models";
const LEGACY_IMAGE_MODELS_URL = "https://gen.pollinations.ai/image/models";
const CACHE_TTL_MS = 5 * 60 * 1000;
const MODEL_DEBUG_ENABLED =
  process.env.MODEL_SELECTION_DEBUG === "true" ||
  process.env.NODE_ENV !== "production";
const MODEL_INCLUDE_EXPERIMENTAL =
  process.env.MODEL_INCLUDE_EXPERIMENTAL === "true";

const TEXT_ROLE_PREFERENCES = {
  fastest: ["gemini-fast", "openai-fast", "nova-fast", "mistral"],
  balanced: ["openai", "gemini-fast", "mistral"],
  quality: ["openai-large", "openai", "claude-fast"],
} as const;

const BLOCKED_TEXT_MODEL_IDS = new Set(["deepseek", "glm"]);
const BLOCKED_IMAGE_MODEL_IDS = new Set(["gptimage", "gptimage-large"]);

const IMAGE_ROLE_PREFERENCES = {
  bestValue: ["grok-imagine", "klein", "qwen-image", "nanobanana-2"],
  balanced: ["klein", "grok-imagine", "qwen-image", "nanobanana-2"],
  topQuality: [
    "grok-imagine-pro",
    "nanobanana-pro",
    "qwen-image",
    "nanobanana-2",
  ],
  alternative: ["qwen-image", "grok-imagine", "klein", "nanobanana-2"],
} as const;

type PollinationsPricing = {
  currency?: string;
  promptTextTokens?: number;
  promptImageTokens?: number;
  completionTextTokens?: number;
  completionImageTokens?: number;
};

type PollinationsModel = {
  name: string;
  aliases: string[];
  description?: string;
  pricing?: PollinationsPricing;
  input_modalities: string[];
  output_modalities: string[];
  supported_endpoints: string[];
  reasoning?: boolean;
  is_specialized?: boolean;
  paid_only?: boolean;
};

type PollinationsModelEnvelope = {
  data?: unknown;
};

export type CuratedModelOption = {
  id: string;
  name: string;
  description: string;
  paidOnly?: boolean;
};

export type CuratedModelCatalog = {
  textModels: CuratedModelOption[];
  imageModels: CuratedModelOption[];
};

export const DEFAULT_TEXT_MODELS: CuratedModelOption[] = [
  {
    id: "gemini-fast",
    name: "Gemini 2.5 Flash Lite",
    description: "Fastest and cheapest",
  },
  {
    id: "openai",
    name: "GPT-5 Mini",
    description: "Balanced quality and speed",
  },
  {
    id: "openai-large",
    name: "GPT-5.2",
    description: "Highest quality writing",
    paidOnly: true,
  },
];

export const DEFAULT_IMAGE_MODELS: CuratedModelOption[] = [
  {
    id: "grok-imagine",
    name: "Grok Imagine",
    description: "Best value image quality",
  },
  {
    id: "klein",
    name: "FLUX.2 Klein 4B",
    description: "Balanced quality and price",
  },
  {
    id: "qwen-image",
    name: "Qwen Image Plus",
    description: "Alternative high-quality style",
  },
];

let cachedCatalog: { expiresAt: number; value: CuratedModelCatalog } | null =
  null;

const TEXT_EXCLUDE_HINTS =
  /\b(coder|code|search|web|audio|music|tutor|roleplay|character|research|crawl|scrape)\b/i;
const IMAGE_HIGH_QUALITY_HINTS =
  /\b(higher quality|better quality|advanced|latest|4k|multi-image|pro)\b/i;
const IMAGE_LOW_QUALITY_HINTS = /\b(fast|turbo|schnell|6b)\b/i;
const IMAGE_UNSTABLE_HINTS = /\b(alpha|preview)\b/i;

type ScoredTextModel = PollinationsModel & {
  estimatedCost: number;
  qualityScore: number;
};

type ScoredImageModel = PollinationsModel & {
  estimatedCost: number;
  qualityScore: number;
};

export async function getCuratedModelCatalog(): Promise<CuratedModelCatalog> {
  if (cachedCatalog && cachedCatalog.expiresAt > Date.now()) {
    return cachedCatalog.value;
  }

  try {
    const { textModels, imageModels } = await fetchPollinationsModels();

    const nextCatalog: CuratedModelCatalog = {
      textModels: selectTextModelSpread(textModels),
      imageModels: selectImageModelSpread(imageModels),
    };

    debugLog(
      `Catalog refresh complete: text=[${nextCatalog.textModels
        .map((m) => m.id)
        .join(", ")}], image=[${nextCatalog.imageModels
        .map((m) => m.id)
        .join(", ")}]`
    );

    const safeCatalog: CuratedModelCatalog = {
      textModels:
        nextCatalog.textModels.length >= 3
          ? nextCatalog.textModels
          : DEFAULT_TEXT_MODELS,
      imageModels:
        nextCatalog.imageModels.length >= 3
          ? nextCatalog.imageModels
          : DEFAULT_IMAGE_MODELS,
    };

    cachedCatalog = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value: safeCatalog,
    };

    return safeCatalog;
  } catch (error) {
    console.warn("Failed to load live Pollinations model catalog:", error);
    return {
      textModels: DEFAULT_TEXT_MODELS,
      imageModels: DEFAULT_IMAGE_MODELS,
    };
  }
}

async function fetchPollinationsModels(): Promise<{
  textModels: PollinationsModel[];
  imageModels: PollinationsModel[];
}> {
  const [modelsResult, legacyTextResult, legacyImageResult] =
    await Promise.allSettled([
      fetchNormalizedModels(MODELS_URL),
      fetchNormalizedModels(LEGACY_TEXT_MODELS_URL),
      fetchNormalizedModels(LEGACY_IMAGE_MODELS_URL),
    ]);

  const legacyModels = mergeDuplicateModels([
    ...(legacyTextResult.status === "fulfilled" ? legacyTextResult.value : []),
    ...(legacyImageResult.status === "fulfilled" ? legacyImageResult.value : []),
  ]);

  if (modelsResult.status === "fulfilled") {
    const mergedModels = mergeModelMetadata(modelsResult.value, legacyModels);
    return splitDiscoveredModels(mergedModels);
  }

  if (legacyModels.length > 0) {
    debugLog(
      `Falling back to legacy model endpoints after /v1/models failed: ${
        modelsResult.reason instanceof Error
          ? modelsResult.reason.message
          : String(modelsResult.reason)
      }`
    );
    return splitDiscoveredModels(legacyModels);
  }

  throw new Error(
    `Failed to load Pollinations model catalogs: ${collectModelFetchErrorMessages(
      modelsResult,
      legacyTextResult,
      legacyImageResult
    )}`
  );
}

async function fetchNormalizedModels(url: string): Promise<PollinationsModel[]> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Model catalog fetch failed (${response.status}) for ${url}`
    );
  }

  const data = (await response.json()) as unknown;
  return normalizeModelResponse(data, url);
}

function normalizeModelResponse(
  data: unknown,
  url: string
): PollinationsModel[] {
  if (Array.isArray(data)) {
    return data.map(normalizeModelEntry).filter(isDefined);
  }

  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as PollinationsModelEnvelope).data)
  ) {
    const entries = (data as PollinationsModelEnvelope).data as unknown[];
    return entries.map(normalizeModelEntry).filter(isDefined);
  }

  throw new Error(`Unexpected model catalog format for ${url}`);
}

function normalizeModelEntry(entry: unknown): PollinationsModel | null {
  if (!entry || typeof entry !== "object") return null;

  const raw = entry as Record<string, unknown>;
  const name = readString(raw.name) ?? readString(raw.id);
  if (!name) return null;

  return {
    name,
    aliases: normalizeStringArray(raw.aliases),
    description: readString(raw.description),
    pricing: normalizePricing(raw.pricing),
    input_modalities: normalizeStringArray(raw.input_modalities),
    output_modalities: normalizeStringArray(raw.output_modalities),
    supported_endpoints: normalizeStringArray(raw.supported_endpoints),
    reasoning: raw.reasoning === true ? true : undefined,
    is_specialized: raw.is_specialized === true ? true : undefined,
    paid_only: raw.paid_only === true ? true : undefined,
  };
}

function normalizePricing(value: unknown): PollinationsPricing | undefined {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as Record<string, unknown>;
  const pricing: PollinationsPricing = {
    currency: readString(raw.currency),
    promptTextTokens: toFiniteNumber(raw.promptTextTokens),
    promptImageTokens: toFiniteNumber(raw.promptImageTokens),
    completionTextTokens: toFiniteNumber(raw.completionTextTokens),
    completionImageTokens: toFiniteNumber(raw.completionImageTokens),
  };

  if (
    !pricing.currency &&
    pricing.promptTextTokens === undefined &&
    pricing.promptImageTokens === undefined &&
    pricing.completionTextTokens === undefined &&
    pricing.completionImageTokens === undefined
  ) {
    return undefined;
  }

  return pricing;
}

function splitDiscoveredModels(models: PollinationsModel[]): {
  textModels: PollinationsModel[];
  imageModels: PollinationsModel[];
} {
  return {
    textModels: models.filter(isDiscoveredTextModel),
    imageModels: models.filter(isDiscoveredImageModel),
  };
}

function isDiscoveredTextModel(model: PollinationsModel): boolean {
  return (
    model.output_modalities.includes("text") ||
    model.supported_endpoints.some(
      (endpoint) =>
        endpoint === "/v1/chat/completions" || endpoint.startsWith("/text/")
    )
  );
}

function isDiscoveredImageModel(model: PollinationsModel): boolean {
  return (
    model.output_modalities.includes("image") ||
    model.supported_endpoints.some(
      (endpoint) =>
        endpoint === "/image/{prompt}" || endpoint.startsWith("/v1/images/")
    )
  );
}

function mergeModelMetadata(
  primaryModels: PollinationsModel[],
  secondaryModels: PollinationsModel[]
): PollinationsModel[] {
  if (secondaryModels.length === 0) {
    return mergeDuplicateModels(primaryModels);
  }

  const secondaryLookup = createModelLookup(secondaryModels);
  const mergedPrimary = primaryModels.map((primaryModel) => {
    const match = collectModelKeys(primaryModel)
      .map((key) => secondaryLookup.get(key))
      .find(isDefined);

    return mergeModel(primaryModel, match);
  });

  const knownKeys = new Set(
    mergedPrimary.flatMap((model) => collectModelKeys(model))
  );
  const unmatchedSecondary = secondaryModels.filter(
    (model) => !collectModelKeys(model).some((key) => knownKeys.has(key))
  );

  return mergeDuplicateModels([...mergedPrimary, ...unmatchedSecondary]);
}

function mergeDuplicateModels(models: PollinationsModel[]): PollinationsModel[] {
  const deduped = new Map<string, PollinationsModel>();

  for (const model of models) {
    const existing = deduped.get(model.name);
    deduped.set(model.name, existing ? mergeModel(existing, model) : model);
  }

  return Array.from(deduped.values());
}

function mergeModel(
  primaryModel: PollinationsModel,
  secondaryModel?: PollinationsModel
): PollinationsModel {
  if (!secondaryModel) return primaryModel;

  return {
    name: primaryModel.name,
    aliases: dedupeStrings([
      ...primaryModel.aliases,
      ...secondaryModel.aliases,
    ]),
    description: primaryModel.description ?? secondaryModel.description,
    pricing: primaryModel.pricing ?? secondaryModel.pricing,
    input_modalities: dedupeStrings([
      ...primaryModel.input_modalities,
      ...secondaryModel.input_modalities,
    ]),
    output_modalities: dedupeStrings([
      ...primaryModel.output_modalities,
      ...secondaryModel.output_modalities,
    ]),
    supported_endpoints: dedupeStrings([
      ...primaryModel.supported_endpoints,
      ...secondaryModel.supported_endpoints,
    ]),
    reasoning: primaryModel.reasoning ?? secondaryModel.reasoning,
    is_specialized: primaryModel.is_specialized ?? secondaryModel.is_specialized,
    paid_only: primaryModel.paid_only ?? secondaryModel.paid_only,
  };
}

function createModelLookup(
  models: PollinationsModel[]
): Map<string, PollinationsModel> {
  const lookup = new Map<string, PollinationsModel>();

  for (const model of models) {
    for (const key of collectModelKeys(model)) {
      if (!lookup.has(key)) {
        lookup.set(key, model);
      }
    }
  }

  return lookup;
}

function collectModelKeys(model: PollinationsModel): string[] {
  return dedupeStrings([model.name, ...model.aliases].map(normalizeLookupKey));
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => readString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function collectModelFetchErrorMessages(
  ...results: PromiseSettledResult<PollinationsModel[]>[]
): string {
  return results
    .filter(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    )
    .map((result) =>
      result.reason instanceof Error ? result.reason.message : String(result.reason)
    )
    .join(" | ");
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function selectTextModelSpread(
  models: PollinationsModel[]
): CuratedModelOption[] {
  const rejected = models
    .map((model) => ({
      model,
      reason: getRejectedTextReason(model),
    }))
    .filter((item) => item.reason);

  if (rejected.length > 0) {
    debugLog(
      `Text rejects (${rejected.length}): ${rejected
        .map((item) => `${item.model.name}(${item.reason})`)
        .join(", ")}`
    );
  }

  const scoredPool = models
    .filter(isStoryTextModelCandidate)
    .map((model) => ({
      ...model,
      estimatedCost: estimateTextCost(model),
      qualityScore: estimateTextQuality(model),
    }))
    .sort((a, b) => a.estimatedCost - b.estimatedCost);

  if (scoredPool.length === 0) return [];

  const primaryPool = choosePrimaryPool(scoredPool);
  const strongQualityPool =
    primaryPool.filter((model) => model.qualityScore >= 1).length >= 3
      ? primaryPool.filter((model) => model.qualityScore >= 1)
      : primaryPool;
  const selected: ScoredTextModel[] = [];

  debugLog(
    `Text scored pool (${scoredPool.length}): ${scoredPool
      .map(
        (m) =>
          `${m.name}{cost=${m.estimatedCost.toExponential(
            2
          )},quality=${m.qualityScore.toFixed(2)},paid=${Boolean(m.paid_only)}}`
      )
      .join(", ")}`
  );
  debugLog(
    `Text primary pool (${primaryPool.length}): ${primaryPool
      .map((m) => m.name)
      .join(", ")}`
  );
  debugLog(
    `Text strong-quality pool (${strongQualityPool.length}): ${strongQualityPool
      .map((m) => m.name)
      .join(", ")}`
  );

  const fastest =
    pickPreferredById(strongQualityPool, TEXT_ROLE_PREFERENCES.fastest) ??
    [...strongQualityPool].sort((a, b) => a.estimatedCost - b.estimatedCost)[0];
  addUnique(selected, fastest);

  const balanced =
    pickPreferredById(
      strongQualityPool,
      TEXT_ROLE_PREFERENCES.balanced,
      selected
    ) ??
    pickClosestByCost(
      strongQualityPool,
      medianCost(strongQualityPool),
      selected
    );
  addUnique(selected, balanced);

  const highestQuality =
    pickPreferredById(
      strongQualityPool,
      TEXT_ROLE_PREFERENCES.quality,
      selected
    ) ??
    [...strongQualityPool]
      .sort((a, b) =>
        b.qualityScore === a.qualityScore
          ? b.estimatedCost - a.estimatedCost
          : b.qualityScore - a.qualityScore
      )
      .find((model) => !selected.some((item) => item.name === model.name));
  addUnique(selected, highestQuality);

  for (const candidate of strongQualityPool) {
    if (selected.length >= 4) break;
    addUnique(selected, candidate);
  }

  const chosen = selected.slice(0, 4).map((model, index) => {
    const label =
      index === 0
        ? "🐇 Fastest"
        : index === 1
        ? "⚖️ Balanced"
        : index === 2
        ? "🏆 Highest quality"
        : "✨ Extra option";

    return buildModelOption(model, label);
  });

  debugLog(
    `Text picks: ${chosen
      .map((item) => `${item.id}[${item.description}]`)
      .join(", ")}`
  );
  return chosen;
}

function selectImageModelSpread(
  models: PollinationsModel[]
): CuratedModelOption[] {
  const rejected = models
    .map((model) => ({
      model,
      reason: getRejectedImageReason(model),
    }))
    .filter((item) => item.reason);

  if (rejected.length > 0) {
    debugLog(
      `Image rejects (${rejected.length}): ${rejected
        .map((item) => `${item.model.name}(${item.reason})`)
        .join(", ")}`
    );
  }

  const scoredPool = models
    .filter(isStoryImageModelCandidate)
    .map((model) => ({
      ...model,
      estimatedCost: estimateImageCost(model),
      qualityScore: estimateImageQuality(model),
    }))
    .sort((a, b) => a.estimatedCost - b.estimatedCost);

  if (scoredPool.length === 0) return [];

  const primaryPool = choosePrimaryPool(scoredPool);
  const strongQualityPool =
    primaryPool.filter((model) => model.qualityScore >= 1).length >= 3
      ? primaryPool.filter((model) => model.qualityScore >= 1)
      : primaryPool.filter((model) => model.qualityScore >= 0).length >= 3
      ? primaryPool.filter((model) => model.qualityScore >= 0)
      : primaryPool;
  const selected: ScoredImageModel[] = [];

  debugLog(
    `Image scored pool (${scoredPool.length}): ${scoredPool
      .map(
        (m) =>
          `${m.name}{cost=${m.estimatedCost.toExponential(
            2
          )},quality=${m.qualityScore.toFixed(2)},paid=${Boolean(m.paid_only)}}`
      )
      .join(", ")}`
  );
  debugLog(
    `Image primary pool (${primaryPool.length}): ${primaryPool
      .map((m) => m.name)
      .join(", ")}`
  );
  debugLog(
    `Image strong-quality pool (${
      strongQualityPool.length
    }): ${strongQualityPool.map((m) => m.name).join(", ")}`
  );

  const budgetQuality =
    pickPreferredById(
      strongQualityPool,
      IMAGE_ROLE_PREFERENCES.bestValue,
      selected
    ) ?? [...strongQualityPool].sort(byQualityThenCost)[0];
  addUnique(selected, budgetQuality);

  const balancedQuality =
    pickPreferredById(
      strongQualityPool,
      IMAGE_ROLE_PREFERENCES.balanced,
      selected
    ) ??
    pickClosestByCost(
      strongQualityPool,
      medianCost(strongQualityPool),
      selected
    );
  addUnique(selected, balancedQuality);

  const topQuality =
    pickPreferredById(
      strongQualityPool,
      IMAGE_ROLE_PREFERENCES.topQuality,
      selected
    ) ??
    [...strongQualityPool]
      .sort((a, b) =>
        b.qualityScore === a.qualityScore
          ? b.estimatedCost - a.estimatedCost
          : b.qualityScore - a.qualityScore
      )
      .find((model) => !selected.some((item) => item.name === model.name));
  addUnique(selected, topQuality);

  const alternative =
    pickPreferredById(
      strongQualityPool,
      IMAGE_ROLE_PREFERENCES.alternative,
      selected
    ) ??
    [...strongQualityPool]
      .sort(byQualityThenCost)
      .find((model) => !selected.some((item) => item.name === model.name));
  addUnique(selected, alternative);

  for (const candidate of strongQualityPool) {
    if (selected.length >= 4) break;
    addUnique(selected, candidate);
  }

  const chosen = selected.slice(0, 4).map((model, index) => {
    const label =
      index === 0
        ? "💰 Best value quality"
        : index === 1
        ? "⚖️ Balanced quality"
        : index === 2
        ? "🏆 Top quality"
        : "💡 Quality alternative";
    return buildModelOption(model, label);
  });

  debugLog(
    `Image picks: ${chosen
      .map((item) => `${item.id}[${item.description}]`)
      .join(", ")}`
  );
  return chosen;
}

function choosePrimaryPool<
  T extends PollinationsModel & { estimatedCost: number }
>(models: T[]): T[] {
  const freePool = models.filter((model) => !model.paid_only);
  if (freePool.length >= 3) {
    return freePool;
  }
  return models;
}

function isStoryTextModelCandidate(model: PollinationsModel): boolean {
  return !getRejectedTextReason(model);
}

function isStoryImageModelCandidate(model: PollinationsModel): boolean {
  return !getRejectedImageReason(model);
}

function getRejectedTextReason(model: PollinationsModel): string | null {
  if (model.is_specialized) return "specialized";
  if (BLOCKED_TEXT_MODEL_IDS.has(model.name)) return "blocked";

  const inputModalities = model.input_modalities ?? [];
  const outputModalities = model.output_modalities ?? [];
  if (!inputModalities.includes("text")) return "missing_text_input";
  if (!outputModalities.includes("text")) return "missing_text_output";

  const hintText = `${model.name} ${model.description ?? ""}`;
  if (TEXT_EXCLUDE_HINTS.test(hintText)) return "excluded_by_hint";

  return null;
}

function getRejectedImageReason(model: PollinationsModel): string | null {
  if (BLOCKED_IMAGE_MODEL_IDS.has(model.name)) return "blocked";
  const inputModalities = model.input_modalities ?? [];
  const outputModalities = model.output_modalities ?? [];
  if (!inputModalities.includes("text")) return "missing_text_input";
  if (!outputModalities.includes("image")) return "not_image_output";
  if (!MODEL_INCLUDE_EXPERIMENTAL && isExperimentalModel(model)) {
    return "experimental";
  }
  return null;
}

function estimateTextCost(model: PollinationsModel): number {
  const prompt = model.pricing?.promptTextTokens ?? 0;
  const completion = model.pricing?.completionTextTokens ?? 0;
  const promptTokenBudget = 900;
  const completionTokenBudget = 350;
  return prompt * promptTokenBudget + completion * completionTokenBudget;
}

function estimateImageCost(model: PollinationsModel): number {
  const completionImage =
    model.pricing?.completionImageTokens ?? Number.POSITIVE_INFINITY;
  const promptText = model.pricing?.promptTextTokens ?? 0;
  const promptImage = model.pricing?.promptImageTokens ?? 0;
  const promptTokenBudget = 1200;
  return (
    completionImage +
    promptText * promptTokenBudget +
    promptImage * promptTokenBudget
  );
}

function estimateImageQuality(model: PollinationsModel): number {
  const text = `${model.name} ${model.description ?? ""}`.toLowerCase();
  let score = 0;

  if ((model.input_modalities ?? []).includes("image")) score += 1.5;
  if (IMAGE_HIGH_QUALITY_HINTS.test(text)) score += 2;
  if (IMAGE_LOW_QUALITY_HINTS.test(text)) score -= 1.25;
  if (IMAGE_UNSTABLE_HINTS.test(text)) score -= 0.75;

  return score;
}

function estimateTextQuality(model: PollinationsModel): number {
  const text = `${model.name} ${model.description ?? ""}`.toLowerCase();
  let score = 0;

  if ((model.input_modalities ?? []).includes("image")) score += 1;
  if (model.reasoning) score += 1;
  if (
    /\b(powerful|capable|flagship|balanced|intelligent|reasoning)\b/i.test(text)
  ) {
    score += 1;
  }
  if (/\b(ultra cheap|micro|alpha|preview)\b/i.test(text)) {
    score -= 1;
  }

  return score;
}

function isExperimentalModel(model: PollinationsModel): boolean {
  const text = `${model.name} ${model.description ?? ""}`;
  return IMAGE_UNSTABLE_HINTS.test(text);
}

function pickPreferredById<T extends { name: string }>(
  models: T[],
  preferredIds: readonly string[],
  alreadySelected: T[] = []
): T | undefined {
  return preferredIds
    .map((id) => models.find((model) => model.name === id))
    .find((candidate): candidate is T =>
      Boolean(
        candidate &&
          !alreadySelected.some((item) => item.name === candidate.name)
      )
    );
}

function buildModelOption(
  model: PollinationsModel,
  label: string
): CuratedModelOption {
  const paidLabel = model.paid_only ? "Paid model" : null;
  const description = [label, paidLabel].filter(Boolean).join(" - ");

  return {
    id: model.name,
    name: getDisplayName(model),
    description,
    paidOnly: model.paid_only,
  };
}

function getDisplayName(model: PollinationsModel): string {
  const fromDescription = model.description?.split(" - ")[0]?.trim();
  if (fromDescription) return fromDescription;
  return model.name
    .split(/[-_]/g)
    .map((token) =>
      token.length > 0 ? token[0].toUpperCase() + token.slice(1) : token
    )
    .join(" ");
}

function medianCost<T extends { estimatedCost: number }>(models: T[]): number {
  if (models.length === 0) return 0;
  const sorted = [...models].sort((a, b) => a.estimatedCost - b.estimatedCost);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[mid].estimatedCost;
  }
  return (sorted[mid - 1].estimatedCost + sorted[mid].estimatedCost) / 2;
}

function pickClosestByCost<T extends { estimatedCost: number; name: string }>(
  models: T[],
  targetCost: number,
  alreadySelected: T[]
): T | undefined {
  return models
    .filter(
      (model) => !alreadySelected.some((item) => item.name === model.name)
    )
    .sort(
      (a, b) =>
        Math.abs(a.estimatedCost - targetCost) -
        Math.abs(b.estimatedCost - targetCost)
    )[0];
}

function addUnique<T extends { name: string }>(
  items: T[],
  candidate?: T
): void {
  if (!candidate) return;
  if (items.some((item) => item.name === candidate.name)) return;
  items.push(candidate);
}

function byQualityThenCost(a: ScoredImageModel, b: ScoredImageModel): number {
  if (b.qualityScore === a.qualityScore) {
    return a.estimatedCost - b.estimatedCost;
  }
  return b.qualityScore - a.qualityScore;
}

function debugLog(message: string): void {
  if (!MODEL_DEBUG_ENABLED) return;
  console.log(`[model-selection] ${message}`);
}
