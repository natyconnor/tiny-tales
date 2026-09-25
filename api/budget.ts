import type { IncomingMessage, ServerResponse } from "http";
import { getStoryBudget, hasGatewayAuth } from "./storyBudget.js";

interface VercelRequest extends IncomingMessage {
  query: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body: unknown;
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
}

function getQueryParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!hasGatewayAuth()) {
    return res.status(503).json({
      error:
        "AI Gateway is not configured. Set AI_GATEWAY_API_KEY or use vercel env pull.",
      code: "GATEWAY_NOT_CONFIGURED",
    });
  }

  try {
    const budget = await getStoryBudget(
      getQueryParam(req.query.model),
      getQueryParam(req.query.imageModel)
    );
    return res.status(200).json(budget);
  } catch (error) {
    console.error("Failed to load story budget:", error);
    return res.status(500).json({
      error: "Failed to load remaining AI budget",
    });
  }
}
