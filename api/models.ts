import type { IncomingMessage, ServerResponse } from "http";
import { getCuratedModelCatalog } from "./pollinationsCatalog.js";

interface VercelRequest extends IncomingMessage {
  query: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body: unknown;
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (_req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const catalog = await getCuratedModelCatalog();
    return res.status(200).json({
      ...catalog,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to build curated model catalog:", error);
    return res.status(500).json({
      error: "Failed to load model catalog",
    });
  }
}
