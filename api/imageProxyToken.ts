import { createHmac, timingSafeEqual } from "crypto";

type LegacyImageProxyPayload = {
  version: 1 | 2;
  prompt: string;
  model: string;
};

type ImageProxyPayload = {
  version: 3;
  prompt: string;
  model: string;
};

type ParsedImageProxyPayload = {
  prompt: string;
  model: string;
};

export function createImageProxyToken(prompt: string, model: string): string {
  const payload: ImageProxyPayload = {
    version: 3,
    prompt,
    model,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = createSignature(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function parseImageProxyToken(
  token: string
): ParsedImageProxyPayload | null {
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
    const parsed = JSON.parse(rawJson) as
      | Partial<LegacyImageProxyPayload>
      | Partial<ImageProxyPayload>;

    const prompt =
      typeof parsed.prompt === "string" ? parsed.prompt.trim() : undefined;
    const model =
      typeof parsed.model === "string" ? parsed.model.trim() : undefined;
    if (!prompt || !model) {
      return null;
    }

    // Accept legacy tokens from older shared stories (ignore embedded keys).
    if (parsed.version === 1 || parsed.version === 2 || parsed.version === 3) {
      return { prompt, model };
    }

    return null;
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

  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey) return gatewayKey;

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
