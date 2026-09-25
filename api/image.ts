import type { IncomingMessage, ServerResponse } from "http";
import { generateImage } from "ai";
import { parseImageProxyToken } from "./imageProxyToken.js";

interface VercelRequest extends IncomingMessage {
  query: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body: unknown;
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
}

function hasGatewayAuth(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
      process.env.VERCEL_OIDC_TOKEN?.trim()
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!hasGatewayAuth()) {
      return res.status(503).json({
        error:
          "Image generation requires AI Gateway. Set AI_GATEWAY_API_KEY or use vercel env pull.",
        code: "GATEWAY_NOT_CONFIGURED",
      });
    }

    const token = getQueryParam(req.query.token);
    if (!token) {
      return res.status(400).json({ error: "Missing required token parameter" });
    }

    const payload = parseImageProxyToken(token);
    if (!payload) {
      return res.status(403).json({ error: "Invalid image token" });
    }

    const result = await generateImage({
      model: payload.model,
      prompt: payload.prompt,
      aspectRatio: "1:1",
    });

    const image = result.images[0];
    if (!image) {
      return res.status(502).json({
        error: "Image generation succeeded but returned no image.",
        code: "NO_IMAGE",
      });
    }

    const mediaType =
      "mediaType" in image && typeof image.mediaType === "string"
        ? image.mediaType
        : "image/png";

    let imageBuffer: Buffer;
    if ("uint8Array" in image && image.uint8Array) {
      imageBuffer = Buffer.from(image.uint8Array);
    } else if ("base64" in image && typeof image.base64 === "string") {
      imageBuffer = Buffer.from(image.base64, "base64");
    } else {
      return res.status(502).json({
        error: "Image generation returned an unsupported image format.",
        code: "UNSUPPORTED_IMAGE",
      });
    }

    res.setHeader("Content-Type", mediaType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Content-Length", imageBuffer.byteLength.toString());
    res.end(imageBuffer);
  } catch (error) {
    console.error("Image proxy error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const lower = message.toLowerCase();

    if (
      lower.includes("credit") ||
      lower.includes("payment") ||
      lower.includes("402") ||
      lower.includes("insufficient")
    ) {
      return res.status(402).json({
        error:
          "AI credits are exhausted. Top up AI Gateway credits in your Vercel dashboard.",
        code: "PAYMENT_REQUIRED",
      });
    }

    return res.status(500).json({ error: `Image proxy failed: ${message}` });
  }
}

function getQueryParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === "string" ? value : undefined;
}

export const config = {
  maxDuration: 60,
};
