import { createHmac, timingSafeEqual } from "crypto";

type ImageProxyPayload = {
  version: 1;
  prompt: string;
  model: string;
};

export function createImageProxyToken(prompt: string, model: string): string {
  const payload: ImageProxyPayload = {
    version: 1,
    prompt,
    model,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = createSignature(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function parseImageProxyToken(token: string): ImageProxyPayload | null {
  const separatorIndex = token.indexOf(".");
  if (separatorIndex <= 0 || separatorIndex >= token.length - 1) {
    return null;
  }

  const encodedPayload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expectedSignature = createSignature(encodedPayload);

  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  try {
    const rawJson = decodeBase64Url(encodedPayload).toString("utf8");
    const parsed = JSON.parse(rawJson) as Partial<ImageProxyPayload>;

    if (
      parsed.version !== 1 ||
      typeof parsed.prompt !== "string" ||
      !parsed.prompt.trim() ||
      typeof parsed.model !== "string" ||
      !parsed.model.trim()
    ) {
      return null;
    }

    return {
      version: 1,
      prompt: parsed.prompt,
      model: parsed.model,
    };
  } catch {
    return null;
  }
}

function createSignature(encodedPayload: string): string {
  return createHmac("sha256", getSigningSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function getSigningSecret(): string {
  const explicitSecret = process.env.IMAGE_PROXY_SIGNING_SECRET?.trim();
  if (explicitSecret) return explicitSecret;

  const pollinationsKey = process.env.POLLINATIONS_API_KEY?.trim();
  if (pollinationsKey) return pollinationsKey;

  // Local/dev fallback when no API key is configured.
  return "tiny-tales-image-proxy-dev-secret";
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}
