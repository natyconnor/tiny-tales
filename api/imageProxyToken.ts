import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";

type LegacyImageProxyPayload = {
  version: 1;
  prompt: string;
  model: string;
};

type ImageProxyPayload = {
  version: 2;
  prompt: string;
  model: string;
  keySource: "server" | "user";
  encryptedApiKey?: string;
};

type ParsedImageProxyPayload = {
  prompt: string;
  model: string;
  keySource: "server" | "user";
  pollinationsApiKey?: string;
};

export function createImageProxyToken(
  prompt: string,
  model: string,
  pollinationsApiKey?: string
): string {
  const payload: ImageProxyPayload = {
    version: 2,
    prompt,
    model,
    keySource: pollinationsApiKey ? "user" : "server",
    encryptedApiKey: pollinationsApiKey
      ? encryptApiKey(pollinationsApiKey)
      : undefined,
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

    if (parsed.version === 1) {
      return {
        prompt,
        model,
        keySource: "server",
      };
    }

    if (parsed.version !== 2) {
      return null;
    }

    if (parsed.keySource !== "server" && parsed.keySource !== "user") {
      return null;
    }

    if (parsed.keySource === "server") {
      return {
        prompt,
        model,
        keySource: "server",
      };
    }

    if (typeof parsed.encryptedApiKey !== "string" || !parsed.encryptedApiKey) {
      return null;
    }

    const decryptedApiKey = decryptApiKey(parsed.encryptedApiKey);
    if (!decryptedApiKey) {
      return null;
    }

    return {
      prompt,
      model,
      keySource: "user",
      pollinationsApiKey: decryptedApiKey,
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

function encryptApiKey(apiKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString("base64url");
}

function decryptApiKey(value: string): string | null {
  try {
    const payload = Buffer.from(value, "base64url");
    if (payload.length <= 28) return null;

    const iv = payload.subarray(0, 12);
    const authTag = payload.subarray(12, 28);
    const ciphertext = payload.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    const trimmed = decrypted.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

function getEncryptionKey(): Buffer {
  return createHash("sha256").update(getSigningSecret()).digest();
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
