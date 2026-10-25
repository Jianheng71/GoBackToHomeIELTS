import { afterEach, describe, expect, it, vi } from "vitest";
import { getAIModelId } from "./ai";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("AI provider selection", () => {
  it("uses DashScope for mainland China", () => {
    vi.stubEnv("AI_PROVIDER", "auto");
    vi.stubEnv("DASHSCOPE_MODEL", "qwen-mainland");

    const request = new Request("https://example.com", {
      headers: { "x-vercel-ip-country": "CN" },
    });

    expect(getAIModelId(request)).toBe("qwen-mainland");
  });

  it("uses OpenAI outside mainland China", () => {
    vi.stubEnv("AI_PROVIDER", "auto");
    vi.stubEnv("OPENAI_MODEL", "openai-global");
    vi.stubEnv("DASHSCOPE_MODEL", "qwen-mainland");

    const request = new Request("https://example.com", {
      headers: { "cf-ipcountry": "US" },
    });

    expect(getAIModelId(request)).toBe("openai-global");
  });

  it("uses the configured fallback when the country is unavailable", () => {
    vi.stubEnv("AI_PROVIDER", "auto");
    vi.stubEnv("AI_PROVIDER_FALLBACK", "dashscope");
    vi.stubEnv("DASHSCOPE_MODEL", "qwen-fallback");

    expect(getAIModelId(new Request("https://example.com"))).toBe("qwen-fallback");
  });

  it("allows explicitly selecting a provider instead of auto routing", () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("OPENAI_MODEL", "openai-forced");

    const request = new Request("https://example.com", {
      headers: { "x-vercel-ip-country": "CN" },
    });

    expect(getAIModelId(request)).toBe("openai-forced");
  });
});
