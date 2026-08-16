import {
  AIProviderError,
  type AIProviderConfig,
  type AIProviderKind,
} from "@/lib/ai/types";

const DEFAULT_PROVIDER: AIProviderKind = "gemini";
const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
const DEFAULT_CEREBRAS_MODEL = "gpt-oss-120b";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";
const DEFAULT_HF_MODEL = "Qwen/Qwen3-32B";
const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/** Read server-only AI env vars. Throws `AIProviderError` when misconfigured. */
export function getAIProviderConfig(): AIProviderConfig {
  const kind = parseProviderKind(process.env.AI_PROVIDER);

  if (kind === "openrouter") {
    const config = getOpenRouterFallbackConfig();
    if (!config) {
      throw new AIProviderError(
        "AI provider is not configured.",
        undefined,
        "config",
        undefined,
        "openrouter",
      );
    }
    console.log(
      config.model
        ? `[openrouter] preferred model = ${config.model}`
        : "[openrouter] model = (dynamic free catalog)",
    );
    return config;
  }

  if (kind === "cerebras") {
    const config = getCerebrasFallbackConfig();
    if (!config) {
      throw new AIProviderError(
        "Cerebras is not configured.",
        undefined,
        "config",
        undefined,
        "cerebras",
      );
    }
    return config;
  }

  if (kind === "groq") {
    const config = getGroqFallbackConfig();
    if (!config) {
      throw new AIProviderError(
        "Groq is not configured.",
        undefined,
        "config",
        undefined,
        "groq",
      );
    }
    return config;
  }

  if (kind === "huggingface") {
    const config = getHuggingFaceFallbackConfig();
    if (!config) {
      throw new AIProviderError(
        "Hugging Face is not configured.",
        undefined,
        "config",
        undefined,
        "huggingface",
      );
    }
    return config;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = resolveGeminiModel(process.env.GEMINI_MODEL?.trim());

  if (!apiKey) {
    throw new AIProviderError(
      "AI provider is not configured.",
      undefined,
      "config",
      undefined,
      "gemini",
    );
  }

  return { kind, apiKey, model };
}

export function getCerebrasFallbackConfig(): AIProviderConfig | null {
  const apiKey = process.env.CEREBRAS_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const model = process.env.CEREBRAS_MODEL?.trim() || DEFAULT_CEREBRAS_MODEL;
  return { kind: "cerebras", apiKey, model };
}

export function getGroqFallbackConfig(): AIProviderConfig | null {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const model = process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
  return { kind: "groq", apiKey, model };
}

export function getHuggingFaceFallbackConfig(): AIProviderConfig | null {
  const apiKey = process.env.HF_TOKEN?.trim();

  if (!apiKey) {
    return null;
  }

  const model = process.env.HF_MODEL?.trim() || DEFAULT_HF_MODEL;
  return { kind: "huggingface", apiKey, model };
}

/**
 * Config for the automatic OpenRouter failover. Returns `null` when
 * `OPENROUTER_API_KEY` is unset so Gemini-only setups keep working.
 */
export function getOpenRouterFallbackConfig(): AIProviderConfig | null {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENROUTER_MODEL?.trim() || undefined;
  const baseUrl = process.env.AI_BASE_URL?.trim() || DEFAULT_OPENROUTER_BASE_URL;

  return { kind: "openrouter", apiKey, model, baseUrl };
}

function resolveGeminiModel(value: string | undefined): string {
  const model = value || DEFAULT_GEMINI_MODEL;

  if (model.includes("/")) {
    console.warn(
      `[gemini] invalid model "${model}" (looks like an OpenRouter id); falling back to ${DEFAULT_GEMINI_MODEL}`,
    );
    return DEFAULT_GEMINI_MODEL;
  }

  return model;
}

function parseProviderKind(value: string | undefined): AIProviderKind {
  const normalized = value?.trim().toLowerCase();

  if (!normalized || normalized === DEFAULT_PROVIDER) {
    return DEFAULT_PROVIDER;
  }

  if (
    normalized === "openrouter" ||
    normalized === "cerebras" ||
    normalized === "groq" ||
    normalized === "huggingface"
  ) {
    return normalized;
  }

  throw new AIProviderError(
    `Unsupported AI_PROVIDER "${value}". Use "gemini", "cerebras", "groq", "huggingface", or "openrouter".`,
    undefined,
    "config",
  );
}
