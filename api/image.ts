import type { IncomingMessage, ServerResponse } from "http";
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

type PollinationsErrorBody = {
  status?: number;
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
  };
};

function parsePollinationsError(text: string): PollinationsErrorBody | null {
  try {
    const parsed = JSON.parse(text) as PollinationsErrorBody;
    if (parsed && typeof parsed === "object" && parsed.error) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = getQueryParam(req.query.token);
    if (!token) {
      return res.status(400).json({ error: "Missing required token parameter" });
    }

    const payload = parseImageProxyToken(token);
    if (!payload) {
      return res.status(403).json({ error: "Invalid image token" });
    }

    const configuredPollinationsKey = process.env.POLLINATIONS_API_KEY?.trim();
    const upstreamPollinationsKey =
      payload.pollinationsApiKey ?? configuredPollinationsKey;
    if (!upstreamPollinationsKey) {
      return res.status(503).json({
        error:
          "Image generation requires a Pollinations API key. Configure POLLINATIONS_API_KEY or connect Pollinations before generating images.",
      });
    }

    const upstreamResponse = await fetch(
      "https://gen.pollinations.ai/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${upstreamPollinationsKey}`,
        },
        body: JSON.stringify({
          model: payload.model,
          prompt: payload.prompt,
          size: "512x512",
          response_format: "url",
        }),
      }
    );

    if (!upstreamResponse.ok) {
      const errorText = (await upstreamResponse.text()).slice(0, 500);
      const parsed = parsePollinationsError(errorText);
      const upstreamMessage = parsed?.error?.message;

      if (upstreamResponse.status === 402) {
        return res.status(402).json({
          error: upstreamMessage ?? "Insufficient pollen balance. Top up at enter.pollinations.ai.",
          code: "PAYMENT_REQUIRED",
        });
      }

      return res.status(upstreamResponse.status).json({
        error: upstreamMessage ?? `Image generation failed (${upstreamResponse.status}).`,
        code: parsed?.error?.code ?? "UPSTREAM_ERROR",
        detail: errorText,
      });
    }

    const result = (await upstreamResponse.json()) as {
      data?: Array<{ url?: string; b64_json?: string }>;
    };

    const imageUrl = result.data?.[0]?.url;
    const b64 = result.data?.[0]?.b64_json;

    if (!imageUrl && b64) {
      const imageBuffer = Buffer.from(b64, "base64");
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Content-Length", imageBuffer.byteLength.toString());
      res.end(imageBuffer);
      return;
    }

    if (!imageUrl) {
      return res.status(502).json({
        error: "Image generation succeeded but returned no image URL.",
        code: "NO_IMAGE_URL",
      });
    }

    const imageResponse = await fetch(imageUrl, {
      headers: { Authorization: `Bearer ${upstreamPollinationsKey}` },
    });
    if (!imageResponse.ok) {
      return res.status(502).json({
        error: `Failed to download generated image (${imageResponse.status}).`,
        code: "IMAGE_DOWNLOAD_FAILED",
      });
    }

    const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Content-Length", imageBuffer.byteLength.toString());
    res.end(imageBuffer);
  } catch (error) {
    console.error("Image proxy error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
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
