import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_AVAILABLE_MODELS,
  DEFAULT_IMAGE_MODELS,
  type ModelOption,
} from "../constants/story";

type UseModelsOptions = {
  model: string;
  imageModel: string;
  setModel: Dispatch<SetStateAction<string>>;
  setImageModel: Dispatch<SetStateAction<string>>;
};

type UseModelsResult = {
  textModels: ModelOption[];
  imageModels: ModelOption[];
};

type ModelsResponse = {
  textModels?: ModelOption[];
  imageModels?: ModelOption[];
};

export function useModels({
  model,
  imageModel,
  setModel,
  setImageModel,
}: UseModelsOptions): UseModelsResult {
  const [textModels, setTextModels] = useState<ModelOption[]>(
    DEFAULT_AVAILABLE_MODELS
  );
  const [imageModels, setImageModels] = useState<ModelOption[]>(
    DEFAULT_IMAGE_MODELS
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/models");
        if (!response.ok) return;
        const payload = (await response.json()) as ModelsResponse;
        if (cancelled) return;

        if (Array.isArray(payload.textModels) && payload.textModels.length > 0) {
          setTextModels(payload.textModels);
        }
        if (
          Array.isArray(payload.imageModels) &&
          payload.imageModels.length > 0
        ) {
          setImageModels(payload.imageModels);
        }
      } catch (error) {
        console.warn("Failed to load model catalog:", error);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const knownTextIds = useMemo(
    () => new Set(textModels.map((item) => item.id)),
    [textModels]
  );
  const knownImageIds = useMemo(
    () => new Set(imageModels.map((item) => item.id)),
    [imageModels]
  );

  useEffect(() => {
    if (knownTextIds.size === 0) return;
    if (!knownTextIds.has(model)) {
      setModel(textModels[0]?.id ?? DEFAULT_AVAILABLE_MODELS[0].id);
    }
  }, [knownTextIds, model, setModel, textModels]);

  useEffect(() => {
    if (knownImageIds.size === 0) return;
    if (!knownImageIds.has(imageModel)) {
      setImageModel(imageModels[0]?.id ?? DEFAULT_IMAGE_MODELS[0].id);
    }
  }, [knownImageIds, imageModel, setImageModel, imageModels]);

  return { textModels, imageModels };
}
