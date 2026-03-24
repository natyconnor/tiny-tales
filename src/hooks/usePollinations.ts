import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  DEFAULT_AVAILABLE_MODELS,
  DEFAULT_IMAGE_MODELS,
  type ModelOption,
} from "../constants/story";

type PollinationsKeyStatus =
  | "disconnected"
  | "validating"
  | "valid"
  | "invalid";

type ModelCatalogResponse = {
  textModels?: ModelOption[];
  imageModels?: ModelOption[];
};

type PollinationsAccountKeyResponse = {
  valid: boolean;
  type?: "publishable" | "secret";
  name?: string | null;
  expiresAt?: string | null;
  pollenBudget?: number | null;
  permissions?: {
    models?: string[] | null;
    account?: string[] | null;
  };
};

type PollinationsAccountBalanceResponse = {
  balance: number;
};

type SharedBalanceApiResponse = {
  balance?: number;
  reason?: string;
};

type PollinationsUsageDailyRow = {
  date: string;
  model: string | null;
  requests: number;
  cost_usd: number;
};

type PollinationsUsageDailyResponse = {
  usage: PollinationsUsageDailyRow[];
  count: number;
};

type PollinationsUsageRow = {
  model: string | null;
  cost_usd: number;
};

type PollinationsUsageResponse = {
  usage: PollinationsUsageRow[];
  count: number;
};

type PollinationsUsageAggregate = {
  modelId: string;
  requests: number;
  costUsd: number;
};

type ModelCostSource =
  | "exact"
  | "family"
  | "text-category"
  | "image-category"
  | "global";

type ModelCostEstimate = {
  averageCostUsd: number;
  source: ModelCostSource;
  sampleRequests: number;
};

type PollinationsStoryEstimate = {
  approxStoriesRaw: number;
  lowStories: number;
  highStories: number;
  storyCostUsd: number;
  textCost: ModelCostEstimate;
  imageCost: ModelCostEstimate;
};

type UsePollinationsOptions = {
  model: string;
  imageModel: string;
  setModel: Dispatch<SetStateAction<string>>;
  setImageModel: Dispatch<SetStateAction<string>>;
};

type UsePollinationsResult = {
  dropdownTextModels: ModelOption[];
  dropdownImageModels: ModelOption[];
  lockedImageModelIds: string[];
  premiumShowcaseModels: Array<{
    id: string;
    name: string;
    blurb: string;
  }>;
  pollinationsKeyStatus: PollinationsKeyStatus;
  pollinationsKeyError: string;
  pollinationsBalanceText: string;
  pollinationsUsageLoading: boolean;
  pollinationsEstimateSummary: string;
  pollinationsEstimateDetail: string;
  pollinationsUsageError: string;
  sharedBalanceEnabled: boolean;
  sharedBalanceText: string;
  sharedBalanceLoading: boolean;
  sharedBalanceError: string;
  usablePollinationsApiKey: string | undefined;
  refreshPollinationsUsage: () => void;
  connectPollinations: () => void;
};

const POLLINATIONS_KEY_STORAGE_KEY = "tiny-tales-pollinations-api-key";
const SHARED_BALANCE_QUERY_PARAM = "showSharedBalance";
const SHARED_BALANCE_COOKIE_NAME = "tiny_tales_show_shared_balance";

const PREMIUM_TEASER_IMAGE_MODELS: ModelOption[] = [
  {
    id: "nanobanana-2",
    name: "NanoBanana 2",
    description: "Gemini 3.1 Flash Image quality - Paid model",
    paidOnly: true,
  },
  {
    id: "nanobanana-pro",
    name: "NanoBanana Pro",
    description: "Highest Gemini image quality - Paid model",
    paidOnly: true,
  },
  {
    id: "grok-imagine-pro",
    name: "Grok Imagine Pro",
    description: "xAI's premium image quality - Paid model",
    paidOnly: true,
  },
];

