import { createOpenAI } from "@ai-sdk/openai";

type AIProviderName = "openai" | "dashscope";

function getProviderName(request?: Request): AIProviderName {
  const configured = process.env.AI_PROVIDER?.trim().toLowerCase() || "auto";
  if (configured === "openai" || configured === "dashscope") {
    return configured;
  }
  if (configured !== "auto") {
    throw new Error(`Unsupported AI_PROVIDER: ${configured}`);
  }

  const country =
    request?.headers.get("x-vercel-ip-country")?.trim().toUpperCase() ||
    request?.headers.get("cf-ipcountry")?.trim().toUpperCase();
  if (country === "CN") return "dashscope";
  if (country && /^[A-Z]{2}$/.test(country) && country !== "XX") return "openai";

  const fallback = process.env.AI_PROVIDER_FALLBACK?.trim().toLowerCase() || "openai";
  if (fallback !== "openai" && fallback !== "dashscope") {
    throw new Error(`Unsupported AI_PROVIDER_FALLBACK: ${fallback}`);
  }
  return fallback;
}

function getAPIKey(provider: AIProviderName): string | undefined {
  const key =
    provider === "dashscope"
      ? process.env.DASHSCOPE_API_KEY
      : process.env.OPENAI_API_KEY;
  const trimmed = key?.trim();
  return trimmed && !trimmed.startsWith("sk-your") ? trimmed : undefined;
}

export function hasAIKey(request?: Request): boolean {
  return Boolean(getAPIKey(getProviderName(request)));
}

export function getAIProvider(request?: Request) {
  const providerName = getProviderName(request);
  const apiKey = getAPIKey(providerName);
  if (!apiKey) {
    throw new Error(`${providerName === "dashscope" ? "DASHSCOPE" : "OPENAI"}_API_KEY is not configured`);
  }
  return createOpenAI({
    apiKey,
    baseURL:
      providerName === "dashscope"
        ? process.env.DASHSCOPE_BASE_URL?.trim() ||
          "https://dashscope.aliyuncs.com/compatible-mode/v1"
        : process.env.OPENAI_BASE_URL?.trim() || undefined,
  });
}

export function getAIModelId(request?: Request): string {
  const provider = getProviderName(request);
  if (provider === "dashscope") {
    return process.env.DASHSCOPE_MODEL?.trim() || "qwen3.7-plus";
  }
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

/** Runs `fn` up to `attempts` times (default 2 = one retry). */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  attempts = 2,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("request failed");
}
