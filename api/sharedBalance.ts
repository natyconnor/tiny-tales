import type { IncomingMessage, ServerResponse } from "http";

interface VercelRequest extends IncomingMessage {
  query: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body: unknown;
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
}

type PollinationsAccountBalanceResponse = {
  balance: number;
};

type PollinationsAccountKeyResponse = {
  pollenBudget?: number | null;
};

const SHARED_BALANCE_COOKIE_NAME = "tiny_tales_show_shared_balance";
const SHARED_BALANCE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SHARED_BALANCE_CACHE_TTL_MS = 60 * 1000;

let sharedBalanceCache: { balance: number; fetchedAt: number } | null = null;

function toBooleanParam(value: string | string[] | undefined): boolean | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

function serializeVisibilityCookie(enabled: boolean): string {
  const secure =
    process.env.NODE_ENV === "production" || !!process.env.VERCEL
      ? "; Secure"
      : "";
  const maxAge = enabled ? SHARED_BALANCE_COOKIE_MAX_AGE_SECONDS : 0;
  const value = enabled ? "true" : "false";
  return `${SHARED_BALANCE_COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const pollinationsApiKey = process.env.POLLINATIONS_API_KEY?.trim();
  if (!pollinationsApiKey) {
    return res.status(503).json({
      error:
        "Shared balance unavailable because POLLINATIONS_API_KEY is missing. Configure a server Pollinations key to enable shared balance, or connect a personal key in the app for per-user generation.",
    });
  }

  const showParam = toBooleanParam(req.query.showSharedBalance);
  if (showParam !== null) {
    res.setHeader("Set-Cookie", serializeVisibilityCookie(showParam));
  }

  const cookieEnabled = req.cookies?.[SHARED_BALANCE_COOKIE_NAME] === "true";
  const sharedBalanceEnabled = showParam ?? cookieEnabled;

  if (!sharedBalanceEnabled) {
    return res.status(404).json({ error: "Not found" });
  }

  const now = Date.now();
  if (sharedBalanceCache && now - sharedBalanceCache.fetchedAt < SHARED_BALANCE_CACHE_TTL_MS) {
    return res.status(200).json({
      balance: sharedBalanceCache.balance,
      cached: true,
      fetchedAt: new Date(sharedBalanceCache.fetchedAt).toISOString(),
    });
  }

  try {
    const headers = {
      Authorization: `Bearer ${pollinationsApiKey}`,
    };

    const upstreamResponse = await fetch("https://gen.pollinations.ai/account/balance", {
      headers,
    });

    if (upstreamResponse.status === 403) {
      // Some keys can generate but do not have account:balance permission.
      // /account/key is often still available and may include pollenBudget.
      try {
        const keyResponse = await fetch("https://gen.pollinations.ai/account/key", {
          headers,
        });
        if (keyResponse.ok) {
          const keyPayload =
            (await keyResponse.json()) as Partial<PollinationsAccountKeyResponse>;
          if (
            typeof keyPayload.pollenBudget === "number" &&
            Number.isFinite(keyPayload.pollenBudget) &&
            keyPayload.pollenBudget >= 0
          ) {
            sharedBalanceCache = {
              balance: keyPayload.pollenBudget,
              fetchedAt: now,
            };
            return res.status(200).json({
              balance: keyPayload.pollenBudget,
              cached: false,
              source: "pollenBudget",
              fetchedAt: new Date(now).toISOString(),
            });
          }
        }
      } catch {
        // Continue to shared cache/error fallback.
      }
    }

    if (!upstreamResponse.ok) {
      const detail = (await upstreamResponse.text()).slice(0, 500);
      if (sharedBalanceCache) {
        return res.status(200).json({
          balance: sharedBalanceCache.balance,
          cached: true,
          stale: true,
          fetchedAt: new Date(sharedBalanceCache.fetchedAt).toISOString(),
          detail,
        });
      }

      if (upstreamResponse.status === 403) {
        return res.status(200).json({
          balance: null,
          cached: false,
          unavailable: true,
          reason:
            "This key does not have account:balance permission. Create/use a key with account balance access to show shared pollen balance.",
        });
      }

      return res.status(502).json({
        error: `Pollinations balance error (${upstreamResponse.status})`,
      });
    }

    const payload =
      (await upstreamResponse.json()) as Partial<PollinationsAccountBalanceResponse>;
    if (typeof payload.balance !== "number" || !Number.isFinite(payload.balance)) {
      return res.status(502).json({
        error: "Balance payload did not include a numeric balance",
      });
    }

    sharedBalanceCache = {
      balance: payload.balance,
      fetchedAt: now,
    };

    return res.status(200).json({
      balance: payload.balance,
      cached: false,
      source: "balance",
      fetchedAt: new Date(now).toISOString(),
    });
  } catch (error) {
    if (sharedBalanceCache) {
      return res.status(200).json({
        balance: sharedBalanceCache.balance,
        cached: true,
        stale: true,
        fetchedAt: new Date(sharedBalanceCache.fetchedAt).toISOString(),
      });
    }

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Could not load shared balance right now",
    });
  }
}
