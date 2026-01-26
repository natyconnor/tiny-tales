type BookletCanvasOptions = {
  topic: string;
  imageDataUrls: Array<string | undefined>;
  segments: string[];
  allCaps?: boolean;
};

const DPI = 300;
const PAGE_WIDTH_IN = 8.5;
const PAGE_HEIGHT_IN = 11;
const PAGE_WIDTH = PAGE_WIDTH_IN * DPI;
const PAGE_HEIGHT = PAGE_HEIGHT_IN * DPI;
const HALF_WIDTH = PAGE_WIDTH / 2;
const HALF_HEIGHT = PAGE_HEIGHT / 2;
const PADDING = 0.2 * DPI;
const IMAGE_MAX_HEIGHT = 3.1 * DPI;
const COVER_IMAGE_MAX_HEIGHT = 2.7 * DPI;
const IMAGE_GAP = 0.12 * DPI;
const TEXT_GAP = 0.1 * DPI;
const TITLE_GAP = 0.12 * DPI;

const ptToPx = (pt: number) => Math.round((pt * DPI) / 72);

const TITLE_FONT_SIZE = ptToPx(26);
const FOOTER_FONT_SIZE = ptToPx(12);

// Dynamic text sizing based on total character count per page
const MAX_TEXT_FONT_PT = 22;
const MIN_TEXT_FONT_PT = 14;
const SHORT_TEXT_THRESHOLD = 30; // Character count for max font size (e.g., "The cat sat.")
const LONG_TEXT_THRESHOLD = 150; // Character count for min font size

const getTextFontSize = (text: string): number => {
  const charCount = text.length;

  if (charCount <= SHORT_TEXT_THRESHOLD) {
    return ptToPx(MAX_TEXT_FONT_PT);
  }

  if (charCount >= LONG_TEXT_THRESHOLD) {
    return ptToPx(MIN_TEXT_FONT_PT);
  }

  // Linear interpolation between thresholds
  const ratio =
    (charCount - SHORT_TEXT_THRESHOLD) /
    (LONG_TEXT_THRESHOLD - SHORT_TEXT_THRESHOLD);
  const fontPt =
    MAX_TEXT_FONT_PT - ratio * (MAX_TEXT_FONT_PT - MIN_TEXT_FONT_PT);
  return ptToPx(fontPt);
};

const getLineHeight = (fontSize: number): number => Math.round(fontSize * 1.35);

const TITLE_FONT = `${TITLE_FONT_SIZE}px "Comic Neue", cursive`;
const FOOTER_FONT = `${FOOTER_FONT_SIZE}px "Lexend", sans-serif`;
const getBodyFont = (fontSize: number) => `${fontSize}px "Lexend", sans-serif`;

const loadImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });

const wrapTextLines = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] => {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const width = ctx.measureText(test).width;
    if (width <= maxWidth || !current) {
      current = test;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
};

const clampLines = (lines: string[], maxLines: number): string[] => {
  if (lines.length <= maxLines) return lines;
  const trimmed = lines.slice(0, Math.max(maxLines, 1));
  const lastIndex = trimmed.length - 1;
  trimmed[lastIndex] = `${trimmed[lastIndex].replace(/\s+$/, "")}…`;
  return trimmed;
};

const getScaledImageDimensions = (
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  const aspectRatio = img.width / img.height;
  let width = maxWidth;
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width, height };
};

const ensureFontsReady = async () => {
  if ("fonts" in document && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font loading failures
    }
  }
};

const drawFoldGuides = (ctx: CanvasRenderingContext2D) => {
  ctx.save();
  ctx.strokeStyle = "rgba(200, 200, 200, 0.6)";
  ctx.setLineDash([12, 10]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, HALF_HEIGHT);
  ctx.lineTo(PAGE_WIDTH, HALF_HEIGHT);
  ctx.moveTo(HALF_WIDTH, 0);
  ctx.lineTo(HALF_WIDTH, PAGE_HEIGHT);
  ctx.stroke();
  ctx.restore();
};

const drawPanelContent = async ({
  ctx,
  imageDataUrl,
  text,
  x,
  y,
  width,
  height,
  pageNumber,
  isBackCover,
}: {
  ctx: CanvasRenderingContext2D;
  imageDataUrl?: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber?: number;
  isBackCover?: boolean;
}) => {
  const contentX = x + PADDING;
  const contentWidth = width - PADDING * 2;
  let currentY = y + PADDING;

  if (pageNumber) {
    ctx.font = FOOTER_FONT;
    ctx.fillStyle = "#9CA3AF";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(String(pageNumber), x + width - PADDING, y + PADDING);
  }

  if (imageDataUrl) {
    try {
      const img = await loadImageFromDataUrl(imageDataUrl);
      const maxImgWidth = contentWidth;
      const maxImgHeight = isBackCover
        ? IMAGE_MAX_HEIGHT - 0.2 * DPI
        : IMAGE_MAX_HEIGHT;
      const { width: imgWidth, height: imgHeight } = getScaledImageDimensions(
        img,
        maxImgWidth,
        maxImgHeight
      );

      const imgX = contentX + (contentWidth - imgWidth) / 2;
      ctx.drawImage(img, imgX, currentY, imgWidth, imgHeight);
      currentY += imgHeight + IMAGE_GAP;
    } catch {
      currentY += IMAGE_GAP;
    }
  }

  if (text) {
    const textFontSize = getTextFontSize(text);
    const lineHeight = getLineHeight(textFontSize);
    ctx.font = getBodyFont(textFontSize);
    ctx.fillStyle = "#1F2937";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const lines = wrapTextLines(ctx, text, contentWidth);
    const remainingHeight = y + height - PADDING - currentY;
    const maxLines = Math.floor(remainingHeight / lineHeight);
    const clipped = clampLines(lines, maxLines);

    clipped.forEach((line, index) => {
      ctx.fillText(line, x + width / 2, currentY + index * lineHeight);
    });

    currentY += clipped.length * lineHeight + TEXT_GAP;
  }

  if (isBackCover) {
    ctx.font = TITLE_FONT;
    ctx.fillStyle = "#7C3AED";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("The End", x + width / 2, currentY);

    ctx.font = FOOTER_FONT;
    ctx.fillStyle = "#9CA3AF";
    ctx.textBaseline = "bottom";
    ctx.fillText(
      "Made with Tiny Tales",
      x + width / 2,
      y + height - PADDING / 1.5
    );
  }
};