const PREMIUM_SHOWCASE_MODELS = [
  {
    id: "nanobanana-2",
    name: "NanoBanana 2",
    blurb: "Gemini 3.1 Flash Image quality",
  },
  {
    id: "nanobanana-pro",
    name: "NanoBanana Pro",
    blurb: "Highest Gemini image quality",
  },
  {
    id: "grok-imagine-pro",
    name: "Grok Imagine Pro",
    blurb: "xAI's premium image quality",
  },
] as const;

function normalizeAccountPermission(permission: string): string {
  return permission
    .trim()
    .toLowerCase()
    .replace(/^account:/, "");
}

function getModelFamilyKey(modelId: string): string {
  const [family] = modelId.split("-");
  return (family || modelId).trim().toLowerCase();
}

function aggregateUsageCosts(
  rows: Array<{
    model: string | null | undefined;
    requests: number;
    costUsd: number;
  }>
): PollinationsUsageAggregate[] {
  const totals = new Map<string, { requests: number; costUsd: number }>();

  for (const row of rows) {
    const modelId = row.model?.trim();
    if (!modelId) continue;
    if (!Number.isFinite(row.requests) || row.requests <= 0) continue;
    if (!Number.isFinite(row.costUsd) || row.costUsd < 0) continue;

    const previous = totals.get(modelId) ?? { requests: 0, costUsd: 0 };
    previous.requests += row.requests;
    previous.costUsd += row.costUsd;
    totals.set(modelId, previous);
  }

  return Array.from(totals, ([modelId, value]) => ({
    modelId,
    requests: value.requests,
    costUsd: value.costUsd,
  }));
}

function sourceUncertainty(source: ModelCostSource): number {
  switch (source) {
    case "exact":
      return 0.2;
    case "family":
      return 0.3;
    case "text-category":
    case "image-category":
      return 0.42;
    case "global":
    default:
      return 0.55;
  }
}

function sumUsage(
  usage: PollinationsUsageAggregate[],
  predicate: (row: PollinationsUsageAggregate) => boolean
): { requests: number; costUsd: number } {
  return usage.reduce(
    (acc, row) => {
      if (!predicate(row)) return acc;
      return {
        requests: acc.requests + row.requests,
        costUsd: acc.costUsd + row.costUsd,
      };
    },
    { requests: 0, costUsd: 0 }
  );
}

function pickModelCostEstimate(
  modelId: string,
  usage: PollinationsUsageAggregate[],
  categoryModelIds: Set<string>,
  categorySource: "text-category" | "image-category"
): ModelCostEstimate | null {
  const exact = usage.find((row) => row.modelId === modelId);
  if (exact && exact.requests > 0) {
    return {
      averageCostUsd: exact.costUsd / exact.requests,
      source: "exact",
      sampleRequests: exact.requests,
    };
  }

  const familyKey = getModelFamilyKey(modelId);
  const familyTotals = sumUsage(
    usage,
    (row) => getModelFamilyKey(row.modelId) === familyKey
  );
  if (familyTotals.requests > 0) {
    return {
      averageCostUsd: familyTotals.costUsd / familyTotals.requests,
      source: "family",
      sampleRequests: familyTotals.requests,
    };
  }

  const categoryTotals = sumUsage(usage, (row) => categoryModelIds.has(row.modelId));
  if (categoryTotals.requests > 0) {
    return {
      averageCostUsd: categoryTotals.costUsd / categoryTotals.requests,
      source: categorySource,
      sampleRequests: categoryTotals.requests,
    };
  }

  const globalTotals = sumUsage(usage, () => true);
  if (globalTotals.requests > 0) {
    return {
      averageCostUsd: globalTotals.costUsd / globalTotals.requests,
      source: "global",
      sampleRequests: globalTotals.requests,
    };
  }

  return null;
}

