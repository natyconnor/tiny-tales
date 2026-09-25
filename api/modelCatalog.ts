export type CuratedModelOption = {
  id: string;
  name: string;
  description: string;
};

export type CuratedModelCatalog = {
  textModels: CuratedModelOption[];
  imageModels: CuratedModelOption[];
};

/** Curated defaults tuned for kids' stories + free-tier cost. */
export const DEFAULT_TEXT_MODELS: CuratedModelOption[] = [
  {
    id: "google/gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    description: "Fastest and cheapest",
  },
  {
    id: "alibaba/qwen3.7-flash",
    name: "Qwen 3.7 Flash",
    description: "Stronger writing, still cheap",
  },
  {
    id: "xiaomi/mimo-v2.6-flash",
    name: "MiMo 2.6 Flash",
    description: "Newest free-tier flash model",
  },
];

export const DEFAULT_IMAGE_MODELS: CuratedModelOption[] = [
  {
    id: "bytedance/seedream-5.0-lite",
    name: "Seedream 5.0 Lite",
    description: "Stronger illustration quality",
  },
  {
    id: "bfl/flux-kontext-pro",
    name: "FLUX Kontext Pro",
    description: "Stronger prompt following",
  },
];

export async function getCuratedModelCatalog(): Promise<CuratedModelCatalog> {
  return {
    textModels: DEFAULT_TEXT_MODELS,
    imageModels: DEFAULT_IMAGE_MODELS,
  };
}

export function resolveTextModelId(requested: string | undefined): string {
  const allowed = DEFAULT_TEXT_MODELS.map((m) => m.id);
  if (requested && allowed.includes(requested)) return requested;
  return DEFAULT_TEXT_MODELS[0].id;
}

export function resolveImageModelId(requested: string | undefined): string {
  const allowed = DEFAULT_IMAGE_MODELS.map((m) => m.id);
  if (requested && allowed.includes(requested)) return requested;
  return DEFAULT_IMAGE_MODELS[0].id;
}