const drawCoverContent = async ({
  ctx,
  topic,
  imageDataUrl,
  text,
  x,
  y,
  width,
  height,
}: {
  ctx: CanvasRenderingContext2D;
  topic: string;
  imageDataUrl?: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}) => {
  const contentX = x + PADDING;
  const contentWidth = width - PADDING * 2;
  let currentY = y + PADDING + TITLE_GAP;

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  ctx.font = TITLE_FONT;
  ctx.fillStyle = "#111827";
  const titleLines = clampLines(wrapTextLines(ctx, topic, contentWidth), 2);
  titleLines.forEach((line, index) => {
    ctx.fillText(line, x + width / 2, currentY + index * TITLE_FONT_SIZE);
  });
  currentY += titleLines.length * TITLE_FONT_SIZE + TITLE_GAP;

  if (imageDataUrl) {
    try {
      const img = await loadImageFromDataUrl(imageDataUrl);
      const maxImgWidth = contentWidth;
      const { width: imgWidth, height: imgHeight } = getScaledImageDimensions(
        img,
        maxImgWidth,
        COVER_IMAGE_MAX_HEIGHT
      );
      const imgX = contentX + (contentWidth - imgWidth) / 2;
      ctx.drawImage(img, imgX, currentY, imgWidth, imgHeight);
      currentY += imgHeight + IMAGE_GAP;
    } catch {
      currentY += IMAGE_GAP;
    }
  }

  if (text) {
    const textFontSize = getTextFontSize(text);
    const lineHeight = getLineHeight(textFontSize);
    ctx.font = getBodyFont(textFontSize);
    ctx.fillStyle = "#1F2937";
    const lines = wrapTextLines(ctx, text, contentWidth);
    const remainingHeight = y + height - PADDING - currentY;
    const maxLines = Math.floor(remainingHeight / lineHeight);
    const clipped = clampLines(lines, maxLines);

    clipped.forEach((line, index) => {
      ctx.fillText(line, x + width / 2, currentY + index * lineHeight);
    });
  }
};

const drawPanel = async ({
  ctx,
  x,
  y,
  width,
  height,
  rotate,
  draw,
}: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  width: number;
  height: number;
  rotate?: boolean;
  draw: (params: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => Promise<void>;
}) => {
  if (rotate) {
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(Math.PI);
    await draw({ x: -width / 2, y: -height / 2, width, height });
    ctx.restore();
  } else {
    await draw({ x, y, width, height });
  }
};

export const renderBookletCanvas = async ({
  topic,
  imageDataUrls,
  segments: rawSegments,
  allCaps = false,
}: BookletCanvasOptions): Promise<HTMLCanvasElement> => {
  await ensureFontsReady();
  const segments = allCaps
    ? rawSegments.map((s) => s.toUpperCase())
    : rawSegments;

  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH;
  canvas.height = PAGE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create canvas context");
  }

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

  drawFoldGuides(ctx);

  // Top-left: Panel 2 (inside left)
  await drawPanel({
    ctx,
    x: 0,
    y: 0,
    width: HALF_WIDTH,
    height: HALF_HEIGHT,
    draw: (rect) =>
      drawPanelContent({
        ctx,
        imageDataUrl: imageDataUrls[1],
        text: segments[1] || "",
        pageNumber: 2,
        ...rect,
      }),
  });

  // Top-right: Panel 3 (inside right)
  await drawPanel({
    ctx,
    x: HALF_WIDTH,
    y: 0,
    width: HALF_WIDTH,
    height: HALF_HEIGHT,
    draw: (rect) =>
      drawPanelContent({
        ctx,
        imageDataUrl: imageDataUrls[2],
        text: segments[2] || "",
        pageNumber: 3,
        ...rect,
      }),
  });

  // Bottom-left: Panel 4 (back cover) - rotated for fold
  await drawPanel({
    ctx,
    x: 0,
    y: HALF_HEIGHT,
    width: HALF_WIDTH,
    height: HALF_HEIGHT,
    rotate: true,
    draw: (rect) =>
      drawCoverContent({
        ctx,
        topic,
        imageDataUrl: imageDataUrls[0],
        text: segments[0] || "",
        ...rect,
      }),
  });

  // Bottom-right: Cover (panel 1) - rotated for fold
  await drawPanel({
    ctx,
    x: HALF_WIDTH,
    y: HALF_HEIGHT,
    width: HALF_WIDTH,
    height: HALF_HEIGHT,
    rotate: true,
    draw: (rect) =>
      drawPanelContent({
        ctx,
        imageDataUrl: imageDataUrls[3],
        text: segments[3] || "",
        isBackCover: true,
        ...rect,
      }),
  });

  return canvas;
};

export const renderBookletDataUrl = async (
  options: BookletCanvasOptions
): Promise<string> => {
  const canvas = await renderBookletCanvas(options);
  return canvas.toDataURL("image/png");
};