function roundApproxStoryCount(value: number): number {
  if (value >= 200) return Math.round(value / 10) * 10;
  if (value >= 100) return Math.round(value / 5) * 5;
  return Math.round(value);
}

function formatApproxStoryCount(value: number): string {
  if (!Number.isFinite(value)) return "unknown";
  if (value < 1) return "<1";
  return `${roundApproxStoryCount(value)}`;
}

function formatPollenBalance(balance: number | null): string {
  if (balance === null || !Number.isFinite(balance) || balance < 0) {
    return "";
  }

  if (balance >= 100) {
    return balance.toLocaleString(undefined, {
      maximumFractionDigits: 0,
    });
  }
  if (balance >= 10) {
    return balance.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    });
  }
  return balance.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function findModelName(models: ModelOption[], modelId: string): string {
  const match = models.find((item) => item.id === modelId);
  return match?.name ?? modelId;
}

function loadStoredPollinationsKey(): string | null {
  try {
    const stored = localStorage.getItem(POLLINATIONS_KEY_STORAGE_KEY)?.trim();
    return stored || null;
  } catch {
    console.error("Failed to load Pollinations API key from localStorage");
    return null;
  }
}

function parsePollinationsKeyFromHash(hash: string): string | null {
  if (!hash.startsWith("#")) return null;
  const params = new URLSearchParams(hash.slice(1));
  const key = params.get("api_key")?.trim();
  return key || null;
}

function clearHashFragment(): void {
  if (!window.location.hash) return;
  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, "", cleanUrl);
}

