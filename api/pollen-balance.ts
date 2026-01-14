import type { IncomingMessage, ServerResponse } from "http";

// Vercel serverless types
interface VercelRequest extends IncomingMessage {
  query: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body: unknown;
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const pollinationsKey = process.env.POLLINATIONS_API_KEY;
  if (!pollinationsKey) {
    return res.status(200).json({
      balance: null,
      error: "POLLINATIONS_API_KEY is not configured",
    });
  }

  try {
    // Call Pollinations API to get pollen balance
    // Endpoint: GET /api/v1/pollen/balance
    // Authentication: API key in Authorization header or as query parameter
    // Try Authorization header first, fallback to query param if needed
    const baseUrl = "https://gen.pollinations.ai";
    let response = await fetch(`${baseUrl}/api/v1/pollen/balance`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${pollinationsKey}`,
        "Content-Type": "application/json",
      },
    });

    // If Authorization header doesn't work, try with query parameter
    if (!response.ok && response.status === 401) {
      response = await fetch(
        `${baseUrl}/api/v1/pollen/balance?key=${encodeURIComponent(pollinationsKey)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Pollinations API error: ${response.status} ${errorText}`
      );
      return res.status(response.status).json({
        balance: null,
        error: `Failed to fetch balance: ${response.statusText}`,
      });
    }

    const data = await response.json();
    return res.status(200).json({
      balance: data.balance ?? data.pollen ?? null,
      data, // Include full response for debugging
    });
  } catch (error) {
    console.error("Error fetching pollen balance:", error);
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      balance: null,
      error: `Failed to fetch pollen balance: ${errorMessage}`,
    });
  }
}

// Node.js serverless config
export const config = {
  maxDuration: 10,
};
