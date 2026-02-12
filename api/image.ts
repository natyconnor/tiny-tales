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

const DEFAULT_WIDTH = "512";
const DEFAULT_HEIGHT = "512";
const DEFAULT_SAFE = "true";
const DEFAULT_SEED = "-1";

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

    const params = new URLSearchParams({
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      model: payload.model,
      safe: DEFAULT_SAFE,
      seed: DEFAULT_SEED,
    });

    const configuredPollinationsKey = process.env.POLLINATIONS_API_KEY?.trim();
    if (configuredPollinationsKey) {
      params.set("key", configuredPollinationsKey);
    }

    const upstreamUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(
      payload.prompt
    )}?${params.toString()}`;

    const upstreamResponse = await fetch(upstreamUrl);
    if (!upstreamResponse.ok) {
      const detail = (await upstreamResponse.text()).slice(0, 500);
      return res.status(upstreamResponse.status).json({
        error: `Image generation failed (${upstreamResponse.status})`,
        detail,
      });
    }

    const contentType =
      upstreamResponse.headers.get("content-type") ?? "image/jpeg";
    const cacheControl =
      upstreamResponse.headers.get("cache-control") ?? "public, max-age=86400";
    const imageBuffer = Buffer.from(await upstreamResponse.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", cacheControl);
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