function readBooleanCookie(name: string): boolean | null {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|;\\s*)${escapedName}=([^;]*)`);
  const match = document.cookie.match(pattern);
  if (!match) return null;

  const value = decodeURIComponent(match[1]).trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function writeBooleanCookie(name: string, enabled: boolean): void {
  const maxAge = enabled ? 60 * 60 * 24 * 30 : 0;
  const value = enabled ? "true" : "false";
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function filterModelsForAccess(
  models: ModelOption[],
  keyStatus: PollinationsKeyStatus,
  allowedModelIds: Set<string> | null
): ModelOption[] {
  if (keyStatus !== "valid") {
    return models.filter((item) => !item.paidOnly);
  }

  if (!allowedModelIds) return models;

  const exactMatches = models.filter((item) => allowedModelIds.has(item.id));
  if (exactMatches.length > 0) return exactMatches;

  return models.filter((item) => !item.paidOnly);
}

export function usePollinations({
  model,
  imageModel,
  setModel,
  setImageModel,
}: UsePollinationsOptions): UsePollinationsResult {
  const [availableModels, setAvailableModels] = useState<ModelOption[]>(
    DEFAULT_AVAILABLE_MODELS
  );
  const [availableImageModels, setAvailableImageModels] = useState<
    ModelOption[]
  >(DEFAULT_IMAGE_MODELS);

  const [pollinationsApiKey, setPollinationsApiKey] = useState<string | null>(
    () => loadStoredPollinationsKey()
  );
  const [pollinationsKeyStatus, setPollinationsKeyStatus] =
    useState<PollinationsKeyStatus>("disconnected");
  const [pollinationsKeyDetails, setPollinationsKeyDetails] =
    useState<PollinationsAccountKeyResponse | null>(null);
  const [pollinationsKeyError, setPollinationsKeyError] = useState("");

  const [pollinationsBalance, setPollinationsBalance] = useState<number | null>(
    null
  );
  const [pollinationsUsageAggregates, setPollinationsUsageAggregates] =
    useState<PollinationsUsageAggregate[]>([]);
  const [pollinationsUsageLoading, setPollinationsUsageLoading] =
    useState(false);
  const [pollinationsUsageError, setPollinationsUsageError] = useState("");
  const [pollinationsUsageRefreshKey, setPollinationsUsageRefreshKey] =
    useState(0);
  const [sharedBalance, setSharedBalance] = useState<number | null>(null);
  const [sharedBalanceEnabled, setSharedBalanceEnabled] = useState(false);
  const [sharedBalanceLoading, setSharedBalanceLoading] = useState(false);
  const [sharedBalanceError, setSharedBalanceError] = useState("");
  const [sharedBalanceRefreshKey, setSharedBalanceRefreshKey] = useState(0);

  useEffect(() => {
    const keyFromHash = parsePollinationsKeyFromHash(window.location.hash);
    if (!keyFromHash) return;

    localStorage.setItem(POLLINATIONS_KEY_STORAGE_KEY, keyFromHash);
    setPollinationsApiKey(keyFromHash);
    setPollinationsKeyError("");
    clearHashFragment();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const showSharedBalanceParam = params.get(SHARED_BALANCE_QUERY_PARAM);

    if (showSharedBalanceParam === "true") {
      writeBooleanCookie(SHARED_BALANCE_COOKIE_NAME, true);
      setSharedBalanceEnabled(true);
      return;
    }

    if (showSharedBalanceParam === "false") {
      writeBooleanCookie(SHARED_BALANCE_COOKIE_NAME, false);
      setSharedBalanceEnabled(false);
      return;
    }

    setSharedBalanceEnabled(readBooleanCookie(SHARED_BALANCE_COOKIE_NAME) === true);
  }, []);

  useEffect(() => {
    if (!pollinationsApiKey) {
      setPollinationsKeyStatus("disconnected");
      setPollinationsKeyDetails(null);
      setPollinationsKeyError("");
      return;
    }

    let cancelled = false;

    const validateKey = async () => {
      setPollinationsKeyStatus("validating");
      setPollinationsKeyError("");

      try {
        const response = await fetch("https://gen.pollinations.ai/account/key", {
          headers: {
            Authorization: `Bearer ${pollinationsApiKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Key validation failed (${response.status})`);
        }

        const payload = (await response.json()) as PollinationsAccountKeyResponse;
        if (cancelled) return;

        if (!payload.valid) {
          setPollinationsKeyStatus("invalid");
          setPollinationsKeyDetails(null);
          setPollinationsKeyError(
            "The Pollinations key is invalid or expired. Reconnect to use paid models."
          );
          return;
        }

        setPollinationsKeyStatus("valid");
        setPollinationsKeyDetails(payload);
      } catch (error) {
        if (cancelled) return;
        setPollinationsKeyStatus("invalid");
        setPollinationsKeyDetails(null);
        setPollinationsKeyError(
          error instanceof Error
            ? `Could not validate key: ${error.message}`
            : "Could not validate Pollinations key right now."
        );
      }
    };

    void validateKey();

    return () => {
      cancelled = true;
    };
  }, [pollinationsApiKey]);

  useEffect(() => {
    let isCancelled = false;

    const loadModelCatalog = async () => {
      try {
        const response = await fetch("/api/models");
        if (!response.ok) {
          throw new Error(`Model API returned ${response.status}`);
        }

        const payload = (await response.json()) as ModelCatalogResponse;
        if (isCancelled) return;

        if (Array.isArray(payload.textModels) && payload.textModels.length >= 3) {
          setAvailableModels(payload.textModels);
        }

        if (
          Array.isArray(payload.imageModels) &&
          payload.imageModels.length >= 3
        ) {
          setAvailableImageModels(payload.imageModels);
        }
      } catch (error) {
        console.warn("Falling back to default model lists:", error);
      }
    };

    void loadModelCatalog();

    return () => {
      isCancelled = true;
    };
  }, []);

  const allowedModelIds = useMemo(() => {
    const models = pollinationsKeyDetails?.permissions?.models;
    if (pollinationsKeyStatus !== "valid" || !Array.isArray(models)) {
      return null;
    }
    return new Set(models);
  }, [pollinationsKeyStatus, pollinationsKeyDetails]);

  const accountPermissions = useMemo(() => {
    const account = pollinationsKeyDetails?.permissions?.account;
    if (!Array.isArray(account)) return new Set<string>();
    return new Set(account.map(normalizeAccountPermission));
  }, [pollinationsKeyDetails]);

  const hasAccountWildcardPermission =
    accountPermissions.has("*") || accountPermissions.has("all");
  const hasBalancePermission =
    pollinationsKeyStatus === "valid" &&
    (hasAccountWildcardPermission || accountPermissions.has("balance"));
  const hasUsagePermission =
    pollinationsKeyStatus === "valid" &&
    (hasAccountWildcardPermission || accountPermissions.has("usage"));

  useEffect(() => {
    if (
      pollinationsKeyStatus !== "valid" ||
      !pollinationsApiKey ||
      !pollinationsKeyDetails
    ) {
      setPollinationsBalance(null);
      setPollinationsUsageAggregates([]);
      setPollinationsUsageLoading(false);
      setPollinationsUsageError("");
      return;
    }

    const keyBudget = pollinationsKeyDetails.pollenBudget;
    const initialBalance =
      typeof keyBudget === "number" && Number.isFinite(keyBudget)
        ? keyBudget
        : null;

    if (!hasBalancePermission && !hasUsagePermission) {
      setPollinationsBalance(initialBalance);
      setPollinationsUsageAggregates([]);
      setPollinationsUsageLoading(false);
      setPollinationsUsageError(
        "Reconnect Pollinations with balance + usage permissions to unlock live, model-specific estimate data."
      );
      return;
    }

    let cancelled = false;

    const fetchAccountStats = async () => {
      setPollinationsUsageLoading(true);
      setPollinationsUsageError("");

      let nextBalance: number | null = initialBalance;
      let nextUsage: PollinationsUsageAggregate[] = [];
      const errors: string[] = [];
      const headers = {
        Authorization: `Bearer ${pollinationsApiKey}`,
      };

      if (!hasBalancePermission && nextBalance === null) {
        errors.push(
          "Balance access is missing for this key. Reconnect Pollinations and include balance permission."
        );
      }
      if (!hasUsagePermission) {
        errors.push(
          "Usage access is missing for this key. Reconnect Pollinations and include usage permission."
        );
      }

      if (hasBalancePermission) {
        try {
          const balanceResponse = await fetch(
            "https://gen.pollinations.ai/account/balance",
            { headers }
          );

          if (!balanceResponse.ok) {
            errors.push(`Could not load balance (${balanceResponse.status}).`);
          } else {
            const balancePayload =
              (await balanceResponse.json()) as Partial<PollinationsAccountBalanceResponse>;

            if (
              typeof balancePayload.balance === "number" &&
              Number.isFinite(balancePayload.balance)
            ) {
              nextBalance = balancePayload.balance;
            } else {
              errors.push("Balance response did not include a numeric balance.");
            }
          }
        } catch {
          errors.push("Could not load Pollinations balance right now.");
        }
      }

      if (hasUsagePermission) {
        let usageLoaded = false;
        let usagePermissionDenied = false;

        try {
          const usageResponse = await fetch(
            "https://gen.pollinations.ai/account/usage?limit=1000",
            { headers }
          );

          if (usageResponse.ok) {
            const usagePayload =
              (await usageResponse.json()) as Partial<PollinationsUsageResponse>;
            const usageRows = Array.isArray(usagePayload.usage)
              ? usagePayload.usage
              : [];

            nextUsage = aggregateUsageCosts(
              usageRows.map((row) => ({
                model: row.model,
                requests: 1,
                costUsd: row.cost_usd,
              }))
            );
            usageLoaded = true;
          } else if (usageResponse.status === 403) {
            usagePermissionDenied = true;
            errors.push(
              "Usage access was denied for this key. Reconnect Pollinations and include usage permission."
            );
          }
        } catch {
          // Fall through to /account/usage/daily fallback.
        }

        if ((!usageLoaded || nextUsage.length === 0) && !usagePermissionDenied) {
          try {
            const usageDailyResponse = await fetch(
              "https://gen.pollinations.ai/account/usage/daily",
              { headers }
            );

            if (usageDailyResponse.ok) {
              const usageDailyPayload =
                (await usageDailyResponse.json()) as Partial<PollinationsUsageDailyResponse>;
              const dailyRows = Array.isArray(usageDailyPayload.usage)
                ? usageDailyPayload.usage
                : [];

              nextUsage = aggregateUsageCosts(
                dailyRows.map((row) => ({
                  model: row.model,
                  requests: row.requests,
                  costUsd: row.cost_usd,
                }))
              );
              usageLoaded = true;
            } else if (usageDailyResponse.status === 403) {
              errors.push(
                "Usage access was denied for this key. Reconnect Pollinations and include usage permission."
              );
            } else {
              errors.push(
                `Could not load usage history (${usageDailyResponse.status}).`
              );
            }
          } catch {
            errors.push("Could not load Pollinations usage data right now.");
          }
        }

        if (!usageLoaded && !usagePermissionDenied && errors.length === 0) {
          errors.push("Could not load usage data for story estimate.");
        }
      }

      if (cancelled) return;

      setPollinationsBalance(nextBalance);
      setPollinationsUsageAggregates(nextUsage);
      setPollinationsUsageError(errors.join(" "));
      setPollinationsUsageLoading(false);
    };

    void fetchAccountStats();

    return () => {
      cancelled = true;
    };
  }, [
    pollinationsKeyStatus,
    pollinationsApiKey,
    pollinationsKeyDetails,
    hasBalancePermission,
    hasUsagePermission,
    pollinationsUsageRefreshKey,
  ]);

  useEffect(() => {
    if (
      !sharedBalanceEnabled ||
      pollinationsKeyStatus === "valid" ||
      pollinationsKeyStatus === "validating"
    ) {
      setSharedBalance(null);
      setSharedBalanceLoading(false);
      setSharedBalanceError("");
      return;
    }

    let cancelled = false;

    const loadSharedBalance = async () => {
      setSharedBalanceLoading(true);
      setSharedBalanceError("");

      try {
        const response = await fetch(
          "/api/shared-balance?showSharedBalance=true",
          {
            credentials: "same-origin",
          }
        );

        if (!response.ok) {
          throw new Error(`Shared balance request failed (${response.status})`);
        }

        const payload = (await response.json()) as SharedBalanceApiResponse;
        if (cancelled) return;

        if (
          typeof payload.balance === "number" &&
          Number.isFinite(payload.balance) &&
          payload.balance >= 0
        ) {
          setSharedBalance(payload.balance);
          setSharedBalanceError("");
        } else {
          setSharedBalance(null);
          setSharedBalanceError(
            typeof payload.reason === "string" && payload.reason.trim()
              ? payload.reason
              : "Shared balance unavailable right now."
          );
        }
      } catch (error) {
        if (cancelled) return;
        setSharedBalance(null);
        setSharedBalanceError(
          error instanceof Error
            ? `Could not load shared balance: ${error.message}`
            : "Could not load shared balance right now."
        );
      } finally {
        if (!cancelled) {
          setSharedBalanceLoading(false);
        }
      }
    };

    void loadSharedBalance();

    return () => {
      cancelled = true;
    };
  }, [pollinationsKeyStatus, sharedBalanceEnabled, sharedBalanceRefreshKey]);

  const selectableTextModels = useMemo(
    () =>
      filterModelsForAccess(availableModels, pollinationsKeyStatus, allowedModelIds),
    [availableModels, pollinationsKeyStatus, allowedModelIds]
  );

  const selectableImageModels = useMemo(
    () =>
      filterModelsForAccess(
        availableImageModels,
        pollinationsKeyStatus,
        allowedModelIds
      ),
    [availableImageModels, pollinationsKeyStatus, allowedModelIds]
  );

  const lockedImageTeasers = useMemo(() => {
    if (pollinationsKeyStatus === "valid") return [];
    return PREMIUM_TEASER_IMAGE_MODELS.filter(
      (item) =>
        !selectableImageModels.some((modelItem) => modelItem.id === item.id)
    );
  }, [pollinationsKeyStatus, selectableImageModels]);

  const dropdownTextModels = useMemo(
    () => [...selectableTextModels],
    [selectableTextModels]
  );

  const dropdownImageModels = useMemo(
    () => [...selectableImageModels, ...lockedImageTeasers],
    [selectableImageModels, lockedImageTeasers]
  );

  const lockedImageModelIds = useMemo(
    () => lockedImageTeasers.map((item) => item.id),
    [lockedImageTeasers]
  );

  const knownTextModelIds = useMemo(() => {
    const ids = new Set<string>([model]);
    [...availableModels].forEach((item) => ids.add(item.id));
    return ids;
  }, [availableModels, model]);

  const knownImageModelIds = useMemo(() => {
    const ids = new Set<string>([imageModel]);
    [...availableImageModels, ...PREMIUM_TEASER_IMAGE_MODELS].forEach((item) =>
      ids.add(item.id)
    );
    return ids;
  }, [availableImageModels, imageModel]);

  const selectedTextModelName = useMemo(
    () => findModelName([...dropdownTextModels, ...availableModels], model),
    [dropdownTextModels, availableModels, model]
  );

  const selectedImageModelName = useMemo(
    () =>
      findModelName(
        [
          ...dropdownImageModels,
          ...availableImageModels,
          ...PREMIUM_TEASER_IMAGE_MODELS,
        ],
        imageModel
      ),
    [dropdownImageModels, availableImageModels, imageModel]
  );

  const pollinationsStoryEstimate = useMemo<PollinationsStoryEstimate | null>(() => {
    if (
      pollinationsBalance === null ||
      !Number.isFinite(pollinationsBalance) ||
      pollinationsBalance < 0
    ) {
      return null;
    }

    if (pollinationsUsageAggregates.length === 0) return null;

    const textCost = pickModelCostEstimate(
      model,
      pollinationsUsageAggregates,
      knownTextModelIds,
      "text-category"
    );
    const imageCost = pickModelCostEstimate(
      imageModel,
      pollinationsUsageAggregates,
      knownImageModelIds,
      "image-category"
    );

    if (!textCost || !imageCost) return null;

    const storyCostUsd = textCost.averageCostUsd + imageCost.averageCostUsd * 4;
    if (!Number.isFinite(storyCostUsd) || storyCostUsd <= 0) {
      return null;
    }

    const approxStoriesRaw = pollinationsBalance / storyCostUsd;
    if (!Number.isFinite(approxStoriesRaw) || approxStoriesRaw < 0) {
      return null;
    }

    const sampleRequests = textCost.sampleRequests + imageCost.sampleRequests;
    let uncertainty =
      (sourceUncertainty(textCost.source) +
        sourceUncertainty(imageCost.source)) /
      2;
    if (sampleRequests < 20) uncertainty += 0.1;
    if (sampleRequests < 8) uncertainty += 0.12;
    uncertainty = Math.min(0.8, Math.max(0.2, uncertainty));

    const lowStories = Math.max(
      0,
      Math.floor(approxStoriesRaw * (1 - uncertainty))
    );
    const highStories = Math.max(
      lowStories,
      Math.ceil(approxStoriesRaw * (1 + uncertainty))
    );

    return {
      approxStoriesRaw,
      lowStories,
      highStories,
      storyCostUsd,
      textCost,
      imageCost,
    };
  }, [
    pollinationsBalance,
    pollinationsUsageAggregates,
    model,
    imageModel,
    knownTextModelIds,
    knownImageModelIds,
  ]);

  const pollinationsBalanceText = useMemo(() => {
    return formatPollenBalance(pollinationsBalance);
  }, [pollinationsBalance]);

  const sharedBalanceText = useMemo(
    () => formatPollenBalance(sharedBalance),
    [sharedBalance]
  );

  const pollinationsEstimateSummary = useMemo(() => {
    if (!pollinationsStoryEstimate) return "";

    const approx = formatApproxStoryCount(pollinationsStoryEstimate.approxStoriesRaw);
    return `About ${approx} stories left for ${selectedTextModelName} + ${selectedImageModelName}.`;
  }, [
    pollinationsStoryEstimate,
    selectedTextModelName,
    selectedImageModelName,
  ]);

  const pollinationsEstimateDetail = useMemo(() => {
    if (!pollinationsStoryEstimate) return "";

    const low = pollinationsStoryEstimate.lowStories;
    const high = pollinationsStoryEstimate.highStories;
    const storyCost = pollinationsStoryEstimate.storyCostUsd.toLocaleString(
      undefined,
      {
        maximumFractionDigits: 4,
      }
    );

    const modelSpecificSources = new Set<ModelCostSource>(["exact", "family"]);
    const modelSpecific =
      modelSpecificSources.has(pollinationsStoryEstimate.textCost.source) &&
      modelSpecificSources.has(pollinationsStoryEstimate.imageCost.source);

    const basis = modelSpecific
      ? "Based on your recent usage for these models."
      : "Based on recent usage, with fallback to similar models when model-specific history is sparse.";

    return `${basis} Likely range: ${low}-${high} stories (about $${storyCost} per story). Approximate only.`;
  }, [pollinationsStoryEstimate]);

  useEffect(() => {
    if (selectableTextModels.length === 0) return;
    if (!selectableTextModels.some((item) => item.id === model)) {
      setModel(selectableTextModels[0].id);
    }
  }, [selectableTextModels, model, setModel]);

  useEffect(() => {
    if (selectableImageModels.length === 0) return;
    if (!selectableImageModels.some((item) => item.id === imageModel)) {
      setImageModel(selectableImageModels[0].id);
    }
  }, [selectableImageModels, imageModel, setImageModel]);

  const usablePollinationsApiKey =
    pollinationsKeyStatus === "valid" ? (pollinationsApiKey ?? undefined) : undefined;

  const refreshPollinationsUsage = useCallback(() => {
    if (usablePollinationsApiKey) {
      setPollinationsUsageRefreshKey((prev) => prev + 1);
      return;
    }
    if (sharedBalanceEnabled && pollinationsKeyStatus !== "validating") {
      setSharedBalanceRefreshKey((prev) => prev + 1);
    }
  }, [usablePollinationsApiKey, sharedBalanceEnabled, pollinationsKeyStatus]);

  const connectPollinations = useCallback(() => {
    const redirectUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const params = new URLSearchParams({
      redirect_url: redirectUrl,
      permissions: "balance,usage",
    });

    window.location.assign(
      `https://enter.pollinations.ai/authorize?${params.toString()}`
    );
  }, []);

  return {
    dropdownTextModels,
    dropdownImageModels,
    lockedImageModelIds,
    premiumShowcaseModels: PREMIUM_SHOWCASE_MODELS.map((item) => ({ ...item })),
    pollinationsKeyStatus,
    pollinationsKeyError,
    pollinationsBalanceText,
    pollinationsUsageLoading,
    pollinationsEstimateSummary,
    pollinationsEstimateDetail,
    pollinationsUsageError,
    sharedBalanceEnabled,
    sharedBalanceText,
    sharedBalanceLoading,
    sharedBalanceError,
    usablePollinationsApiKey,
    refreshPollinationsUsage,
    connectPollinations,
  };
}
