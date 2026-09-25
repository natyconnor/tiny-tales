import { useCallback, useEffect, useState } from "react";

export type StoryBudgetState = {
  remainingUsd: number | null;
  totalUsedUsd: number | null;
  storyUsd: number | null;
  textUsd: number | null;
  imageUsd: number | null;
  imageCount: number;
  approxStories: number | null;
  loading: boolean;
  error: string;
  refresh: () => void;
};

type BudgetResponse = {
  remainingUsd?: number | null;
  totalUsedUsd?: number | null;
  approxStories?: number | null;
  estimate?: {
    textUsd?: number;
    imageUsd?: number;
    storyUsd?: number;
    imageCount?: number;
  };
};

export function useBudget(model: string, imageModel: string): StoryBudgetState {
  const [remainingUsd, setRemainingUsd] = useState<number | null>(null);
  const [totalUsedUsd, setTotalUsedUsd] = useState<number | null>(null);
  const [storyUsd, setStoryUsd] = useState<number | null>(null);
  const [textUsd, setTextUsd] = useState<number | null>(null);
  const [imageUsd, setImageUsd] = useState<number | null>(null);
  const [imageCount, setImageCount] = useState(4);
  const [approxStories, setApproxStories] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ model, imageModel });
        const response = await fetch(`/api/budget?${params.toString()}`);
        const payload = (await response.json().catch(() => ({}))) as
          | BudgetResponse
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : "Could not load remaining AI budget"
          );
        }

        const data = payload as BudgetResponse;
        if (cancelled) return;

        setRemainingUsd(
          typeof data.remainingUsd === "number" ? data.remainingUsd : null
        );
        setTotalUsedUsd(
          typeof data.totalUsedUsd === "number" ? data.totalUsedUsd : null
        );
        setStoryUsd(
          typeof data.estimate?.storyUsd === "number"
            ? data.estimate.storyUsd
            : null
        );
        setTextUsd(
          typeof data.estimate?.textUsd === "number"
            ? data.estimate.textUsd
            : null
        );
        setImageUsd(
          typeof data.estimate?.imageUsd === "number"
            ? data.estimate.imageUsd
            : null
        );
        setImageCount(data.estimate?.imageCount ?? 4);
        setApproxStories(
          typeof data.approxStories === "number" ? data.approxStories : null
        );
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load remaining AI budget"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [model, imageModel, refreshKey]);

  return {
    remainingUsd,
    totalUsedUsd,
    storyUsd,
    textUsd,
    imageUsd,
    imageCount,
    approxStories,
    loading,
    error,
    refresh,
  };
}

export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "$—";
  if (value >= 1) {
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (value >= 0.01) {
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })}`;
}

export function formatApproxStories(value: number): string {
  if (!Number.isFinite(value) || value < 1) return "<1";
  if (value >= 100) return `${Math.round(value / 10) * 10}`;
  return `${Math.round(value)}`;
}
