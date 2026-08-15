import {
  AIProviderError,
  type AIProviderConfig,
  type AIProviderKind,
} from "@/lib/ai/types";

const DEFAULT_PROVIDER: AIProviderKind = "gemini";
const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_OPENROUTER_MODEL = "cohere/north-mini-code:free";

/** Read server-only AI env vars. Throws `AIProviderError` when misconfigured. */
export function getAIProviderConfig(): AIProviderConfig {
  const kind = parseProviderKind(process.env.AI_PROVIDER);

  if (kind === "openrouter") {
    const apiKey =
      process.env.OPENROUTER_API_KEY?.trim() ||
      process.env.AI_API_KEY?.trim();
    const model =
      process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;
    const baseUrl =
      process.env.AI_BASE_URL?.trim() || DEFAULT_OPENROUTER_BASE_URL;

    if (!apiKey) {
      throw new AIProviderError("AI provider is not configured.");
    }

    console.log(`[openrouter] model = ${model}`);
    return { kind, apiKey, model, baseUrl };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = resolveGeminiModel(process.env.GEMINI_MODEL?.trim());

  if (!apiKey) {
    throw new AIProviderError("AI provider is not configured.");
  }

  return { kind, apiKey, model };
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

  if (normalized === "openrouter") {
    return "openrouter";
  }

  throw new AIProviderError(
    `Unsupported AI_PROVIDER "${value}". Use "gemini" or "openrouter".`,
  );
}
