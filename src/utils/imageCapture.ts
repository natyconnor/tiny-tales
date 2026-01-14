export const captureImageToDataUrl = (
  img: HTMLImageElement
): string | null => {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch (err) {
    console.warn("Could not capture image for export:", err);
    return null;
  }
};

export const captureLoadedImagesFromDom = (
  currentDataUrls: string[]
): { next: string[]; changed: boolean } => {
  const images = Array.from(
    document.querySelectorAll<HTMLImageElement>("[data-story-image]")
  );

  if (images.length === 0) {
    return { next: currentDataUrls, changed: false };
  }

  const updated = [...currentDataUrls];
  let changed = false;

  images.forEach((img) => {
    const index = Number(img.dataset.index);
    if (Number.isNaN(index)) return;
    if (!img.complete || img.naturalWidth === 0) return;
    if (updated[index]) return;

    const dataUrl = captureImageToDataUrl(img);
    if (dataUrl) {
      updated[index] = dataUrl;
      changed = true;
    }
  });

  return { next: changed ? updated : currentDataUrls, changed };
};
