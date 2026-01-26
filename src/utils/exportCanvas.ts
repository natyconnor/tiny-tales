import { splitStoryIntoSegments } from "./storySegments";

type ExportCanvasOptions = {
  story: string;
  imageUrls: string[];
  imageDataUrls: string[];
  topic: string;
  title?: string;
  allCaps?: boolean;
};

const loadImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
};

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

export const renderExportCanvas = async ({
  story,
  imageUrls,
  imageDataUrls,
  topic,
  title,
  allCaps = false,
}: ExportCanvasOptions): Promise<HTMLCanvasElement> => {
  const rawSegments = splitStoryIntoSegments(
    story,
    Math.max(imageUrls.length, 1)
  );
  const segments = allCaps
    ? rawSegments.map((s) => s.toUpperCase())
    : rawSegments;
  const items = imageUrls.map((_, index) => ({
    dataUrl: imageDataUrls[index],
    segment: segments[index] || "",
  }));

  const canvasWidth = 600;
  const padding = 24;
  const gap = 12;
  const columns = items.length === 1 ? 1 : 2;
  const innerWidth = canvasWidth - padding * 2;
  const cardWidth = (innerWidth - gap * (columns - 1)) / columns;
  const imageSize = cardWidth;

  const titleFont = '700 28px "Comic Neue", cursive';
  const subtitleFont = '500 12px "Lexend", sans-serif';
  const textFont = '500 13px "Lexend", sans-serif';
  const lineHeight = 18;
  const textPadX = 12;
  const textPadY = 10;
  const minTextHeight = 44;

  if ("fonts" in document && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font loading failures
    }
  }

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) {
    throw new Error("Unable to create canvas context");
  }

  measureCtx.font = textFont;
  const textLayouts = items.map((item) => {
    const lines = wrapTextLines(
      measureCtx,
      item.segment,
      cardWidth - textPadX * 2
    );
    const height = Math.max(
      minTextHeight,
      lines.length * lineHeight + textPadY * 2
    );
    return { lines, height };
  });

  const rowTextHeights: number[] = [];
  for (let row = 0; row < Math.ceil(items.length / columns); row += 1) {
    const start = row * columns;
    const end = start + columns;
    const rowItems = textLayouts.slice(start, end);
    rowTextHeights.push(
      rowItems.reduce((max, item) => Math.max(max, item.height), minTextHeight)
    );
  }

  const topBarHeight = 6;
  const headerGap = 12;
  const titleHeight = 32;
  const subtitleHeight = 16;
  const gridTop =
    padding + topBarHeight + headerGap + titleHeight + subtitleHeight + 8;

  const gridHeight = rowTextHeights.reduce((total, rowHeight, rowIndex) => {
    const rowCardHeight = imageSize + rowHeight;
    return (
      total + rowCardHeight + (rowIndex < rowTextHeights.length - 1 ? gap : 0)
    );
  }, 0);

  const footerHeight = 16;
  const canvasHeight = gridTop + gridHeight + 16 + footerHeight + padding;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth * 2;
  canvas.height = canvasHeight * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create canvas context");
  }

  const drawRoundedRect = (
    rectCtx: CanvasRenderingContext2D,
    x: number,
    yPos: number,
    width: number,
    height: number,
    radius: number
  ) => {
    const r = Math.min(radius, width / 2, height / 2);
    rectCtx.beginPath();
    rectCtx.moveTo(x + r, yPos);
    rectCtx.lineTo(x + width - r, yPos);
    rectCtx.quadraticCurveTo(x + width, yPos, x + width, yPos + r);
    rectCtx.lineTo(x + width, yPos + height - r);
    rectCtx.quadraticCurveTo(
      x + width,
      yPos + height,
      x + width - r,
      yPos + height
    );
    rectCtx.lineTo(x + r, yPos + height);
    rectCtx.quadraticCurveTo(x, yPos + height, x, yPos + height - r);
    rectCtx.lineTo(x, yPos + r);
    rectCtx.quadraticCurveTo(x, yPos, x + r, yPos);
    rectCtx.closePath();
  };

  const drawRoundedTopRect = (
    rectCtx: CanvasRenderingContext2D,
    x: number,
    yPos: number,
    width: number,
    height: number,
    radius: number
  ) => {
    const r = Math.min(radius, width / 2, height / 2);
    rectCtx.beginPath();
    rectCtx.moveTo(x + r, yPos);
    rectCtx.lineTo(x + width - r, yPos);
    rectCtx.quadraticCurveTo(x + width, yPos, x + width, yPos + r);
    rectCtx.lineTo(x + width, yPos + height);
    rectCtx.lineTo(x, yPos + height);
    rectCtx.lineTo(x, yPos + r);
    rectCtx.quadraticCurveTo(x, yPos, x + r, yPos);
    rectCtx.closePath();
  };

  ctx.scale(2, 2);

  const background = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  background.addColorStop(0, "#FFFBEB");
  background.addColorStop(1, "#FCE7F3");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const barGradient = ctx.createLinearGradient(
    padding,
    0,
    canvasWidth - padding,
    0
  );
  barGradient.addColorStop(0, "#F472B6");
  barGradient.addColorStop(1, "#8B5CF6");
  ctx.fillStyle = barGradient;
  drawRoundedRect(ctx, padding, padding, innerWidth, topBarHeight, 4);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#7C3AED";
  ctx.font = titleFont;

  const displayTitle = title || topic;
  ctx.fillText(displayTitle, canvasWidth / 2, padding + topBarHeight + 6);

  let y = gridTop;

  const images = await Promise.all(
    items.map((item) =>
      item.dataUrl ? loadImageFromDataUrl(item.dataUrl) : Promise.resolve(null)
    )
  );

  for (let row = 0; row < rowTextHeights.length; row += 1) {
    const rowTextHeight = rowTextHeights[row];
    const rowHeight = imageSize + rowTextHeight;

    for (let col = 0; col < columns; col += 1) {
      const index = row * columns + col;
      if (!items[index]) continue;

      const x = padding + col * (cardWidth + gap);
      const layout = textLayouts[index];
      const img = images[index];

      ctx.save();
      drawRoundedRect(ctx, x, y, cardWidth, rowHeight, 12);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#FACC15";
      ctx.stroke();
      ctx.restore();

      ctx.save();
      drawRoundedTopRect(ctx, x, y, cardWidth, imageSize, 12);
      ctx.clip();

      if (img) {
        const scale = Math.min(imageSize / img.width, imageSize / img.height);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const dx = x + (imageSize - drawWidth) / 2;
        const dy = y + (imageSize - drawHeight) / 2;
        ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
      } else {
        ctx.fillStyle = "#FEF3C7";
        ctx.fillRect(x, y, imageSize, imageSize);
      }
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(x, y + imageSize);
      ctx.lineTo(x + cardWidth, y + imageSize);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#FACC15";
      ctx.stroke();

      ctx.font = textFont;
      ctx.fillStyle = "#374151";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      const lines = layout.lines;
      const textHeight = lines.length * lineHeight;
      const textY = y + imageSize + (rowTextHeight - textHeight) / 2;
      lines.forEach((line, lineIndex) => {
        ctx.fillText(line, x + cardWidth / 2, textY + lineIndex * lineHeight);
      });
    }

    y += rowHeight + (row < rowTextHeights.length - 1 ? gap : 0);
  }

  ctx.font = subtitleFont;
  ctx.fillStyle = "#9CA3AF";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Made with Tiny Tales ✨", canvasWidth / 2, y + 16);

  return canvas;
};
